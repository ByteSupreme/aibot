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
        plan: document.getElementById('plan-view'),
        paymentSubscription: document.getElementById('payment-subscription-view'),
        language: document.getElementById('language-view'),
        store: document.getElementById('store-view'),
        paymentGems: document.getElementById('payment-gems-view')
    };

    const headerTitleTextEl = document.getElementById('header-title-text');
    const gemBarContainer = document.getElementById('header-gem-bar-container');
    const bottomNavBar = document.getElementById('bottom-nav-bar');
    // Footer element is removed, no need for mainFooter variable

    let viewHistory = [];
    let currentViewId = 'characters'; 
    let selectedPlanData = { // To store data from selected plan for subscription payment
        name: "1 Year", // Default, will be updated
        gemsBonus: 210, // Default
        priceStars: 2250 // Default
    }; 
    let selectedGemPackData = { // To store data for selected gem pack
        gems: "5000",
        priceStars: "8750",
        imageSrc: "https://placehold.co/80x80/4FC3F7/FFFFFF/png?text=GemsL&font=roboto"
    };


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

    function showView(viewId, isBack = false) {
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
        updateHeaderContent(viewId); 
        updateTelegramBackButton(); 
        
        tg.expand();
        window.scrollTo(0, 0);

        // Update specific views if they are being shown
        if (viewId === 'payment-subscription-view') {
            updatePaymentSubscriptionView();
        }
        if (viewId === 'payment-gems-view') {
            updatePaymentGemsView();
        }
    }

    function updateHeaderContent(viewId) {
        gemBarContainer.innerHTML = ''; // Clear by default
        bottomNavBar.style.display = 'none'; // Hide by default
        // mainFooter.style.display = 'none'; // Footer removed

        const commonGemBarHTML = `
            <div class="gem-bar">
                <span class="gem-icon">💎</span>
                <span class="gem-count" id="user-gem-count">0</span> 
                <span class="energy-icon">⚡️</span>
                <span class="energy-status" id="user-energy-status">100/100</span>
                <button class="plus-btn" id="gem-bar-plus-btn">➕</button>
            </div>`;
        
        // Set the title in your custom header bar
        let titleForWebAppHeader = "Characters"; // Default
        const currentScreenTitleEl = document.querySelector(`#${viewId} > .screen-main-title`);
        if (currentScreenTitleEl) {
            titleForWebAppHeader = currentScreenTitleEl.textContent;
        }
        headerTitleTextEl.textContent = titleForWebAppHeader;


        if (viewId === 'characters' || viewId === 'settings' || viewId === 'store') {
            gemBarContainer.innerHTML = commonGemBarHTML;
             // Add event listener for the dynamically added plus button
            const plusButton = document.getElementById('gem-bar-plus-btn');
            if(plusButton) {
                plusButton.onclick = () => showView('store');
            }
        }

        if (viewId === 'characters') {
            // No specific footer, it was removed
        } else if (viewId === 'settings') {
            bottomNavBar.style.display = 'flex';
            document.querySelectorAll('.bottom-nav-item').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === viewId);
            });
        } 
        // Other views like plan, payment, language don't have the gem bar in the header
    }
    
    const charactersData = [ /* ... as before ... */ ]; // Truncated for brevity, use your full data
        { id_to_send: "jane", display_name: "Jane", description: "Flirtatious traditional girl.", image_url: "https://placehold.co/300x400/332E45/E0E0E0/png?text=Jane&font=roboto" },
        { id_to_send: "mrsgrace", display_name: "Mrs. Grace", description: "Caring and charming MILF.", image_url: "https://placehold.co/300x400/2A203C/E0E0E0/png?text=Mrs.+Grace&font=roboto" },
        { id_to_send: "sakura", display_name: "Sakura", description: "Japanese secret agent.", image_url: "https://placehold.co/300x400/3A2F4B/E0E0E0/png?text=Sakura&font=roboto", icon: "❤️" },
        { id_to_send: "nya", display_name: "Nya", description: "Playful, mischievous, and affectionate cat girl.", image_url: "https://placehold.co/300x400/2D2542/E0E0E0/png?text=Nya&font=roboto", selected: true, special_decoration: "paws" }
    ];
    const characterGrid = document.getElementById('character-grid');
    let selectedCharacterCard = null;

    function populateCharacters() { /* ... as before ... */
        characterGrid.innerHTML = ''; 
        charactersData.forEach(charData => {
            const card = document.createElement('div');
            card.classList.add('character-card');
            card.dataset.personaId = charData.id_to_send;
            card.dataset.displayName = charData.display_name;
            const imageContainer = document.createElement('div');
            imageContainer.classList.add('character-image-container');
            const img = document.createElement('img');
            img.classList.add('character-image');
            img.src = charData.image_url;
            img.alt = charData.display_name;
            imageContainer.appendChild(img);
            if (charData.special_decoration === "paws") {
                const pawOverlay = document.createElement('div');
                pawOverlay.classList.add('paw-print-overlay');
                const pawPositions = [ { top: '8%', left: '10%', transform: 'rotate(-20deg)', class: 'p1' }, { top: '15%', right: '8%', transform: 'rotate(25deg)', class: 'p2' }, { top: '60%', left: '15%', transform: 'rotate(10deg)', class: 'p3' }, { top: '70%', right: '20%', transform: 'rotate(-10deg)', class: 'p4' } ];
                pawPositions.forEach(pos => { const paw = document.createElement('span'); paw.classList.add('paw-print', pos.class); paw.style.top = pos.top; if(pos.left) paw.style.left = pos.left; if(pos.right) paw.style.right = pos.right; paw.style.transform = pos.transform; paw.textContent = '🐾'; pawOverlay.appendChild(paw); });
                imageContainer.appendChild(pawOverlay);
            }
            card.appendChild(imageContainer);
            const info = document.createElement('div');
            info.classList.add('character-info');
            const nameHeader = document.createElement('h3');
            nameHeader.classList.add('character-name');
            nameHeader.textContent = charData.display_name;
            if (charData.icon) { const iconSpan = document.createElement('span'); iconSpan.classList.add('card-icon'); iconSpan.textContent = charData.icon; nameHeader.appendChild(iconSpan); }
            const desc = document.createElement('p'); desc.classList.add('character-description'); desc.textContent = charData.description;
            info.appendChild(nameHeader); info.appendChild(desc); card.appendChild(info);
            if (charData.selected) { card.classList.add('selected'); selectedCharacterCard = card; }
            card.addEventListener('click', function () {
                if (selectedCharacterCard) { selectedCharacterCard.classList.remove('selected'); }
                this.classList.add('selected'); selectedCharacterCard = this;
                // const personaIdToSend = this.dataset.personaId; console.log("Selected Persona ID:", personaIdToSend);
            });
            characterGrid.appendChild(card);
        });
    }
    
    document.getElementById('settings-upgrade-plan-btn').addEventListener('click', () => showView('plan'));
    document.getElementById('settings-language-btn').addEventListener('click', () => showView('language'));
    
    const styleLabels = document.querySelectorAll('.style-label');
    const styleImages = { /* ... as before ... */ }; // Truncated
    styleLabels.forEach(label => { /* ... as before ... */ }); // Truncated

    const planOptions = document.querySelectorAll('.plan-option');
    planOptions.forEach(option => {
        option.addEventListener('click', () => {
            planOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('.radio-custom').classList.remove('checked');
            });
            option.classList.add('selected');
            option.querySelector('.radio-custom').classList.add('checked');
            
            // Update selectedPlanData
            selectedPlanData.name = option.querySelector('.plan-title').childNodes[0].nodeValue.trim(); // Gets "1 Month", "3 Months" etc.
            selectedPlanData.gemsBonus = parseInt(option.dataset.gemsBonus);
            
            // Example prices for subscription, replace with actual logic
            if (option.dataset.plan === "1month") selectedPlanData.priceStars = 2250/3; // Example logic
            else if (option.dataset.plan === "3months") selectedPlanData.priceStars = 2250*2/3; // Example logic
            else if (option.dataset.plan === "1year") selectedPlanData.priceStars = 2250; // Example logic
            
            const planFeatureGemsEl = document.getElementById('plan-feature-gems');
            if (planFeatureGemsEl) {
                planFeatureGemsEl.innerHTML = `💎 ${selectedPlanData.gemsBonus} gems for shopping`;
            }
        });
    });
     // Set initial selected plan data based on default HTML selection
    const initialSelectedPlan = document.querySelector('.plan-option.selected');
    if (initialSelectedPlan) {
        selectedPlanData.name = initialSelectedPlan.querySelector('.plan-title').childNodes[0].nodeValue.trim();
        selectedPlanData.gemsBonus = parseInt(initialSelectedPlan.dataset.gemsBonus);
         // Set default price (example based on 1 year)
        if (initialSelectedPlan.dataset.plan === "1year") selectedPlanData.priceStars = 2250;
        else if (initialSelectedPlan.dataset.plan === "3months") selectedPlanData.priceStars = 1500; // example
        else if (initialSelectedPlan.dataset.plan === "1month") selectedPlanData.priceStars = 750; // example

        const planFeatureGemsEl = document.getElementById('plan-feature-gems');
            if (planFeatureGemsEl) {
                planFeatureGemsEl.innerHTML = `💎 ${selectedPlanData.gemsBonus} gems for shopping`;
            }
    }

    document.getElementById('plan-upgrade-btn').addEventListener('click', () => {
        showView('payment-subscription-view');
    });

    function updatePaymentSubscriptionView() {
        document.getElementById('payment-sub-plan-details').innerHTML = `${selectedPlanData.name} + ${selectedPlanData.gemsBonus} 💎`;
        document.getElementById('payment-sub-total').innerHTML = `${selectedPlanData.priceStars} <span class="telegram-star">⭐</span>`;
    }


    document.getElementById('payment-sub-confirm-btn').addEventListener('click', () => {
        tg.showAlert(`Subscription for ${selectedPlanData.name} initiated (simulated)!`);
        viewHistory = []; 
        showView('characters'); 
    });

    const languageOptions = document.querySelectorAll('.language-option');
    const currentLangDisplayEl = document.getElementById('current-language-display');
    
    const initialSelectedLang = document.querySelector('#language-view .language-option.selected');
    if(initialSelectedLang && currentLangDisplayEl) {
        currentLangDisplayEl.textContent = initialSelectedLang.childNodes[0].nodeValue.trim();
    }

    languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            languageOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('.radio-custom').classList.remove('checked');
            });
            option.classList.add('selected');
            option.querySelector('.radio-custom').classList.add('checked');
            currentLangDisplayEl.textContent = option.childNodes[0].nodeValue.trim();
            
            if (viewHistory.length > 0) {
                 tg.BackButton.onClick();
            } else {
                showView('settings', true);
            }
        });
    });

    const storeGemPacks = document.querySelectorAll('.store-gem-pack');
    storeGemPacks.forEach(pack => {
        pack.addEventListener('click', () => {
            selectedGemPackData.gems = pack.dataset.gems;
            selectedGemPackData.priceStars = pack.dataset.priceStars;
            selectedGemPackData.imageSrc = pack.querySelector('img').src; 
            showView('payment-gems-view');
        });
    });

    function updatePaymentGemsView() {
        document.getElementById('payment-gem-pack-image').src = selectedGemPackData.imageSrc;
        document.getElementById('payment-gem-pack-details').textContent = `${selectedGemPackData.gems} Gems`;
        document.getElementById('payment-gem-pack-total').innerHTML = `${selectedGemPackData.priceStars} <span class="telegram-star">⭐</span>`;
    }

     document.querySelector('.recharge-button').addEventListener('click', () => {
        tg.showAlert("Energy recharge initiated (simulated)!");
    });

    document.getElementById('payment-gems-confirm-btn').addEventListener('click', () => {
        tg.showAlert(`${selectedGemPackData.gems} Gems purchase initiated (simulated)!`);
        viewHistory = viewHistory.filter(v => v !== 'paymentGems'); 
        if (viewHistory.length > 0 && viewHistory.includes('store')) {
            const storeIndex = viewHistory.lastIndexOf('store');
            viewHistory = viewHistory.slice(0, storeIndex + 1); // Go back to the last store instance
            tg.BackButton.onClick(); 
        } else {
            showView('store', true); 
        }
    });

    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.dataset.view;
            if (targetView === 'stories-view') { tg.showAlert("Stories coming soon!"); return; }
            if (views[targetView] && currentViewId !== targetView) {
                if (targetView === 'characters' || targetView === 'settings') { 
                    viewHistory = []; 
                }
                showView(targetView);
            }
        });
    });

    populateCharacters();
    showView('characters'); 
});
