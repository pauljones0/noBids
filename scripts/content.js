// scripts/content.js
console.log('Content script listener initialized.');

/**
 * Applies filtering to eBay item listings based on user settings.
 * This function is called when a message is received from the background script.
 * @param {object} settings - The filter settings.
 * @param {boolean} settings.extensionEnabled - Whether the filter is on.
 * @param {number} settings.maxBids - The maximum number of bids allowed.
 */
function applyFilter(settings) {
  console.log('Filter settings received:', settings);
  const { extensionEnabled, maxBids } = settings;
  const items = document.querySelectorAll('li.s-item');
  let blockedCount = 0;

  // If the extension is enabled, filter the items.
  if (extensionEnabled) {
    items.forEach(item => {
      const bidCountElement = item.querySelector('.s-item__bidCount');
      const bidText = bidCountElement ? bidCountElement.textContent || '' : '';
      const bidMatch = bidText.match(/\d+/);
      const bidCount = bidMatch ? parseInt(bidMatch[0], 10) : 0;

      // Condition 1: The item has exactly 0 bids. This is the default filter.
      const hasZeroBids = bidCount === 0;

      // Condition 2: The item's bid count is greater than the slider's value.
      // This check is only active if the slider is not at its max value (11, representing infinity).
      const isOverMaxBids = maxBids < 11 && bidCount > maxBids;

      // An item should be hidden if it has 0 bids OR if its bid count is over the slider's limit.
      const shouldHide = hasZeroBids || isOverMaxBids;

      if (shouldHide) {
        item.style.display = 'none';
        blockedCount++;
      } else {
        item.style.display = '';
      }
    });
  } else {
    // If the extension is disabled, ensure all items are visible.
    items.forEach(item => {
      item.style.display = '';
    });
  }

  console.log('Filtering complete. Items blocked:', blockedCount);

  // Send the final blocked count to the background script for badge update.
  browser.runtime.sendMessage({ action: 'updateBlockedCount', count: blockedCount }).catch(e => {
    console.error("Failed to send 'updateBlockedCount' message:", e);
  });
}

/**
 * Listens for messages from the background script and triggers the filter.
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateFilter') {
    applyFilter(message);
  }
});