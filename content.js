// =============================================
// 1) RTL Preset - Auto RTL for saved websites
// =============================================

function getCurrentHostname() {
  return window.location.hostname.replace(/^www\./, '');
}

function applyRTL() {
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.style.direction = 'rtl';
}

function removeRTL() {
  document.documentElement.removeAttribute('dir');
  document.documentElement.style.direction = '';
}

function checkAndApply() {
  const hostname = getCurrentHostname();
  chrome.storage.sync.get(['rtlSites'], (result) => {
    const sites = result.rtlSites || [];
    if (sites.includes(hostname)) {
      applyRTL();
    } else {
      removeRTL();
    }
  });
}

// Apply on page load
checkAndApply();

// Listen for updates from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateRTL') {
    const hostname = getCurrentHostname();
    if (message.sites.includes(hostname)) {
      applyRTL();
    } else {
      removeRTL();
    }
  }
});

// Watch for storage changes (sync across tabs/devices)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.rtlSites) {
    const hostname = getCurrentHostname();
    const newSites = changes.rtlSites.newValue || [];
    if (newSites.includes(hostname)) {
      applyRTL();
    } else {
      removeRTL();
    }
  }
});

// =============================================
// 2) RTL Clicker - Alt+Click to toggle per element
// =============================================

let currentElement = null;

const HIGHLIGHT_STYLE = '2px solid #3b82f6';
const HIGHLIGHT_BG = 'rgba(59, 130, 246, 0.1)';

function clearHighlight(el) {
  if (el) {
    el.style.outline = el.dataset.originalOutline || '';
    el.style.backgroundColor = el.dataset.originalBg || '';
    delete el.dataset.originalOutline;
    delete el.dataset.originalBg;
  }
}

function drawHighlight(el) {
  if (!el) return;
  if (typeof el.dataset.originalOutline === 'undefined') {
    el.dataset.originalOutline = el.style.outline;
    el.dataset.originalBg = el.style.backgroundColor;
  }
  el.style.outline = HIGHLIGHT_STYLE;
  el.style.backgroundColor = HIGHLIGHT_BG;
}

// Mouseover: highlight when Alt is held
document.addEventListener('mouseover', function (e) {
  if (e.altKey) {
    e.stopPropagation();
    if (currentElement && currentElement !== e.target) {
      clearHighlight(currentElement);
    }
    currentElement = e.target;
    drawHighlight(currentElement);
  }
}, true);

// Keyup: clean up when Alt is released
document.addEventListener('keyup', function (e) {
  if (e.key === 'Alt') {
    clearHighlight(currentElement);
    currentElement = null;
  }
});

// Keyboard navigation: Arrow Up (parent) / Arrow Down (child)
document.addEventListener('keydown', function (e) {
  if (!e.altKey || !currentElement) return;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (currentElement.parentElement) {
      clearHighlight(currentElement);
      currentElement = currentElement.parentElement;
      drawHighlight(currentElement);
    }
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (currentElement.firstElementChild) {
      clearHighlight(currentElement);
      currentElement = currentElement.firstElementChild;
      drawHighlight(currentElement);
    }
  }
});

// Alt+Click: toggle RTL/LTR on the highlighted element
document.addEventListener('click', function (e) {
  if (e.altKey && currentElement) {
    e.preventDefault();
    e.stopPropagation();

    const target = currentElement;
    const computedStyle = window.getComputedStyle(target);
    const currentDir = computedStyle.direction;

    if (currentDir === 'rtl') {
      target.style.direction = 'ltr';
      target.style.textAlign = 'left';
    } else {
      target.style.direction = 'rtl';
      target.style.textAlign = 'right';
    }

    // Green flash feedback
    target.style.outline = '2px solid #22c55e';
    setTimeout(() => {
      target.style.outline = target.dataset.originalOutline || '';
    }, 500);

    currentElement = null;
  }
}, true);
