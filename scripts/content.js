function hideListings() {
  try {
    const items = document.querySelectorAll('li.s-item');
    let hiddenCount = 0;

    items.forEach(item => {
      const bidCountElement = item.querySelector('.s-item__bidCount');

      if (bidCountElement) {
        const bidText = bidCountElement.textContent;
        const bidNumberMatch = bidText.match(/\d+/);

        if (bidNumberMatch) {
          const bidNumber = parseInt(bidNumberMatch[0], 10);

          if (bidNumber === 0) {
            item.style.display = 'none';
            item.setAttribute('data-hidden-by-nobids', 'true');
            hiddenCount++;
          }
        }
      }
    });

    console.log('Hid ' + hiddenCount + ' auction listings with 0 bids.');
    browser.runtime.sendMessage({ action: 'updateCounter', count: hiddenCount });
  } catch (error) {
    console.error('Error in hideListings:', error);
  }
}

function showListings() {
  try {
    const hiddenItems = document.querySelectorAll('[data-hidden-by-nobids="true"]');
    hiddenItems.forEach(item => {
      item.style.display = '';
      item.removeAttribute('data-hidden-by-nobids');
    });
    console.log('Shown all previously hidden listings.');
  } catch (error) {
    console.error('Error in showListings:', error);
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'setState') {
    if (message.enabled) {
      hideListings();
    } else {
      showListings();
      browser.runtime.sendMessage({ action: 'updateCounter', count: 0 });
    }
  }
});

// Initial run when the script is first injected
hideListings();