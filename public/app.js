// TypeSafe JEV Color Guesser - Fast, Clean, and Protected by Closed Beta Gate

const inputEl = document.getElementById('noun-input');
const inputContainer = document.querySelector('.input-container');
const barEl = document.getElementById('palette-bar');
const colorCountSelect = document.getElementById('color-count-select');
const copyPaletteBtn = document.getElementById('copy-palette-btn');
const toastEl = document.getElementById('toast');

// Beta Gate Elements
const betaGateModal = document.getElementById('beta-gate-modal');
const betaGateForm = document.getElementById('beta-gate-form');
const betaEmailInput = document.getElementById('beta-email');
const betaCodeInput = document.getElementById('beta-code');
const betaSubmitBtn = document.getElementById('beta-submit-btn');
const betaErrorBox = document.getElementById('beta-error');
const betaBadge = document.getElementById('beta-badge');
const betaUserEmailSpan = document.getElementById('beta-user-email');
const logoutBtn = document.getElementById('logout-btn');

let currentAbortController = null;
let typingTimer = null;
let toastTimer = null;
const DEBOUNCE_DELAY_MS = 300; // 0.3s pause after typing stops

// In-memory client cache: noun -> raw proportions array
const clientCache = new Map();
const activeSegments = new Map(); // colorKey -> DOM element

let currentRawProportions = [];
let selectedCountLimit = 'all';
let sessionToken = localStorage.getItem('beta_token') || null;

/**
 * Display a clean, minimal toast notification
 */
function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 1400);
}

/**
 * Closed beta gate disabled: keep modal hidden
 */
function showBetaGate(errorMessage = null) {
  if (betaGateModal) {
    betaGateModal.classList.add('hidden');
    betaGateModal.style.display = 'none';
  }
  if (betaBadge) betaBadge.style.display = 'none';
}

function hideBetaGate(email) {
  if (betaGateModal) {
    betaGateModal.classList.add('hidden');
    betaGateModal.style.display = 'none';
  }
}

/**
 * Filter and re-normalize proportions according to the user-selected count
 */
function getDisplayProportions(proportions, limit) {
  if (!proportions || proportions.length === 0) return [];
  if (limit === 'all') return proportions;

  const count = parseInt(limit, 10);
  if (isNaN(count) || count <= 0) return proportions;

  const sliced = proportions.slice(0, count);
  const sum = sliced.reduce((acc, item) => acc + item.probability, 0);

  return sliced.map(item => ({
    ...item,
    proportion: sum > 0 ? item.probability / sum : 0,
  }));
}

/**
 * Animate the color bar segments smoothly
 */
function updatePaletteBar(proportions) {
  const displayProportions = getDisplayProportions(proportions, selectedCountLimit);

  if (!displayProportions || displayProportions.length === 0) {
    for (const [colorKey, el] of activeSegments.entries()) {
      el.style.width = '0%';
      el.style.opacity = '0';
      setTimeout(() => {
        if (el.parentNode && el.style.width === '0%') {
          el.remove();
          activeSegments.delete(colorKey);
        }
      }, 400);
    }
    return;
  }

  // Calculate target positions
  let cumulativeLeft = 0;
  const targetMap = new Map();

  for (const item of displayProportions) {
    const widthPercent = item.proportion * 100;
    targetMap.set(item.color, {
      left: cumulativeLeft,
      width: widthPercent,
      hex: item.hex,
      name: item.name,
      probability: item.probability,
    });
    cumulativeLeft += widthPercent;
  }

  // Update existing segments
  for (const [colorKey, el] of activeSegments.entries()) {
    if (targetMap.has(colorKey)) {
      const target = targetMap.get(colorKey);
      el.style.left = `${target.left}%`;
      el.style.width = `${target.width}%`;
      el.style.opacity = '1';
      el.setAttribute('title', `${target.name}: ${(target.probability * 100).toFixed(1)}% (click to copy hex)`);
      el.dataset.hex = target.hex;
      el.dataset.name = target.name;
    } else {
      el.style.width = '0%';
      el.style.opacity = '0';
      setTimeout(() => {
        if (el.parentNode && !targetMap.has(colorKey)) {
          el.remove();
          activeSegments.delete(colorKey);
        }
      }, 400);
    }
  }

  // Insert entering segments
  for (const [colorKey, target] of targetMap.entries()) {
    if (!activeSegments.has(colorKey)) {
      const el = document.createElement('div');
      el.className = 'color-segment';
      el.style.backgroundColor = target.hex;
      el.style.left = `${target.left}%`;
      el.style.width = '0%';
      el.style.opacity = '1';
      el.setAttribute('title', `${target.name}: ${(target.probability * 100).toFixed(1)}% (click to copy hex)`);
      el.dataset.hex = target.hex;
      el.dataset.name = target.name;

      el.addEventListener('click', () => {
        const hex = el.dataset.hex;
        const name = el.dataset.name;
        if (hex) {
          navigator.clipboard.writeText(hex).then(() => {
            showToast(`Copied ${hex} (${name})`);
          }).catch(() => {
            showToast(`Copied ${hex}`);
          });
        }
      });

      barEl.appendChild(el);
      activeSegments.set(colorKey, el);

      void el.offsetWidth;
      el.style.width = `${target.width}%`;
    }
  }
}

/**
 * Fetch color probabilities from backend (Protected with Session Token)
 */
async function fetchColors(noun) {
  const trimmed = noun.trim().toLowerCase();
  if (!trimmed) {
    currentRawProportions = [];
    updatePaletteBar([]);
    return;
  }

  if (clientCache.has(trimmed)) {
    currentRawProportions = clientCache.get(trimmed);
    updatePaletteBar(currentRawProportions);
    return;
  }

  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();

  inputContainer.classList.add('loading');

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }

    const res = await fetch('/api/guess', {
      method: 'POST',
      headers,
      body: JSON.stringify({ noun: trimmed }),
      signal: currentAbortController.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    if (data.proportions) {
      currentRawProportions = data.proportions;
      clientCache.set(trimmed, data.proportions);
      updatePaletteBar(currentRawProportions);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error fetching color predictions:', err);
    }
  } finally {
    inputContainer.classList.remove('loading');
  }
}

// User typing with 0.3s pause debounce
inputEl.addEventListener('input', (e) => {
  const value = e.target.value;
  const trimmed = value.trim().toLowerCase();

  clearTimeout(typingTimer);

  if (clientCache.has(trimmed)) {
    currentRawProportions = clientCache.get(trimmed);
    updatePaletteBar(currentRawProportions);
    return;
  }

  typingTimer = setTimeout(() => {
    fetchColors(value);
  }, DEBOUNCE_DELAY_MS);
});

// Top-left color count selector
colorCountSelect.addEventListener('change', (e) => {
  selectedCountLimit = e.target.value;
  if (currentRawProportions && currentRawProportions.length > 0) {
    updatePaletteBar(currentRawProportions);
  }
});

// Copy CSS Palette button
copyPaletteBtn.addEventListener('click', () => {
  const activeProportions = getDisplayProportions(currentRawProportions, selectedCountLimit);
  if (!activeProportions || activeProportions.length === 0) {
    showToast('No active palette to copy');
    return;
  }

  let css = '/* CSS HEX */\n';
  for (const item of activeProportions) {
    const varName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    css += `--${varName}: ${item.hex};\n`;
  }

  navigator.clipboard.writeText(css).then(() => {
    const originalText = copyPaletteBtn.textContent;
    copyPaletteBtn.textContent = 'Copied!';
    showToast('CSS palette copied to clipboard');
    setTimeout(() => {
      copyPaletteBtn.textContent = originalText;
    }, 1500);
  }).catch(() => {
    showToast('Failed to copy to clipboard');
  });
});

// Closed Beta Form Submission
betaGateForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  betaErrorBox.style.display = 'none';

  const email = betaEmailInput.value.trim();
  const code = betaCodeInput.value.trim();

  // Validate Gmail client-side first
  if (!/^[a-zA-Z0-9._%+-]+@(gmail|googlemail)\.com$/i.test(email)) {
    betaErrorBox.textContent = 'Please enter a valid Gmail address (@gmail.com).';
    betaErrorBox.style.display = 'block';
    return;
  }

  if (!/^[0-9]{6}$/.test(code)) {
    betaErrorBox.textContent = 'Access code must be exactly 6 digits.';
    betaErrorBox.style.display = 'block';
    return;
  }

  betaSubmitBtn.disabled = true;
  betaSubmitBtn.textContent = 'Verifying...';

  try {
    const res = await fetch('/api/verify-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, accessCode: code }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Verification failed.');
    }

    sessionToken = data.token;
    localStorage.setItem('beta_token', data.token);
    hideBetaGate(data.email);
    showToast('Access granted! Welcome to the closed beta.');

    // Trigger initial prediction
    if (inputEl.value) {
      fetchColors(inputEl.value);
    }
  } catch (err) {
    betaErrorBox.textContent = err.message || 'Verification failed. Please try again.';
    betaErrorBox.style.display = 'block';
  } finally {
    betaSubmitBtn.disabled = false;
    betaSubmitBtn.textContent = 'Unlock Access';
  }
});

// Logout / Reset Beta Session
logoutBtn.addEventListener('click', () => {
  sessionToken = null;
  localStorage.removeItem('beta_token');
  showBetaGate('You have signed out of the closed beta.');
});

// On Page Load: Fetch initial colors directly
function initApp() {
  if (betaGateModal) {
    betaGateModal.classList.add('hidden');
    betaGateModal.style.display = 'none';
  }
  if (inputEl && inputEl.value) {
    fetchColors(inputEl.value);
  }
}

initApp();
