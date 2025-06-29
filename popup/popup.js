console.log('Popup script initialized.');

// --- Refactor: Named functions for event listeners for proper removal ---
// These functions are defined in a scope accessible for both adding and removing listeners.

/**
 * Handles changes in browser storage, specifically for 'tabBlockedCounts'.
 * @param {object} changes - The object describing the changes.
 * @param {string} namespace - The namespace of the storage that changed ('local', 'sync', or 'managed').
 */
const handleStorageChange = (changes, namespace) => {
    if (namespace === 'local' && changes.tabBlockedCounts) {
        // FIX: Updates the blocked count display when storage changes.
        updateBlockedCount();
    }
};

/**
 * Handles the activation of a new tab by updating the blocked count display.
 */
const handleTabActivation = () => {
    // FIX: Updates the blocked count for the newly active tab.
    updateBlockedCount();
};


document.addEventListener('DOMContentLoaded', async () => {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const rateMeBtn = document.getElementById('rateMeBtn');
    const blockedCountEl = document.getElementById('blockedCount');
    const sliderContainer = document.getElementById('sliderContainer');
    const maxBidsSlider = document.getElementById('maxBidsSlider');
    const sliderValue = document.getElementById('sliderValue');
    const filterDescription = document.getElementById('filter-description');

    // Function to control slider visibility
    const updateSliderVisibility = (isEnabled) => {
        sliderContainer.style.display = isEnabled ? 'flex' : 'none';
    };

    // Function to update the slider value display
    const updateSliderValueText = (value) => {
        if (parseInt(value, 10) === 11) {
            sliderValue.textContent = 'All';
        } else {
            sliderValue.textContent = value;
        }
    };

    const updateFilterDescription = (value) => {
        if (parseInt(value, 10) === 11) {
            filterDescription.textContent = 'Showing all items, regardless of bid count.';
        } else {
            filterDescription.textContent = `Hiding items with 0 bids or more than ${value} bids.`;
        }
    };

    // --- Refactor: Use async/await for improved readability ---
    // FIX: Replaced the .then() chain with a more modern and readable async/await block.
    try {
        const data = await browser.storage.local.get(['extensionEnabled', 'maxBids']);
        console.log('Loaded settings:', data);
        const isEnabled = !!data.extensionEnabled;
        const savedMaxBids = data.maxBids !== undefined ? data.maxBids : 11; // Default to 11

        // Set initial UI states
        toggleSwitch.checked = isEnabled;
        maxBidsSlider.value = savedMaxBids;
        updateSliderValueText(savedMaxBids);
        updateFilterDescription(savedMaxBids);
        updateSliderVisibility(isEnabled);
    } catch (e) {
        console.error("Error loading initial state:", e);
    }


    // Listen for changes on the toggle switch
    toggleSwitch.addEventListener('change', () => {
        const isEnabled = toggleSwitch.checked;
        updateSliderVisibility(isEnabled); // Immediate UI feedback
        browser.runtime.sendMessage({
            action: 'toggleExtension',
            enabled: isEnabled
        });
    });

    // Listen for changes on the slider
    maxBidsSlider.addEventListener('input', () => {
        console.log('Slider value changed:', maxBidsSlider.value);
        const maxBids = maxBidsSlider.value;
        updateSliderValueText(maxBids); // Immediate UI feedback
        updateFilterDescription(maxBids);
        browser.runtime.sendMessage({
            action: 'setMaxBids',
            maxBids: parseInt(maxBids, 10)
        });
    });

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

    // Listen for clicks on the "Rate Me" button
    rateMeBtn.addEventListener('click', () => {
        const extensionUrl = 'https://addons.mozilla.org/en-CA/firefox/addon/hidenobids/';
        browser.tabs.create({ url: extensionUrl });
    });

    // --- Refactor: Add event listeners using named functions ---
    // FIX: This allows us to remove them later, preventing memory leaks.
    browser.storage.onChanged.addListener(handleStorageChange);
    browser.tabs.onActivated.addListener(handleTabActivation);

    // --- Refactor: Add unload event listener for cleanup ---
    // FIX: This is the core of the memory leak fix. When the popup is closed,
    // these listeners are removed, freeing up resources.
    window.addEventListener('unload', () => {
        console.log('Popup unloading, removing listeners.');
        browser.storage.onChanged.removeListener(handleStorageChange);
        browser.tabs.onActivated.removeListener(handleTabActivation);
    });
});