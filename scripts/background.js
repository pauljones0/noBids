// scripts/background.js
console.log('Background script initialized.');

// --- Icon and Badge Management ---

/**
 * Updates the browser action icon based on the extension's state.
 * @param {boolean} isEnabled - Whether the extension is enabled.
 */
function updateIcon(isEnabled) {
  const path = isEnabled ? 'icons/icon-on.svg' : 'icons/icon-off.svg';
  browser.action.setIcon({ path });
}

/**
 * Updates the badge text for a specific tab.
 * @param {number} tabId - The ID of the tab to update.
 * @param {number} count - The number to display in the badge.
 */
function updateBadge(tabId, count) {
  if (tabId) {
    browser.action.setBadgeText({
      text: count > 0 ? count.toString() : '',
      tabId: tabId
    });
    browser.action.setBadgeBackgroundColor({
      color: '#0052cc',
      tabId: tabId
    });
  }
}

// 1. State Management: Initialize default state and icon on startup
(async () => {
  const data = await browser.storage.local.get(['extensionEnabled', 'maxBids']);
  if (data.extensionEnabled === undefined) {
    await browser.storage.local.set({ extensionEnabled: true });
    updateIcon(true); // Set initial icon state
  } else {
    updateIcon(data.extensionEnabled); // Set icon based on stored state
  }
  if (data.maxBids === undefined) {
    await browser.storage.local.set({ maxBids: 11 }); // 11 represents "All"
  }
})();

// 2. Message Handling: Listen for messages from popup and content scripts
browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log('Message received:', message); // Log every message

  if (message.action === 'toggleExtension') {
    await browser.storage.local.set({ extensionEnabled: message.enabled });
    updateIcon(message.enabled); // Update icon on toggle
    // Inform the content script
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.id) {
        const state = await browser.storage.local.get(['extensionEnabled', 'maxBids']);
        console.log('Sending updateFilter to tab:', activeTab.id);
        browser.tabs.sendMessage(activeTab.id, {
            action: 'updateFilter',
            ...state
        });
    }
  } else if (message.action === 'setMaxBids') {
      await browser.storage.local.set({ maxBids: message.maxBids });
      // Inform the content script
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id) {
          const state = await browser.storage.local.get(['extensionEnabled', 'maxBids']);
          console.log('Sending updateFilter to tab:', activeTab.id);
          browser.tabs.sendMessage(activeTab.id, {
              action: 'updateFilter',
              ...state
          });
      }
  } else if (message.action === 'updateBlockedCount') {
      if (sender.tab && sender.tab.id) {
          updateBadge(sender.tab.id, message.count);
          // Persist the count to storage
          const data = await browser.storage.local.get('tabBlockedCounts');
          const tabBlockedCounts = data.tabBlockedCounts || {};
          tabBlockedCounts[sender.tab.id] = message.count;
          await browser.storage.local.set({ tabBlockedCounts });
      }
  }
});


// 3. Tab Event Handling: Inject content script and send state on page load
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // The "host_permissions" in manifest.json restrict this to eBay search pages.
  // No need for a manual URL check here.
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      await browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ['scripts/content.js']
      });
      
      const state = await browser.storage.local.get(['extensionEnabled', 'maxBids']);
      console.log('Sending updateFilter to tab:', tabId);
      browser.tabs.sendMessage(tabId, {
        action: 'updateFilter',
        ...state
      });
    } catch (e) {
      // Silently fail if the script can't be injected (e.g., on pages like chrome://extensions).
      // The host_permissions should prevent this on most user-facing pages.
      if (!e.message.includes("No host permissions for the given tab")) {
          console.error(`Failed to inject or message tab ${tabId}:`, e);
      }
    }
  }
});

// 4. Tab Activation: Send state to newly activated tabs
browser.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const state = await browser.storage.local.get(['extensionEnabled', 'maxBids']);
        console.log('Sending updateFilter to tab:', activeInfo.tabId);
        browser.tabs.sendMessage(activeInfo.tabId, {
            action: 'updateFilter',
            ...state
        });
    } catch (e) {
        // This can happen if the content script is not yet injected in the activated tab.
        // onUpdated will handle it when the tab is loaded or updated.
        // console.warn(`Could not message tab ${activeInfo.tabId} on activation:`, e.message);
    }
});