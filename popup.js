const siteInput = document.getElementById('siteInput');
const addSiteBtn = document.getElementById('addSiteBtn');
const siteList = document.getElementById('siteList');
const emptyState = document.getElementById('emptyState');
const quickToggle = document.getElementById('quickToggle');
const currentSiteLabel = document.getElementById('currentSiteLabel');
const toggleCurrentSite = document.getElementById('toggleCurrentSite');
const toggleText = document.getElementById('toggleText');

let sites = [];
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

function loadSites() {
  chrome.storage.sync.get(['rtlSites'], (result) => {
    sites = result.rtlSites || [];
    renderList();
    updateQuickToggle();
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
    removeBtn.title = 'حذف';
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
  notifyTabs();
}

function removeSite(hostname) {
  sites = sites.filter((s) => s !== hostname);
  saveSites();
  renderList();
  updateQuickToggle();
  notifyTabs();
}

function updateQuickToggle() {
  if (!currentHostname) return;

  quickToggle.style.display = 'flex';
  currentSiteLabel.textContent = currentHostname;

  const isActive = sites.includes(currentHostname);
  if (isActive) {
    toggleCurrentSite.classList.add('active');
    toggleText.textContent = 'غیرفعال';
  } else {
    toggleCurrentSite.classList.remove('active');
    toggleText.textContent = 'فعال کردن';
  }
}

function notifyTabs() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: 'updateRTL', sites }).catch(() => {});
    });
  });
}

// Event listeners
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

// Get current tab hostname
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.url) {
    try {
      const url = new URL(tabs[0].url);
      currentHostname = url.hostname.replace(/^www\./, '');
      updateQuickToggle();
    } catch {
      // ignore invalid URLs (chrome://, etc.)
    }
  }
});

loadSites();
