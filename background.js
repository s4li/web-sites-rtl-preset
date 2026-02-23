// =============================================
// Badge indicator + Keyboard shortcut handler
// =============================================

function updateBadge(tabId, url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
    chrome.action.setBadgeText({ text: '', tabId });
    return;
  }

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    chrome.storage.sync.get(['rtlSites'], (result) => {
      const sites = result.rtlSites || [];
      if (sites.includes(hostname)) {
        chrome.action.setBadgeText({ text: 'RTL', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#e94560', tabId });
      } else {
        chrome.action.setBadgeText({ text: '', tabId });
      }
    });
  } catch {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

// Update badge when tab is activated
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab?.url) updateBadge(tab.id, tab.url);
  });
});

// Update badge when tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updateBadge(tabId, tab.url);
  }
});

// Update badge on all tabs when storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.rtlSites) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.url) updateBadge(tab.id, tab.url);
      });
    });
  }
});

// Keyboard shortcut: Ctrl+Shift+R to toggle RTL
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-rtl') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.url || tab.url.startsWith('chrome://')) return;

      const hostname = new URL(tab.url).hostname.replace(/^www\./, '');

      chrome.storage.sync.get(['rtlSites'], (result) => {
        const sites = result.rtlSites || [];
        const index = sites.indexOf(hostname);

        if (index > -1) {
          sites.splice(index, 1);
        } else {
          sites.push(hostname);
        }

        chrome.storage.sync.set({ rtlSites: sites });
      });
    });
  }
});
