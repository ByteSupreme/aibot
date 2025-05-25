document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    
    try {
        tg.setHeaderColor('#0E0F1A'); 
        tg.setBackgroundColor('#0E0F1A'); 
    } catch (e) {
        console.error("Error setting Telegram theme colors:", e);
    }

    const views = {
        characters: document.getElementById('characters-view'),
        settings: document.getElementById('settings-view'),
        createCharacter: document.getElementById('create-character-view'),
        plan: document.getElementById('plan-view'),
        paymentSubscription: document.getElementById('payment-subscription-view'),
        language: document.getElementById('language-view'),
        store: document.getElementById('store-view'),
        paymentGems: document.getElementById('payment-gems-view') // Re-using this for energy/generic item payment
    };

    const gemBarContainerOuter = document.getElementById('gem-bar-container-outer');
    const bottomNavBar = document.getElementById('bottom-nav-bar');

    let viewHistory = [];
    let currentViewId = 'characters'; 
    let selectedLanguage = 'en'; // Keep track of selected language

    tg.BackButton.onClick(() => {
        if (viewHistory.length > 0) {
            const previousViewId = viewHistory.pop();
            showView(previousViewId, true); 
        }
    });

    function updateTelegramBackButton() {
        if (viewHistory.length > 0) {
            tg.BackButton.show();
        } else {
            tg.BackButton.hide();
        }
    }

    function showView(viewId, isBack = false, params = {}) {
        const oldViewId = currentViewId;
        if (!isBack && oldViewId && oldViewId !== viewId) { 
            viewHistory.push(oldViewId);
        }

        for (const id in views) {
            if (views[id]) {
                views[id].classList.toggle('active-view', id === viewId);
                views[id].style.display = (id === viewId) ? 'flex' : 'none';
            }
        }
        currentViewId = viewId;
        updateStickyHeaderAndNav(viewId, params); 
        updateTelegramBackButton(); 
        
        tg.expand();
        window.scrollTo(0, 0);
    }

    function updateStickyHeaderAndNav(viewId, params = {}) {
        gemBarContainerOuter.innerHTML = ''; 
        
        const commonGemBarHTML = `
            <div class="gem-bar">
                <span class="gem-icon">💎</span>
                <span class="gem-count">0</span>
                <span class="energy-icon">⚡️</span>
                <span class="energy-status">100/100</span>
                <button class="plus-btn" id="gem-bar-plus-btn">➕</button>
            </div>`;

        if (viewId === 'characters' || viewId === 'settings' || viewId === 'store' || viewId === 'createCharacter') {
            gemBarContainerOuter.innerHTML = commonGemBarHTML;
            const plusButton = document.getElementById('gem-bar-plus-btn');
            if(plusButton) {
                plusButton.onclick = () => showView('store');
            }
        }

        const viewsWithBottomNav = ['characters', 'settings', 'createCharacter'];
        if (viewsWithBottomNav.includes(viewId)) {
            bottomNavBar.style.display = 'flex';
            document.querySelectorAll('.bottom-nav-item').forEach(btn => {
                const btnDataView = btn.dataset.view;
                let isActive = false;
                if ((viewId === 'characters' && btnDataView === 'characters-view') ||
                    (viewId === 'settings' && btnDataView === 'settings-view') ||
                    (viewId === 'createCharacter' && btnDataView === 'create-character-view') 
                ) {
                    isActive = true;
                }
                btn.classList.toggle('active', isActive);
            });
        } else {
            bottomNavBar.style.display = 'none';
        }
        
        const paymentItemAvatar = document.getElementById('payment-item-avatar');
        const paymentItemPurchaseTitle = document.getElementById('payment-item-purchase-title');
        const paymentItemDetails = document.getElementById('payment-item-details');
        const paymentItemTotalStars = document.getElementById('payment-item-total-stars');

        if (viewId === 'paymentGems') { // Unified payment screen
            if (params.type === 'energy') {
                paymentItemPurchaseTitle.textContent = 'Recharging Energy';
                paymentItemDetails.textContent = `${params.amount} Energy`;
                if(paymentItemAvatar) paymentItemAvatar.src = 'https://placehold.co/80x80/FFD700/333333/png?text=⚡&font=roboto'; // Energy icon
            } else { // Default to gems
                paymentItemPurchaseTitle.textContent = 'Purchasing a pack';
                paymentItemDetails.textContent = `${params.gems} Gems`;
                 if(paymentItemAvatar) paymentItemAvatar.src = 'https://placehold.co/80x80/4FC3F7/FFFFFF/png?text=Gems&font=roboto'; // Gem icon
            }
            paymentItemTotalStars.innerHTML = 
                `${params.stars} <span class="telegram-star">⭐</span>`;
        }

        if (viewId === 'paymentSubscription' && params.planDetails && params.stars) {
            document.getElementById('payment-sub-plan-details').textContent = params.planDetails;
            document.getElementById('payment-sub-total-stars').innerHTML =
                `${params.stars} <span class="telegram-star">⭐</span>`;
        }
    }
    
    // --- CHARACTER DATA AND RENDERING ---
    const charactersData = [ /* (Same as before) */ ];
    const characterGrid = document.getElementById('character-grid');
    let selectedCharacterCard = null;
    function populateCharacters() { /* (Same as before) */ } // Ensure it's defined if used

    // (Assuming populateCharacters() and related logic from previous version is here)
    populateCharacters(); // Call it if you defined it
    
    // --- EVENT LISTENERS FOR NAVIGATION AND INTERACTIONS ---
    document.getElementById('settings-upgrade-plan-btn').addEventListener('click', () => showView('plan'));
    document.getElementById('settings-language-btn').addEventListener('click', () => showView('language'));
    
    const styleLabels = document.querySelectorAll('.style-label');
    const styleImages = { realistic: document.getElementById('style-realistic'), anime: document.getElementById('style-anime') };
    styleLabels.forEach(label => {
        label.addEventListener('click', () => {
            styleLabels.forEach(lbl => lbl.classList.remove('active')); label.classList.add('active');
            styleLabels.forEach(lbl => lbl.querySelector('.checkbox-custom').classList.remove('checked')); label.querySelector('.checkbox-custom').classList.add('checked');
            styleImages.realistic.classList.toggle('active', label.classList.contains('realistic'));
            styleImages.anime.classList.toggle('active', label.classList.contains('anime'));
        });
    });

    const planOptions = document.querySelectorAll('.plan-option');
    const planFeatureGemsAmountEl = document.getElementById('plan-feature-gems-amount');

    planOptions.forEach(option => {
        option.addEventListener('click', () => {
            planOptions.forEach(opt => { opt.classList.remove('selected'); opt.querySelector('.radio-custom').classList.remove('checked'); });
            option.classList.add('selected'); option.querySelector('.radio-custom').classList.add('checked');
            const gemsBonus = option.dataset.gemsBonus;
            if (planFeatureGemsAmountEl) { planFeatureGemsAmountEl.textContent = gemsBonus; }
        });
    });
    // Initialize gems for the default selected plan
    const initialSelectedPlan = document.querySelector('.plan-option.selected');
    if (initialSelectedPlan && planFeatureGemsAmountEl) {
        planFeatureGemsAmountEl.textContent = initialSelectedPlan.dataset.gemsBonus;
    }


    document.getElementById('plan-upgrade-btn').addEventListener('click', () => {
        const selectedPlan = document.querySelector('.plan-option.selected');
        if (selectedPlan) {
            const planTitle = selectedPlan.querySelector('.plan-title').textContent; 
            const stars = selectedPlan.dataset.starsCost;
            showView('paymentSubscription', false, { planDetails: planTitle, stars: stars });
        } else { tg.showAlert("Please select a plan first."); }
    });

    document.getElementById('payment-sub-confirm-btn').addEventListener('click', () => { tg.showAlert("Subscription upgrade initiated (simulated)!"); viewHistory = []; showView('characters'); });

    const languageOptions = document.querySelectorAll('.language-option');
    const currentLangDisplayEl = document.getElementById('current-language-display');
    selectedLanguage = 'en'; // Default
    languageOptions.forEach(opt => {
        const isSelected = opt.dataset.lang === selectedLanguage; 
        opt.classList.toggle('selected', isSelected); 
        opt.querySelector('.radio-custom').classList.toggle('checked', isSelected);
        if (isSelected && currentLangDisplayEl) { currentLangDisplayEl.textContent = opt.dataset.langName || opt.childNodes[0].nodeValue.trim(); }
    });

    languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            languageOptions.forEach(opt => { opt.classList.remove('selected'); opt.querySelector('.radio-custom').classList.remove('checked'); });
            option.classList.add('selected'); option.querySelector('.radio-custom').classList.add('checked');
            selectedLanguage = option.dataset.lang; // Update global selected language
            if (currentLangDisplayEl) { currentLangDisplayEl.textContent = option.dataset.langName || option.childNodes[0].nodeValue.trim(); }
            console.log("Language selected:", selectedLanguage);
            if (viewHistory.length > 0) { tg.BackButton.onClick(); } else { showView('settings', true); }
        });
    });

    const storeGemPacks = document.querySelectorAll('.store-gem-pack');
    storeGemPacks.forEach(pack => {
        pack.addEventListener('click', () => {
            const gems = pack.dataset.gems; const stars = pack.dataset.stars;
            showView('paymentGems', false, { type: 'gems', gems, stars });
        });
    });

     document.getElementById('recharge-energy-btn').addEventListener('click', () => {
        tg.showPopup({
            title: 'Recharge Energy',
            message: 'Enter amount of energy to recharge:',
            buttons: [
                {id: 'recharge_custom', type: 'default', text: 'Recharge'},
                {type: 'cancel'},
            ],
            inputs: [ // This is not an official parameter, simulating with message.
                      // Real solution needs custom modal or better WebApp input features.
                      // For now, we'll process a fixed amount or ask in a simpler way.
            ]
        }, (buttonId, values) => { // `values` is not standard for showPopup inputs.
            if(buttonId === 'recharge_custom'){
                // Simulating getting a value. For real input, a custom HTML modal is better.
                const amount = prompt("Enter energy amount to recharge (e.g., 50):", "50");
                if (amount !== null && !isNaN(amount) && parseInt(amount) > 0) {
                    const energyAmount = parseInt(amount);
                    const starsCost = energyAmount * 2; // Example: 1 energy = 2 stars
                    tg.showAlert(`You are about to recharge ${energyAmount} energy for ${starsCost} Stars.`);
                    // Proceed to payment-like screen for energy
                    showView('paymentGems', false, { type: 'energy', amount: energyAmount, stars: starsCost });
                } else if (amount !== null) {
                    tg.showAlert("Invalid amount entered.");
                }
            }
        });
    });


    document.getElementById('payment-item-confirm-btn').addEventListener('click', () => { // Unified payment button
        const itemDetails = document.getElementById('payment-item-details').textContent;
        tg.showAlert(`Payment for "${itemDetails}" initiated (simulated)!`);
        // Navigate back intelligently based on context (stored in params if needed, or by viewHistory)
        if (viewHistory.includes('store')) { 
            while(viewHistory.length > 0 && viewHistory[viewHistory.length-1] !== 'store') { viewHistory.pop(); } 
            if (viewHistory.length > 0 && viewHistory[viewHistory.length-1] === 'store') tg.BackButton.onClick(); 
            else showView('store', true); 
        } else { 
            viewHistory = []; 
            showView('characters');
        }
    });

    const saveCharBtn = document.getElementById('save-character-btn');
    if (saveCharBtn) {
        saveCharBtn.addEventListener('click', () => {
            const charName = document.getElementById('char-name').value;
            const charDesc = document.getElementById('char-desc').value;
            const charImage = document.getElementById('char-image').value;
            const creationCost = 15; // Stars

            if (charName.trim() === "" || charDesc.trim() === "") { tg.showAlert("Please enter a name and description."); return; }
            
            // Here, you would normally check if the user has enough stars.
            // tg.confirm(`Create character "${charName}" for ${creationCost} Stars?`, (ok) => {
            //    if (ok) { // If user confirms
                    // TODO: Add logic to deduct stars and save the character data
                    console.log("Creating character:", {name: charName, desc: charDesc, image: charImage});
                    tg.showAlert(`Character "${charName}" created for ${creationCost} Stars (simulated)!`);
                    document.getElementById('char-name').value = ''; document.getElementById('char-desc').value = ''; document.getElementById('char-image').value = '';
                    if (viewHistory.length > 0) { tg.BackButton.onClick(); } // Go back to previous screen
                    else { showView('characters'); } // Fallback
            //    }
            // });
            // Simplified for now without tg.confirm which can be disruptive for quick tests
            console.log("Creating character:", {name: charName, desc: charDesc, image: charImage});
            tg.showAlert(`Character "${charName}" created for ${creationCost} Stars (simulated)!`);
            document.getElementById('char-name').value = ''; document.getElementById('char-desc').value = ''; document.getElementById('char-image').value = '';
            if (viewHistory.length > 0 && viewHistory.includes('characters')) { while (viewHistory.length > 0 && viewHistory[viewHistory.length - 1] !== 'characters') { viewHistory.pop(); } if (viewHistory.length > 0) { tg.BackButton.onClick(); } else { showView('characters'); } } 
            else { viewHistory = []; showView('characters'); }


        });
    }

    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetViewInternalId = item.dataset.view.replace('-view', ''); // e.g. characters-view -> characters

            if (views[targetViewInternalId] && currentViewId !== targetViewInternalId) { 
                if (targetViewInternalId === 'characters' || targetViewInternalId === 'settings' || targetViewInternalId === 'createCharacter') { 
                    viewHistory = []; // Treat as main tabs, reset history
                }
                showView(targetViewInternalId);
            }
        });
    });

    // --- INITIAL APP STARTUP ---
    populateCharacters();
    showView('characters'); 

});
