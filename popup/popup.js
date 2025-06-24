document.addEventListener('DOMContentLoaded', () => {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const rateMeBtn = document.getElementById('rateMeBtn');
    const blockedCountEl = document.getElementById('blockedCount');

    // Function to update the blocked count display for the active tab
    const updateBlockedCount = async () => {
        try {
            const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
            const data = await browser.storage.local.get('tabBlockedCounts');
            
            if (activeTab && data.tabBlockedCounts) {
                const count = data.tabBlockedCounts[activeTab.id] || 0;
                blockedCountEl.textContent = count;
            } else {
                blockedCountEl.textContent = '0';
            }
        } catch (e) {
            console.error("Error updating blocked count:", e);
            blockedCountEl.textContent = '0';
        }
    };

    // Initial update of the blocked count
    updateBlockedCount();

    // Load the saved state for the toggle switch
    browser.storage.local.get('extensionEnabled').then((data) => {
        toggleSwitch.checked = !!data.extensionEnabled;
    });

    // Listen for changes on the toggle switch
    toggleSwitch.addEventListener('change', () => {
        const isEnabled = toggleSwitch.checked;
        // Send a message to the background script to update the icon and state
        browser.runtime.sendMessage({
            action: 'toggleExtension',
            enabled: isEnabled
        });
    });

    // Listen for clicks on the "Rate Me" button
    rateMeBtn.addEventListener('click', () => {
        const extensionUrl = 'https://addons.mozilla.org/en-CA/firefox/addon/hidenobids/';
        browser.tabs.create({ url: extensionUrl });
    });

    // Listen for changes in storage to update the count live
    browser.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.tabBlockedCounts) {
            updateBlockedCount();
        }
    });

    // Also listen for tab activation changes to update the count
    browser.tabs.onActivated.addListener(updateBlockedCount);
});