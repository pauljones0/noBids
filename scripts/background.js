// scripts/background.js

const ALLOWED_HOSTS = [
  "*://*.ebay.at/sch/*", "*://*.ebay.be/sch/*", "*://*.ebay.ca/sch/*",
  "*://*.ebay.ch/sch/*", "*://*.ebay.cn/sch/*", "*://*.ebay.co.jp/sch/*",
  "*://*.ebay.co.uk/sch/*", "*://*.ebay.com/sch/*", "*://*.ebay.com.au/sch/*",
  "*://*.ebay.com.hk/sch/*", "*://*.ebay.com.mx/sch/*", "*://*.ebay.com.my/sch/*",
  "*://*.ebay.com.sg/sch/*", "*://*.ebay.com.tw/sch/*", "*://*.ebay.de/sch/*",
  "*://*.ebay.es/sch/*", "*://*.ebay.fr/sch/*", "*://*.ebay.ie/sch/*",
  "*://*.ebay.in/sch/*", "*://*.ebay.it/sch/*", "*://*.ebay.nl/sch/*",
  "*://*.ebay.ph/sch/*", "*://*.ebay.pl/sch/*", "*://*.ebay.se/sch/*",
  "*://*.ebay.vn/sch/*", "*://*.ebaythailand.co.th/sch/*"
];

/**
 * Checks if a given URL matches any of the patterns in ALLOWED_HOSTS.
 * @param {string} url The URL to check.
 * @returns {boolean} True if the URL is allowed, false otherwise.
 */
function isUrlAllowed(url) {
  if (!url) return false;
  // This is a simplified conversion of match patterns to a regular expression.
  // It's sufficient for the patterns used in this extension, which follow a simple structure.
  return ALLOWED_HOSTS.some(pattern => {
    const regex = new RegExp(pattern.replace(/[.]/g, '\\.').replace(/\*/g, '.*'));
    return regex.test(url);
  });
}

// This script runs in the background and manages the extension's state, tab updates, and messaging.
try {
  // 1. Default State on Installation
  browser.runtime.onInstalled.addListener(() => {
    try {
      browser.storage.local.set({ extensionEnabled: false, tabBlockedCounts: {} });
      browser.action.setIcon({ path: 'icons/icon-off.svg' });
      console.log('Extension installed and state initialized to disabled.');
    } catch (e) {
      console.error('Error during onInstalled listener:', e);
    }
  });

  // 3. State Toggling on Message
  browser.runtime.onMessage.addListener(async (message, sender) => {
    if (message.action === 'toggleExtension') {
      const { enabled } = message;
      try {
        await browser.storage.local.set({ extensionEnabled: enabled });
        if (!enabled) {
          await browser.storage.local.set({ tabBlockedCounts: {} });
        }
        const iconPath = enabled ? 'icons/icon-on.svg' : 'icons/icon-off.svg';
        await browser.action.setIcon({ path: iconPath });

        const tabs = await browser.tabs.query({ url: ALLOWED_HOSTS });
        tabs.forEach(tab => {
          // For enabling, we inject the script. The script itself will hide listings on load.
          // For disabling, we send a message to the existing content script to un-hide listings.
          if (enabled) {
            browser.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['scripts/content.js']
            });
          } else {
            browser.tabs.sendMessage(tab.id, { action: 'setState', enabled: false });
          }
        });

      } catch (e) {
        console.error('Error toggling extension state:', e);
      }
    } else if (message.action === 'updateCounter') {
      try {
        const { tabBlockedCounts = {} } = await browser.storage.local.get('tabBlockedCounts');
        tabBlockedCounts[sender.tab.id] = message.count;
        await browser.storage.local.set({ tabBlockedCounts });
      } catch (e) {
        console.error('Error updating counter:', e);
      }
    }
  });

  // 4. Tab Updates
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      try {
        const data = await browser.storage.local.get('extensionEnabled');
        if (data.extensionEnabled) {
          // Check if the tab's URL matches host permissions
          if (isUrlAllowed(tab.url)) {
            await browser.scripting.executeScript({
              target: { tabId: tabId },
              files: ['scripts/content.js']
            });
          }
        }
        updateBadge(tabId);
      } catch (e) {
        console.error('Error on tab update:', e);
      }
    }
  });

  // 5. Tab Closure
  browser.tabs.onRemoved.addListener(async (tabId) => {
    try {
      const { tabBlockedCounts = {} } = await browser.storage.local.get('tabBlockedCounts');
      if (tabBlockedCounts.hasOwnProperty(tabId)) {
        delete tabBlockedCounts[tabId];
        await browser.storage.local.set({ tabBlockedCounts });
      }
    } catch (e) {
      console.error('Error cleaning up tab count on removal:', e);
    }
  });

  // 6. Update badge text
  async function updateBadge(tabId) {
    try {
      await browser.action.setBadgeBackgroundColor({ color: '#808080' });
      await browser.action.setBadgeTextColor({ color: '#FFFFFF' });
      const { tabBlockedCounts = {} } = await browser.storage.local.get('tabBlockedCounts');
      const count = tabBlockedCounts[tabId] || 0;
      await browser.action.setBadgeText({ text: count > 0 ? `${count}` : '' });
    } catch (e) {
      console.error('Error updating badge:', e);
    }
  }

  // 7. Listen for tab activation
  browser.tabs.onActivated.addListener(activeInfo => {
    updateBadge(activeInfo.tabId);
  });

  // 8. Listen for storage changes
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.tabBlockedCounts) {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs.length > 0) {
          updateBadge(tabs[0].id);
        }
      });
    }
  });

} catch (e) {
  console.error('Global error in background script:', e);
}