// =============================================
// 1) RTL Preset - Auto RTL for saved websites
// =============================================

function getCurrentHostname() {
  return window.location.hostname.replace(/^www\./, '');
}

function safeStorageGet(keys, callback) {
  chrome.storage.sync.get(keys, (result) => {
    if (chrome.runtime.lastError) {
      console.warn('RTL Preset storage read error:', chrome.runtime.lastError.message);
      callback({});
      return;
    }
    callback(result);
  });
}

function safeStorageSet(data) {
  chrome.storage.sync.set(data, () => {
    if (chrome.runtime.lastError) {
      console.warn('RTL Preset storage write error:', chrome.runtime.lastError.message);
    }
  });
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
  fontStyleEl.textContent = `*:not([class*="icon"]):not([class*="Icon"]):not(.fa):not(.fas):not(.far):not(.fab):not(.fal):not(.fad):not(.material-icons):not(.material-icons-outlined):not(.material-icons-round):not(.material-symbols-outlined):not(.glyphicon):not([data-icon]):not(.bi):not([class^="bi-"]) { font-family: "${font.name}", Tahoma, Arial, sans-serif !important; }`;
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
// 3) UI Fix Engine
// =============================================

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'TITLE',
  'BR', 'HR', 'NOSCRIPT', 'TEMPLATE', 'IFRAME',
]);

const originalStyles = new WeakMap();
let uiFixObserver = null;
let uiFixActive = false;

function storeOriginal(el, prop) {
  if (!originalStyles.has(el)) {
    originalStyles.set(el, {});
  }
  const stored = originalStyles.get(el);
  if (!(prop in stored)) {
    stored[prop] = el.style.getPropertyValue(prop);
  }
}

function restoreOriginal(el) {
  const stored = originalStyles.get(el);
  if (!stored) return;
  for (const [prop, value] of Object.entries(stored)) {
    if (value) {
      el.style.setProperty(prop, value);
    } else {
      el.style.removeProperty(prop);
    }
  }
  originalStyles.delete(el);
  delete el.dataset.rtlUiFixed;
}

function fixElement(el) {
  if (SKIP_TAGS.has(el.tagName)) return;
  if (el.dataset.rtlUiFixed) return;

  const computed = window.getComputedStyle(el);
  if (computed.display === 'none') return;

  let wasFixed = false;

  // --- 1. Swap position left <-> right ---
  const position = computed.position;
  if (position === 'absolute' || position === 'fixed' || position === 'sticky') {
    const left = computed.left;
    const right = computed.right;
    const leftIsAuto = left === 'auto';
    const rightIsAuto = right === 'auto';

    if (!leftIsAuto && rightIsAuto) {
      storeOriginal(el, 'left');
      storeOriginal(el, 'right');
      el.style.right = left;
      el.style.left = 'auto';
      wasFixed = true;
    } else if (leftIsAuto && !rightIsAuto) {
      storeOriginal(el, 'left');
      storeOriginal(el, 'right');
      el.style.left = right;
      el.style.right = 'auto';
      wasFixed = true;
    }
  }

  // --- 2. Swap margins ---
  const ml = parseFloat(computed.marginLeft) || 0;
  const mr = parseFloat(computed.marginRight) || 0;
  if (Math.abs(ml - mr) > 2) {
    storeOriginal(el, 'margin-left');
    storeOriginal(el, 'margin-right');
    el.style.marginLeft = computed.marginRight;
    el.style.marginRight = computed.marginLeft;
    wasFixed = true;
  }

  // --- 3. Swap paddings ---
  const pl = parseFloat(computed.paddingLeft) || 0;
  const pr = parseFloat(computed.paddingRight) || 0;
  if (Math.abs(pl - pr) > 2) {
    storeOriginal(el, 'padding-left');
    storeOriginal(el, 'padding-right');
    el.style.paddingLeft = computed.paddingRight;
    el.style.paddingRight = computed.paddingLeft;
    wasFixed = true;
  }

  // --- 4. Swap floats ---
  const float = computed.float;
  if (float === 'left') {
    storeOriginal(el, 'float');
    el.style.cssFloat = 'right';
    wasFixed = true;
  } else if (float === 'right') {
    storeOriginal(el, 'float');
    el.style.cssFloat = 'left';
    wasFixed = true;
  }

  // --- 5. Swap border-left <-> border-right ---
  const blw = parseFloat(computed.borderLeftWidth) || 0;
  const brw = parseFloat(computed.borderRightWidth) || 0;
  if (Math.abs(blw - brw) > 0.5) {
    const bl = `${computed.borderLeftWidth} ${computed.borderLeftStyle} ${computed.borderLeftColor}`;
    const br = `${computed.borderRightWidth} ${computed.borderRightStyle} ${computed.borderRightColor}`;
    storeOriginal(el, 'border-left');
    storeOriginal(el, 'border-right');
    el.style.borderLeft = br;
    el.style.borderRight = bl;
    wasFixed = true;
  }

  // --- 6. Swap border-radius corners ---
  const btlr = computed.borderTopLeftRadius;
  const btrr = computed.borderTopRightRadius;
  const bblr = computed.borderBottomLeftRadius;
  const bbrr = computed.borderBottomRightRadius;
  if (btlr !== btrr || bblr !== bbrr) {
    storeOriginal(el, 'border-top-left-radius');
    storeOriginal(el, 'border-top-right-radius');
    storeOriginal(el, 'border-bottom-left-radius');
    storeOriginal(el, 'border-bottom-right-radius');
    el.style.borderTopLeftRadius = btrr;
    el.style.borderTopRightRadius = btlr;
    el.style.borderBottomLeftRadius = bbrr;
    el.style.borderBottomRightRadius = bblr;
    wasFixed = true;
  }

  // --- 7. Mirror translateX in transforms ---
  const transform = computed.transform;
  if (transform && transform !== 'none') {
    const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const values = matrixMatch[1].split(',').map((v) => parseFloat(v.trim()));
      if (Math.abs(values[4]) > 1) {
        storeOriginal(el, 'transform');
        values[4] = -values[4];
        el.style.transform = `matrix(${values.join(', ')})`;
        wasFixed = true;
      }
    }
    const matrix3dMatch = !matrixMatch && transform.match(/matrix3d\(([^)]+)\)/);
    if (matrix3dMatch) {
      const values = matrix3dMatch[1].split(',').map((v) => parseFloat(v.trim()));
      if (Math.abs(values[12]) > 1) {
        storeOriginal(el, 'transform');
        values[12] = -values[12];
        el.style.transform = `matrix3d(${values.join(', ')})`;
        wasFixed = true;
      }
    }
  }

  // --- 7b. Mirror translateX in style attribute ---
  const rawTransform = el.style.transform;
  if (rawTransform) {
    let mirrored = rawTransform;
    mirrored = mirrored.replace(/translateX\(\s*(-?[\d.]+)(px|%|rem|em|vw)\s*\)/g, (_, val, unit) => {
      const n = parseFloat(val);
      return n !== 0 ? `translateX(${-n}${unit})` : `translateX(0${unit})`;
    });
    mirrored = mirrored.replace(/translate\(\s*(-?[\d.]+)(px|%|rem|em|vw)\s*,/g, (_, val, unit) => {
      const n = parseFloat(val);
      return n !== 0 ? `translate(${-n}${unit},` : `translate(0${unit},`;
    });
    if (mirrored !== rawTransform) {
      storeOriginal(el, 'transform');
      el.style.transform = mirrored;
      wasFixed = true;
    }
  }

  // --- 8. Fix background-position ---
  const bgPos = computed.backgroundPosition;
  if (bgPos) {
    const replaced = bgPos
      .replace(/\bleft\b/g, '__RIGHT__')
      .replace(/\bright\b/g, 'left')
      .replace(/__RIGHT__/g, 'right');
    if (replaced !== bgPos) {
      storeOriginal(el, 'background-position');
      el.style.backgroundPosition = replaced;
      wasFixed = true;
    }
  }

  if (wasFixed) {
    el.dataset.rtlUiFixed = 'true';
  }
}

function enableUIFix() {
  if (uiFixActive) return;
  uiFixActive = true;

  // Process existing elements in chunks
  const elements = Array.from(document.querySelectorAll('*'));
  const CHUNK = 200;
  let i = 0;

  function processChunk() {
    if (!uiFixActive) return;
    const end = Math.min(i + CHUNK, elements.length);
    for (; i < end; i++) {
      fixElement(elements[i]);
    }
    if (i < elements.length) {
      requestAnimationFrame(processChunk);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(processChunk));
  } else {
    requestAnimationFrame(processChunk);
  }

  // Watch for dynamically added elements
  const target = document.body || document.documentElement;
  uiFixObserver = new MutationObserver((mutations) => {
    if (!uiFixActive) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          fixElement(node);
          const children = node.querySelectorAll('*');
          children.forEach(fixElement);
        }
      }
    }
  });

  uiFixObserver.observe(target, { childList: true, subtree: true });
}

function disableUIFix() {
  uiFixActive = false;

  if (uiFixObserver) {
    uiFixObserver.disconnect();
    uiFixObserver = null;
  }

  document.querySelectorAll('[data-rtl-ui-fixed]').forEach(restoreOriginal);
}

// =============================================
// 4) Check & Apply on page load
// =============================================

function checkAndApply() {
  const hostname = getCurrentHostname();
  safeStorageGet(['rtlSites', 'rtlFonts', 'rtlUIFix'], (result) => {
    const sites = result.rtlSites || [];
    const fonts = result.rtlFonts || {};
    const uiFixes = result.rtlUIFix || {};

    if (sites.includes(hostname)) {
      applyRTL();
      applyFont(fonts[hostname] || fonts._global || 'none');

      if (uiFixes[hostname]) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => enableUIFix());
        } else {
          enableUIFix();
        }
      }
    } else {
      removeRTL();
      removeFont();
      disableUIFix();
    }

    // Restore saved element-level toggles
    restoreElementToggles();
  });
}

checkAndApply();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateRTL') {
    const hostname = getCurrentHostname();
    if (message.sites.includes(hostname)) {
      applyRTL();
    } else {
      removeRTL();
      removeFont();
      disableUIFix();
    }
  }

  if (message.action === 'updateFont') {
    applyFont(message.fontKey);
  }

  if (message.action === 'updateUIFix') {
    if (message.enabled) {
      enableUIFix();
    } else {
      disableUIFix();
    }
  }
});

// Watch for storage changes
chrome.storage.onChanged.addListener((changes) => {
  const hostname = getCurrentHostname();

  if (changes.rtlSites) {
    const newSites = changes.rtlSites.newValue || [];
    if (newSites.includes(hostname)) {
      applyRTL();
      safeStorageGet(['rtlFonts', 'rtlUIFix'], (result) => {
        const fonts = result.rtlFonts || {};
        const uiFixes = result.rtlUIFix || {};
        applyFont(fonts[hostname] || fonts._global || 'none');
        if (uiFixes[hostname]) enableUIFix();
      });
    } else {
      removeRTL();
      removeFont();
      disableUIFix();
    }
  }

  if (changes.rtlFonts) {
    const fonts = changes.rtlFonts.newValue || {};
    safeStorageGet(['rtlSites'], (result) => {
      if ((result.rtlSites || []).includes(hostname)) {
        applyFont(fonts[hostname] || fonts._global || 'none');
      }
    });
  }

  if (changes.rtlUIFix) {
    const uiFixes = changes.rtlUIFix.newValue || {};
    safeStorageGet(['rtlSites'], (result) => {
      if ((result.rtlSites || []).includes(hostname)) {
        if (uiFixes[hostname]) {
          enableUIFix();
        } else {
          disableUIFix();
        }
      }
    });
  }
});

// =============================================
// 5) RTL Clicker - Alt+Click to toggle per element
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
  safeStorageGet(['rtlElements'], (result) => {
    const all = result.rtlElements || {};
    if (!all[hostname]) all[hostname] = {};

    if (dir === null) {
      delete all[hostname][selector];
    } else {
      all[hostname][selector] = dir;
    }

    safeStorageSet({ rtlElements: all });
  });
}

// Restore saved element toggles on page load
function restoreElementToggles() {
  const hostname = getCurrentHostname();

  safeStorageGet(['rtlElements'], (result) => {
    const all = result.rtlElements || {};
    const toggles = all[hostname];
    if (!toggles) return;

    const apply = () => {
      for (const [selector, dir] of Object.entries(toggles)) {
        try {
          const el = document.querySelector(selector);
          if (el) {
            el.style.direction = dir;
            el.style.textAlign = dir === 'rtl' ? 'right' : 'left';
          }
        } catch {
          // invalid selector
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

      // Save
      const selector = getSelector(target);
      saveElementToggle(selector, newDir);

      // Green flash
      target.style.outline = '2px solid #22c55e';
      setTimeout(() => {
        target.style.outline = target.dataset.originalOutline || '';
      }, 500);

      currentElement = null;
    }
  },
  true
);
