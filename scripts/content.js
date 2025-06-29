(function() {
  // --- Refactor: Re-injection guard ---
  // FIX: This ensures the script's setup logic runs only once per page load,
  // preventing multiple message listeners and redundant work.
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  console.log('Content script listener initialized.');

  // --- Refactor: Inject CSS for performance ---
  // FIX: Injecting a CSS rule is more performant than direct style manipulation
  // as it minimizes browser reflows, especially on pages with many items.
  const injectCss = () => {
    const style = document.createElement('style');
    style.textContent = '.hnb-hidden { display: none !important; }';
    document.head.appendChild(style);
  };
  injectCss();


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

        // --- Refactor: Use CSS classes for hiding/showing items ---
        // FIX: Toggling a class is more performant than direct style manipulation.
        if (shouldHide) {
          item.classList.add('hnb-hidden');
          blockedCount++;
        } else {
          item.classList.remove('hnb-hidden');
        }
      });
    } else {
      // If the extension is disabled, ensure all items are visible.
      items.forEach(item => {
        item.classList.remove('hnb-hidden');
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
})();