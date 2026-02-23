const siteInput = document.getElementById('siteInput');
const addSiteBtn = document.getElementById('addSiteBtn');
const siteList = document.getElementById('siteList');
const emptyState = document.getElementById('emptyState');
const quickToggle = document.getElementById('quickToggle');
const currentSiteLabel = document.getElementById('currentSiteLabel');
const toggleCurrentSite = document.getElementById('toggleCurrentSite');
const toggleText = document.getElementById('toggleText');
const fontSection = document.getElementById('fontSection');
const fontSelect = document.getElementById('fontSelect');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

let sites = [];
let fonts = {};
let currentHostname = '';

function extractHostname(input) {
  let hostname = input.trim().toLowerCase();
  hostname = hostname.replace(/^https?:\/\//, '');
  hostname = hostname.replace(/^www\./, '');
  hostname = hostname.replace(/\/.*$/, '');
  return hostname;
}

function saveSites() {
  chrome.storage.sync.set({ rtlSites: sites });
}

function saveFonts() {
  chrome.storage.sync.set({ rtlFonts: fonts });
}

function loadAll() {
  chrome.storage.sync.get(['rtlSites', 'rtlFonts'], (result) => {
    sites = result.rtlSites || [];
    fonts = result.rtlFonts || {};
    renderList();
    updateQuickToggle();
    updateFontSection();
  });
}

function renderList() {
  siteList.innerHTML = '';

  if (sites.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  sites.forEach((site) => {
    const li = document.createElement('li');
    li.className = 'site-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'site-name';
    nameSpan.textContent = site;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.textContent = '\u00d7';
    removeBtn.title = '\u062d\u0630\u0641';
    removeBtn.addEventListener('click', () => removeSite(site));

    li.appendChild(nameSpan);
    li.appendChild(removeBtn);
    siteList.appendChild(li);
  });
}

function addSite(hostname) {
  if (!hostname) return;
  if (sites.includes(hostname)) return;

  sites.push(hostname);
  saveSites();
  renderList();
  updateQuickToggle();
  updateFontSection();
  notifyTabs();
}

function removeSite(hostname) {
  sites = sites.filter((s) => s !== hostname);
  saveSites();
  renderList();
  updateQuickToggle();
  updateFontSection();
  notifyTabs();
}

function updateQuickToggle() {
  if (!currentHostname) return;

  quickToggle.style.display = 'flex';
  currentSiteLabel.textContent = currentHostname;

  const isActive = sites.includes(currentHostname);
  if (isActive) {
    toggleCurrentSite.classList.add('active');
    toggleText.textContent = '\u063a\u06cc\u0631\u0641\u0639\u0627\u0644';
  } else {
    toggleCurrentSite.classList.remove('active');
    toggleText.textContent = '\u0641\u0639\u0627\u0644 \u06a9\u0631\u062f\u0646';
  }
}

function updateFontSection() {
  if (!currentHostname) return;

  const isActive = sites.includes(currentHostname);
  fontSection.style.display = isActive ? 'flex' : 'none';

  if (isActive) {
    fontSelect.value = fonts[currentHostname] || fonts._global || 'none';
  }
}

function notifyTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: 'updateRTL', sites }).catch(() => {});
    });
  });
}

// =============================================
// Event listeners
// =============================================

addSiteBtn.addEventListener('click', () => {
  const hostname = extractHostname(siteInput.value);
  if (hostname) {
    addSite(hostname);
    siteInput.value = '';
    siteInput.focus();
  }
});

siteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const hostname = extractHostname(siteInput.value);
    if (hostname) {
      addSite(hostname);
      siteInput.value = '';
    }
  }
});

toggleCurrentSite.addEventListener('click', () => {
  if (sites.includes(currentHostname)) {
    removeSite(currentHostname);
  } else {
    addSite(currentHostname);
  }
});

// Font selector
fontSelect.addEventListener('change', () => {
  const fontKey = fontSelect.value;

  if (fontKey === 'none') {
    delete fonts[currentHostname];
  } else {
    fonts[currentHostname] = fontKey;
  }

  saveFonts();

  // Notify current tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'updateFont', fontKey }).catch(() => {});
    }
  });
});

// =============================================
// Import / Export
// =============================================

exportBtn.addEventListener('click', () => {
  chrome.storage.sync.get(['rtlSites', 'rtlFonts', 'rtlElements'], (result) => {
    const data = {
      rtlSites: result.rtlSites || [],
      rtlFonts: result.rtlFonts || {},
      rtlElements: result.rtlElements || {},
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'rtl-preset-backup.json';
    a.click();

    URL.revokeObjectURL(url);
  });
});

importBtn.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);

      if (Array.isArray(data.rtlSites)) {
        // Merge with existing sites (no duplicates)
        const merged = [...new Set([...sites, ...data.rtlSites])];
        sites = merged;
        saveSites();
      }

      if (data.rtlFonts && typeof data.rtlFonts === 'object') {
        fonts = { ...fonts, ...data.rtlFonts };
        saveFonts();
      }

      if (data.rtlElements && typeof data.rtlElements === 'object') {
        chrome.storage.sync.get(['rtlElements'], (result) => {
          const existing = result.rtlElements || {};
          const merged = { ...existing, ...data.rtlElements };
          chrome.storage.sync.set({ rtlElements: merged });
        });
      }

      renderList();
      updateQuickToggle();
      updateFontSection();
      notifyTabs();
    } catch {
      // invalid JSON
    }
  };
  reader.readAsText(file);
  importFile.value = '';
});

// =============================================
// Init: get current tab hostname
// =============================================

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.url) {
    try {
      const url = new URL(tabs[0].url);
      currentHostname = url.hostname.replace(/^www\./, '');
      updateQuickToggle();
      updateFontSection();
    } catch {
      // ignore invalid URLs
    }
  }
});

loadAll();
