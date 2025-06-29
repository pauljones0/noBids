console.log('Popup script initialized.');

document.addEventListener('DOMContentLoaded', () => {
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

    // Load initial state from storage
    browser.storage.local.get(['extensionEnabled', 'maxBids']).then((data) => {
        console.log('Loaded settings:', data);
        const isEnabled = !!data.extensionEnabled;
        const savedMaxBids = data.maxBids !== undefined ? data.maxBids : 11; // Default to 11

        // Set initial UI states
        toggleSwitch.checked = isEnabled;
        maxBidsSlider.value = savedMaxBids;
        updateSliderValueText(savedMaxBids);
        updateFilterDescription(savedMaxBids);
        updateSliderVisibility(isEnabled);
    });


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

    // Listen for changes in storage to update the count live
    browser.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.tabBlockedCounts) {
                updateBlockedCount();
            }
        }
    });

    // Also listen for tab activation changes to update the count
    browser.tabs.onActivated.addListener(updateBlockedCount);
});