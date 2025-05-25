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
        rechargeEnergy: document.getElementById('recharge-energy-view'), // New view for recharge
        plan: document.getElementById('plan-view'),
        paymentSubscription: document.getElementById('payment-subscription-view'),
        language: document.getElementById('language-view'),
        store: document.getElementById('store-view'),
        paymentItem: document.getElementById('payment-item-view') // Unified payment screen
    };

    const gemBarContainerOuter = document.getElementById('gem-bar-container-outer');
    const bottomNavBar = document.getElementById('bottom-nav-bar');
    const energyAmountInput = document.getElementById('energy-amount');
    const estimatedEnergyStarsEl = document.getElementById('estimated-energy-stars');

    let viewHistory = [];
    let currentViewId = 'characters'; 
    let selectedLanguage = 'en'; 
    const ENERGY_PER_STAR_RATE = 0.5; // Example: 0.5 energy per star (or 2 stars per energy)


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

        const viewsWithGemBar = ['characters', 'settings', 'store', 'createCharacter', 'rechargeEnergy'];
        if (viewsWithGemBar.includes(viewId)) {
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
                // Map HTML data-view to internal JS viewId for comparison
                const btnInternalViewId = btnDataView.replace(/-/g, '').replace('view', ''); // characters-view -> characters
                let isActive = (currentViewId.toLowerCase() === btnInternalViewId.toLowerCase());
                btn.classList.toggle('active', isActive);
            });
        } else {
            bottomNavBar.style.display = 'none';
        }
        
        const paymentItemAvatar = document.getElementById('payment-item-avatar');
        const paymentItemPurchaseTitle = document.getElementById('payment-item-purchase-title');
        const paymentItemDetails = document.getElementById('payment-item-details');
        const paymentItemTotalStars = document.getElementById('payment-item-total-stars');

        if (viewId === 'paymentItem') { 
            if (params.type === 'energy') {
                paymentItemPurchaseTitle.textContent = 'Recharging Energy';
                paymentItemDetails.textContent = `${params.amount} Energy`;
                if(paymentItemAvatar) paymentItemAvatar.src = 'https://placehold.co/80x80/FFD700/333333/png?text=⚡&font=roboto';
            } else if (params.type === 'gems') { 
                paymentItemPurchaseTitle.textContent = 'Purchasing a pack';
                paymentItemDetails.textContent = `${params.gems} Gems`;
                 if(paymentItemAvatar) paymentItemAvatar.src = 'https://placehold.co/80x80/4FC3F7/FFFFFF/png?text=Gems&font=roboto';
            } else if (params.type === 'characterCreation') {
                paymentItemPurchaseTitle.textContent = 'Creating Character';
                paymentItemDetails.textContent = `New Character: ${params.characterName}`;
                if(paymentItemAvatar) paymentItemAvatar.src = 'https://placehold.co/80x80/D32FDB/FFFFFF/png?text=🧑&font=roboto'; // Generic user icon
            }
            paymentItemTotalStars.innerHTML = `${params.stars} <span class="telegram-star">⭐</span>`;
        }

        if (viewId === 'paymentSubscription' && params.planDetails && params.stars) {
            document.getElementById('payment-sub-plan-details').textContent = params.planDetails;
            document.getElementById('payment-sub-total-stars').innerHTML = `${params.stars} <span class="telegram-star">⭐</span>`;
        }
    }
    
    // --- CHARACTER DATA AND RENDERING ---
    const charactersData = [
        { id_to_send: "jane", display_name: "Jane", description: "Flirtatious traditional girl.", image_url: "https://placehold.co/300x400/332E45/E0E0E0/png?text=Jane&font=roboto" },
        { id_to_send: "mrsgrace", display_name: "Mrs. Grace", description: "Caring and charming MILF.", image_url: "https://placehold.co/300x400/2A203C/E0E0E0/png?text=Mrs.+Grace&font=roboto" },
        { id_to_send: "sakura", display_name: "Sakura", description: "Japanese secret agent.", image_url: "https://placehold.co/300x400/3A2F4B/E0E0E0/png?text=Sakura&font=roboto", icon: "❤️" },
        { id_to_send: "nya", display_name: "Nya", description: "Playful, mischievous, and affectionate cat girl.", image_url: "https://placehold.co/300x400/2D2542/E0E0E0/png?text=Nya&font=roboto", selected: true, special_decoration: "paws" }
    ];
    const characterGrid = document.getElementById('character-grid');
    let selectedCharacterCard = null;

    function populateCharacters() {
        characterGrid.innerHTML = ''; 
        charactersData.forEach(charData => {
            const card = document.createElement('div'); card.classList.add('character-card'); card.dataset.personaId = charData.id_to_send; card.dataset.displayName = charData.display_name;
            const imageContainer = document.createElement('div'); imageContainer.classList.add('character-image-container');
            const img = document.createElement('img'); img.classList.add('character-image'); img.src = charData.image_url; img.alt = charData.display_name; imageContainer.appendChild(img);
            if (charData.special_decoration === "paws") { const pawOverlay = document.createElement('div'); pawOverlay.classList.add('paw-print-overlay'); const pawPositions = [ { top: '8%', left: '10%', transform: 'rotate(-20deg)', class: 'p1' }, { top: '15%', right: '8%', transform: 'rotate(25deg)', class: 'p2' }, { top: '60%', left: '15%', transform: 'rotate(10deg)', class: 'p3' }, { top: '70%', right: '20%', transform: 'rotate(-10deg)', class: 'p4' } ]; pawPositions.forEach(pos => { const paw = document.createElement('span'); paw.classList.add('paw-print', pos.class); paw.style.top = pos.top; if(pos.left) paw.style.left = pos.left; if(pos.right) paw.style.right = pos.right; paw.style.transform = pos.transform; paw.textContent = '🐾'; pawOverlay.appendChild(paw); }); imageContainer.appendChild(pawOverlay); }
            card.appendChild(imageContainer);
            const info = document.createElement('div'); info.classList.add('character-info');
            const nameHeader = document.createElement('h3'); nameHeader.classList.add('character-name'); nameHeader.textContent = charData.display_name;
            if (charData.icon) { const iconSpan = document.createElement('span'); iconSpan.classList.add('card-icon'); iconSpan.textContent = charData.icon; nameHeader.appendChild(iconSpan); }
            const desc = document.createElement('p'); desc.classList.add('character-description'); desc.textContent = charData.description;
            info.appendChild(nameHeader); info.appendChild(desc); card.appendChild(info);
            if (charData.selected) { card.classList.add('selected'); selectedCharacterCard = card; }
            card.addEventListener('click', function () { if (selectedCharacterCard) { selectedCharacterCard.classList.remove('selected'); } this.classList.add('selected'); selectedCharacterCard = this; console.log("Selected Persona ID:", this.dataset.personaId); });
            characterGrid.appendChild(card);
        });
    }
    
    // --- EVENT LISTENERS ---
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
    const initialSelectedPlan = document.querySelector('.plan-option.selected');
    if (initialSelectedPlan && planFeatureGemsAmountEl) {
        planFeatureGemsAmountEl.textContent = initialSelectedPlan.dataset.gemsBonus;
    }

    document.getElementById('plan-upgrade-btn').addEventListener('click', () => {
        const selectedPlan = document.querySelector('.plan-option.selected');
        if (selectedPlan) {
            const planTitle = selectedPlan.querySelector('.plan-title').textContent.replace(/<span.*?<\/span>/g, '').trim(); // Get text only
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
        if (isSelected && currentLangDisplayEl) { currentLangDisplayEl.textContent = opt.dataset.langName; }
    });
    languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            languageOptions.forEach(opt => { opt.classList.remove('selected'); opt.querySelector('.radio-custom').classList.remove('checked'); });
            option.classList.add('selected'); option.querySelector('.radio-custom').classList.add('checked');
            selectedLanguage = option.dataset.lang;
            if (currentLangDisplayEl) { currentLangDisplayEl.textContent = option.dataset.langName; }
            console.log("Language selected:", selectedLanguage);
            if (viewHistory.length > 0) { tg.BackButton.onClick(); } else { showView('settings', true); }
        });
    });

    const storeGemPacks = document.querySelectorAll('.store-gem-pack');
    storeGemPacks.forEach(pack => {
        pack.addEventListener('click', () => {
            const gems = pack.dataset.gems; const stars = pack.dataset.stars;
            showView('paymentItem', false, { type: 'gems', gems, stars });
        });
    });
    
    // Recharge Energy Button in Store
     document.getElementById('recharge-energy-btn').addEventListener('click', () => {
        showView('rechargeEnergy');
    });

    // Energy Amount Input Listener (in Recharge Energy View)
    if(energyAmountInput && estimatedEnergyStarsEl) {
        energyAmountInput.addEventListener('input', () => {
            const amount = parseInt(energyAmountInput.value) || 0;
            estimatedEnergyStarsEl.textContent = Math.ceil(amount / ENERGY_PER_STAR_RATE);
        });
         // Initialize
        estimatedEnergyStarsEl.textContent = Math.ceil(parseInt(energyAmountInput.value) / ENERGY_PER_STAR_RATE);
    }

    // Confirm Recharge Button (in Recharge Energy View)
    const confirmRechargeBtn = document.getElementById('confirm-recharge-btn');
    if(confirmRechargeBtn) {
        confirmRechargeBtn.addEventListener('click', () => {
            const amount = parseInt(energyAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                tg.showAlert("Please enter a valid energy amount.");
                return;
            }
            const starsCost = Math.ceil(amount / ENERGY_PER_STAR_RATE);
            tg.showConfirm(`Recharge ${amount} energy for ${starsCost} Stars?`, (ok) => {
                if (ok) {
                    console.log(`Attempting to recharge ${amount} energy for ${starsCost} stars.`);
                    // Simulate going to payment screen for this energy recharge
                    showView('paymentItem', false, {type: 'energy', amount: amount, stars: starsCost});
                }
            });
        });
    }


    document.getElementById('payment-item-confirm-btn').addEventListener('click', () => { 
        const itemDetails = document.getElementById('payment-item-details').textContent;
        tg.showAlert(`Payment for "${itemDetails}" initiated (simulated)!`);
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
            const creationCost = 15; 

            if (charName.trim() === "" || charDesc.trim() === "") { tg.showAlert("Please enter a name and description."); return; }
            
            tg.showConfirm(`Create character "${charName}" for ${creationCost} Stars?`, (ok) => {
               if (ok) { 
                    console.log("Creating character:", {name: charName, desc: charDesc, image: charImage});
                    tg.showAlert(`Character "${charName}" creation process started for ${creationCost} Stars (simulated)!`);
                    document.getElementById('char-name').value = ''; document.getElementById('char-desc').value = ''; document.getElementById('char-image').value = '';
                    // Smart navigation back
                    if (viewHistory.includes('characters')) {
                         while(viewHistory.length > 0 && viewHistory[viewHistory.length - 1] !== 'characters') { viewHistory.pop(); }
                         if(viewHistory.length > 0 && viewHistory[viewHistory.length - 1] === 'characters') {
                            tg.BackButton.onClick(); // Takes to 'characters' if it was the direct predecessor in this refined history
                         } else {
                            showView('characters', true); // Go to characters and remove createCharacter from history if it was pushed
                         }
                    } else {
                        viewHistory = []; showView('characters');
                    }
               }
            });
        });
    }

    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetViewHtmlId = item.dataset.view; // e.g., characters-view
            let targetInternalViewId = '';
            // Map the data-view from HTML to internal JS view ID
            if (targetViewHtmlId === 'characters-view') targetInternalViewId = 'characters';
            else if (targetViewHtmlId === 'settings-view') targetInternalViewId = 'settings';
            else if (targetViewHtmlId === 'create-character-view') targetInternalViewId = 'createCharacter';
            else { console.warn("Unknown bottom nav item:", targetViewHtmlId); return; }


            if (views[targetInternalViewId] && currentViewId !== targetInternalViewId) { 
                // Treat bottom nav clicks as navigating to a main tab, resetting history for that tab's context
                viewHistory = []; 
                showView(targetInternalViewId);
            }
        });
    });

    // --- INITIAL APP STARTUP ---
    populateCharacters();
    showView('characters'); 

});
