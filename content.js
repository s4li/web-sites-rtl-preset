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

// =============================================
// 2) Persian Font Support
// =============================================

let fontStyleEl = null;
let fontLinkEl = null;

const FONT_MAP = {
  vazirmatn: {
    name: 'Vazirmatn',
    url: 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100;200;300;400;500;600;700;800;900&display=swap',
  },
  'noto-sans-arabic': {
    name: 'Noto Sans Arabic',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@100;200;300;400;500;600;700;800;900&display=swap',
  },
  sahel: {
    name: 'Sahel',
    url: 'https://cdn.jsdelivr.net/gh/rastikerdar/sahel-font@v3.4.0/dist/font-face.css',
  },
  samim: {
    name: 'Samim',
    url: 'https://cdn.jsdelivr.net/gh/rastikerdar/samim-font@v4.0.5/dist/font-face.css',
  },
};

function applyFont(fontKey) {
  removeFont();
  if (!fontKey || fontKey === 'none') return;

  const font = FONT_MAP[fontKey];
  if (!font) return;

  fontLinkEl = document.createElement('link');
  fontLinkEl.rel = 'stylesheet';
  fontLinkEl.href = font.url;
  document.head.appendChild(fontLinkEl);

  fontStyleEl = document.createElement('style');
  fontStyleEl.textContent = `* { font-family: "${font.name}", Tahoma, Arial, sans-serif !important; }`;
  document.head.appendChild(fontStyleEl);
}

function removeFont() {
  if (fontLinkEl) {
    fontLinkEl.remove();
    fontLinkEl = null;
  }
  if (fontStyleEl) {
    fontStyleEl.remove();
    fontStyleEl = null;
  }
}

// =============================================
// 3) Check & Apply on page load
// =============================================

function checkAndApply() {
  const hostname = getCurrentHostname();
  chrome.storage.sync.get(['rtlSites', 'rtlFonts'], (result) => {
    const sites = result.rtlSites || [];
    const fonts = result.rtlFonts || {};

    if (sites.includes(hostname)) {
      applyRTL();
      applyFont(fonts[hostname] || fonts._global || 'none');
    } else {
      removeRTL();
      removeFont();
    }

    // Restore saved element-level toggles
    restoreElementToggles();
  });
}

checkAndApply();

// Listen for updates from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateRTL') {
    const hostname = getCurrentHostname();
    if (message.sites.includes(hostname)) {
      applyRTL();
    } else {
      removeRTL();
      removeFont();
    }
  }
  if (message.action === 'updateFont') {
    applyFont(message.fontKey);
  }
});

// Watch for storage changes
chrome.storage.onChanged.addListener((changes) => {
  const hostname = getCurrentHostname();

  if (changes.rtlSites) {
    const newSites = changes.rtlSites.newValue || [];
    if (newSites.includes(hostname)) {
      applyRTL();
      // Also check font
      chrome.storage.sync.get(['rtlFonts'], (result) => {
        const fonts = result.rtlFonts || {};
        applyFont(fonts[hostname] || fonts._global || 'none');
      });
    } else {
      removeRTL();
      removeFont();
    }
  }

  if (changes.rtlFonts) {
    const fonts = changes.rtlFonts.newValue || {};
    chrome.storage.sync.get(['rtlSites'], (result) => {
      const sites = result.rtlSites || [];
      if (sites.includes(hostname)) {
        applyFont(fonts[hostname] || fonts._global || 'none');
      }
    });
  }
});

// =============================================
// 4) RTL Clicker - Alt+Click to toggle per element
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

// Generate a unique CSS selector for an element
function getSelector(el) {
  if (el.id) return '#' + CSS.escape(el.id);

  const parts = [];
  let node = el;

  while (node && node !== document.documentElement) {
    if (node.id) {
      parts.unshift('#' + CSS.escape(node.id));
      break;
    }

    let tag = node.tagName.toLowerCase();
    const parent = node.parentElement;

    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (s) => s.tagName === node.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(node) + 1;
        tag += `:nth-of-type(${index})`;
      }
    }

    parts.unshift(tag);
    node = node.parentElement;
  }

  return parts.join(' > ');
}

// Save element toggle to storage
function saveElementToggle(selector, dir) {
  const hostname = getCurrentHostname();
  const key = 'rtlElements';

  chrome.storage.sync.get([key], (result) => {
    const all = result[key] || {};
    if (!all[hostname]) all[hostname] = {};

    if (dir === null) {
      delete all[hostname][selector];
    } else {
      all[hostname][selector] = dir;
    }

    chrome.storage.sync.set({ [key]: all });
  });
}

// Restore saved element toggles on page load
function restoreElementToggles() {
  const hostname = getCurrentHostname();

  chrome.storage.sync.get(['rtlElements'], (result) => {
    const all = result.rtlElements || {};
    const toggles = all[hostname];
    if (!toggles) return;

    // Wait for DOM to be ready
    const apply = () => {
      for (const [selector, dir] of Object.entries(toggles)) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            el.style.direction = dir;
            el.style.textAlign = dir === 'rtl' ? 'right' : 'left';
          }
        } catch {
          // invalid selector, skip
        }
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply);
    } else {
      apply();
    }
  });
}

// Mouseover: highlight when Alt is held
document.addEventListener(
  'mouseover',
  function (e) {
    if (e.altKey) {
      e.stopPropagation();
      if (currentElement && currentElement !== e.target) {
        clearHighlight(currentElement);
      }
      currentElement = e.target;
      drawHighlight(currentElement);
    }
  },
  true
);

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

// Alt+Click: toggle RTL/LTR on the highlighted element + save
document.addEventListener(
  'click',
  function (e) {
    if (e.altKey && currentElement) {
      e.preventDefault();
      e.stopPropagation();

      const target = currentElement;
      const computedStyle = window.getComputedStyle(target);
      const currentDir = computedStyle.direction;
      const newDir = currentDir === 'rtl' ? 'ltr' : 'rtl';

      target.style.direction = newDir;
      target.style.textAlign = newDir === 'rtl' ? 'right' : 'left';

      // Save to storage
      const selector = getSelector(target);
      saveElementToggle(selector, newDir);

      // Green flash feedback
      target.style.outline = '2px solid #22c55e';
      setTimeout(() => {
        target.style.outline = target.dataset.originalOutline || '';
      }, 500);

      currentElement = null;
    }
  },
  true
);
