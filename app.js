const WESTERN_DECIMAL_PATTERN = /^(?:\d+(?:\.\d*)?|\.\d+)$/;

const moneyFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const STORAGE_KEY = 'uae-gold-calculator-state-v1';
const DEFAULT_STATE = Object.freeze({
  goldPrice: '',
  makingCharge: '',
  purity: '21',
  weight: '',
});
const ALLOWED_PURITIES = new Set(['18', '21', '22', '24']);

export function parseNonNegativeDecimal(value) {
  const normalized = String(value ?? '').trim();

  if (!normalized || !WESTERN_DECIMAL_PATTERN.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function calculateQuote({ goldPrice, makingCharge, weight }) {
  const parsedGoldPrice = parseNonNegativeDecimal(goldPrice);
  const parsedMakingCharge = parseNonNegativeDecimal(makingCharge);
  const parsedWeight = parseNonNegativeDecimal(weight);

  if (parsedGoldPrice === null || parsedMakingCharge === null || parsedWeight === null) {
    return null;
  }

  const goldCost = parsedGoldPrice * parsedWeight;
  const makingCharges = parsedMakingCharge * parsedWeight;
  const subtotal = goldCost + makingCharges;
  const vat = subtotal * 0.05;
  const totalWithVat = subtotal + vat;
  const values = [goldCost, makingCharges, subtotal, vat, totalWithVat];

  if (!values.every(Number.isFinite)) {
    return null;
  }

  return { goldCost, makingCharges, subtotal, vat, totalWithVat };
}

export function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return `${moneyFormatter.format(value)} د.إ`;
}

function cleanNumericStateValue(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' || parseNonNegativeDecimal(text) !== null ? text : '';
}

function sanitizeState(value) {
  const candidate = value && typeof value === 'object' ? value : {};
  return {
    goldPrice: cleanNumericStateValue(candidate.goldPrice),
    makingCharge: cleanNumericStateValue(candidate.makingCharge),
    purity: ALLOWED_PURITIES.has(String(candidate.purity)) ? String(candidate.purity) : '21',
    weight: cleanNumericStateValue(candidate.weight),
  };
}

export function loadSavedState(storage) {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    return saved ? sanitizeState(JSON.parse(saved)) : { ...DEFAULT_STATE };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(storage, state) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(sanitizeState(state)));
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function clearSavedState(storage) {
  try {
    storage?.removeItem(STORAGE_KEY);
    return Boolean(storage);
  } catch {
    return false;
  }
}

export function initializeCalculator(documentRoot, storage) {
  const inputs = {
    goldPrice: documentRoot.getElementById('gold-price'),
    makingCharge: documentRoot.getElementById('making-charge'),
    weight: documentRoot.getElementById('weight'),
  };
  const outputs = {
    goldCost: documentRoot.getElementById('gold-cost'),
    makingCharges: documentRoot.getElementById('making-total'),
    vat: documentRoot.getElementById('vat'),
    subtotal: documentRoot.getElementById('subtotal'),
    totalWithVat: documentRoot.getElementById('total'),
  };
  const resetButton = documentRoot.getElementById('reset');
  const purityButtons = [...documentRoot.querySelectorAll('[data-purity]')];
  let state = loadSavedState(storage);

  function selectPurity(purity) {
    state.purity = ALLOWED_PURITIES.has(purity) ? purity : '21';
    for (const button of purityButtons) {
      const selected = button.dataset.purity === state.purity;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }

  function render() {
    const quote = calculateQuote(state);
    for (const [name, element] of Object.entries(outputs)) {
      element.textContent = formatMoney(quote?.[name] ?? null);
    }
  }

  function persistAndRender() {
    saveState(storage, state);
    render();
  }

  for (const [name, input] of Object.entries(inputs)) {
    input.value = state[name];
    input.addEventListener('input', () => {
      state[name] = input.value.trim();
      persistAndRender();
    });
  }

  for (const button of purityButtons) {
    button.addEventListener('click', () => {
      selectPurity(button.dataset.purity);
      persistAndRender();
    });
  }

  resetButton.addEventListener('click', () => {
    state = { ...DEFAULT_STATE };
    for (const input of Object.values(inputs)) input.value = '';
    selectPurity('21');
    clearSavedState(storage);
    render();
  });

  selectPurity(state.purity);
  render();
}

export function startCalculator(documentRoot, windowObject, navigatorObject) {
  let storage;
  try {
    storage = windowObject.localStorage;
  } catch {
    storage = undefined;
  }

  initializeCalculator(documentRoot, storage);

  if ('serviceWorker' in navigatorObject && windowObject.isSecureContext) {
    navigatorObject.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

if (typeof document !== 'undefined') {
  const start = () => {
    startCalculator(document, window, navigator);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
