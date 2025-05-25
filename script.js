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

    const gemBarContainerOuter = document.getElementById('gem-bar-container-outer'); // Updated Gem Bar container
    const bottomNavBar = document.getElementById('bottom-nav-bar');

    let viewHistory = [];
    let currentViewId = 'characters'; 

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
        updateStickyHeaderAndNav(viewId, params); // Updated function name
        updateTelegramBackButton(); 
        
        tg.expand();
        window.scrollTo(0, 0);
    }

    function updateStickyHeaderAndNav(viewId, params = {}) { // Renamed and simplified
        gemBarContainerOuter.innerHTML = ''; // Clear gem bar container
        bottomNavBar.style.display = 'none';

        const commonGemBarHTML = `
            <div class="gem-bar">
                <span class="gem-icon">💎</span>
                <span class="gem-count">0</span>
                <span class="energy-icon">⚡️</span>
                <span class="energy-status">100/100</span>
                <button class="plus-btn" id="gem-bar-plus-btn">➕</button>
            </div>`;

        // Logic for showing Gem Bar in the sticky header
        if (viewId === 'characters' || viewId === 'settings' || viewId === 'store') {
            gemBarContainerOuter.innerHTML = commonGemBarHTML;
            const plusButton = document.getElementById('gem-bar-plus-btn');
            if(plusButton) {
                plusButton.onclick = () => showView('store');
            }
        }

        // Logic for bottom navigation
        if (viewId === 'settings') { // Only show bottom nav on settings, can be expanded
            bottomNavBar.style.display = 'flex';
            document.querySelectorAll('.bottom-nav-item').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === viewId);
            });
        }
        
        // Update payment screens with dynamic data if params are passed
        if (viewId === 'paymentGems' && params.gems && params.stars) {
            document.getElementById('payment-gems-pack-details').textContent = `${params.gems} Gems`;
            document.getElementById('payment-gems-total-stars').innerHTML = 
                `${params.stars} <span class="telegram-star">⭐</span>`;
        }
        if (viewId === 'paymentSubscription' && params.planDetails && params.stars) {
            document.getElementById('payment-sub-plan-details').textContent = params.planDetails;
            document.getElementById('payment-sub-total-stars').innerHTML =
                `${params.stars} <span class="telegram-star">⭐</span>`;
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
                const pawPositions = [
                    { top: '8%', left: '10%', transform: 'rotate(-20deg)', class: 'p1' },
                    { top: '15%', right: '8%', transform: 'rotate(25deg)', class: 'p2' },
                    { top: '60%', left: '15%', transform: 'rotate(10deg)', class: 'p3' },
                    { top: '70%', right: '20%', transform: 'rotate(-10deg)', class: 'p4' }
                ];
                pawPositions.forEach(pos => {
                    const paw = document.createElement('span');
                    paw.classList.add('paw-print', pos.class);
                    paw.style.top = pos.top;
                    if(pos.left) paw.style.left = pos.left;
                    if(pos.right) paw.style.right = pos.right;
                    paw.style.transform = pos.transform;
                    paw.textContent = '🐾';
                    pawOverlay.appendChild(paw);
                });
                imageContainer.appendChild(pawOverlay);
            }
            card.appendChild(imageContainer);
            const info = document.createElement('div');
            info.classList.add('character-info');
            const nameHeader = document.createElement('h3');
            nameHeader.classList.add('character-name');
            nameHeader.textContent = charData.display_name;
            if (charData.icon) {
                const iconSpan = document.createElement('span');
                iconSpan.classList.add('card-icon');
                iconSpan.textContent = charData.icon;
                nameHeader.appendChild(iconSpan);
            }
            const desc = document.createElement('p');
            desc.classList.add('character-description');
            desc.textContent = charData.description;
            info.appendChild(nameHeader);
            info.appendChild(desc);
            card.appendChild(info);
            if (charData.selected) {
                card.classList.add('selected');
                selectedCharacterCard = card;
            }
            card.addEventListener('click', function () {
                if (selectedCharacterCard) {
                    selectedCharacterCard.classList.remove('selected');
                }
                this.classList.add('selected');
                selectedCharacterCard = this;
                console.log("Selected Persona ID:", this.dataset.personaId);
            });
            characterGrid.appendChild(card);
        });
    }
    
    // --- EVENT LISTENERS FOR NAVIGATION AND INTERACTIONS ---
    document.getElementById('settings-upgrade-plan-btn').addEventListener('click', () => showView('plan'));
    document.getElementById('settings-language-btn').addEventListener('click', () => showView('language'));
    
    const styleLabels = document.querySelectorAll('.style-label');
    const styleImages = {
        realistic: document.getElementById('style-realistic'),
        anime: document.getElementById('style-anime')
    };
    styleLabels.forEach(label => {
        label.addEventListener('click', () => {
            styleLabels.forEach(lbl => lbl.classList.remove('active'));
            label.classList.add('active');
            styleLabels.forEach(lbl => lbl.querySelector('.checkbox-custom').classList.remove('checked'));
            label.querySelector('.checkbox-custom').classList.add('checked');
            styleImages.realistic.classList.toggle('active', label.classList.contains('realistic'));
            styleImages.anime.classList.toggle('active', label.classList.contains('anime'));
        });
    });

    const planOptions = document.querySelectorAll('.plan-option');
    const planFeatureGemsEl = document.getElementById('plan-feature-gems');
    const paymentSubPlanDetailsEl = document.getElementById('payment-sub-plan-details');
    const paymentSubTotalStarsEl = document.getElementById('payment-sub-total-stars');

    // Dummy Star conversion (replace with actual logic or API if Telegram provides it for Stars)
    const planStarPrices = {
        "1month": 375, // Example: $7.50
        "3months": 750, // Example: $15.00
        "1year": 2250  // Example: $45.00
    };

    planOptions.forEach(option => {
        option.addEventListener('click', () => {
            planOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('.radio-custom').classList.remove('checked');
            });
            option.classList.add('selected');
            option.querySelector('.radio-custom').classList.add('checked');
            
            const planGemsText = option.querySelector('.plan-gems').textContent; // e.g., "+30 💎"
            const planType = option.dataset.plan;
            if (planFeatureGemsEl) {
                 planFeatureGemsEl.innerHTML = `💎 ${planGemsText.split(' ')[0].replace('+','')} gems for shopping`;
            }
        });
    });

    document.getElementById('plan-upgrade-btn').addEventListener('click', () => {
        const selectedPlan = document.querySelector('.plan-option.selected');
        if (selectedPlan) {
            const planTitle = selectedPlan.querySelector('.plan-title').textContent;
            const planType = selectedPlan.dataset.plan;
            const stars = planStarPrices[planType] || 0; // Get stars for the selected plan
            showView('paymentSubscription', false, { planDetails: planTitle, stars: stars });
        } else {
            tg.showAlert("Please select a plan first.");
        }
    });

    document.getElementById('payment-sub-confirm-btn').addEventListener('click', () => {
        tg.showAlert("Subscription upgrade initiated (simulated)!");
        viewHistory = []; 
        showView('characters'); 
    });

    const languageOptions = document.querySelectorAll('.language-option');
    const currentLangDisplayEl = document.getElementById('current-language-display');
    
    // Set initial language state (example: English selected by default)
    const defaultLang = 'en';
    languageOptions.forEach(opt => {
        const isSelected = opt.dataset.lang === defaultLang;
        opt.classList.toggle('selected', isSelected);
        opt.querySelector('.radio-custom').classList.toggle('checked', isSelected);
        if (isSelected && currentLangDisplayEl) {
            currentLangDisplayEl.textContent = opt.childNodes[0].nodeValue.trim();
        }
    });

    languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            languageOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('.radio-custom').classList.remove('checked');
            });
            option.classList.add('selected');
            option.querySelector('.radio-custom').classList.add('checked');
            if (currentLangDisplayEl) {
                currentLangDisplayEl.textContent = option.childNodes[0].nodeValue.trim();
            }
            console.log("Language selected:", option.dataset.lang);
            
            if (viewHistory.length > 0) { // Go back if history exists
                 tg.BackButton.onClick(); 
            } else {
                showView('settings', true); 
            }
        });
    });

    const storeGemPacks = document.querySelectorAll('.store-gem-pack');
    storeGemPacks.forEach(pack => {
        pack.addEventListener('click', () => {
            const gems = pack.dataset.gems;
            const stars = pack.dataset.stars;
            showView('paymentGems', false, { gems, stars });
        });
    });
     document.querySelector('.recharge-button').addEventListener('click', () => {
        tg.showAlert("Energy recharge initiated (simulated)!");
    });

    document.getElementById('payment-gems-confirm-btn').addEventListener('click', () => {
        tg.showAlert("Gem purchase initiated (simulated)!");
        // Navigate back smartly
        if (viewHistory.includes('store')) {
            while(viewHistory.length > 0 && viewHistory[viewHistory.length-1] !== 'store') {
                viewHistory.pop(); // Remove intermediate screens if any
            }
            tg.BackButton.onClick(); // This will take to 'store' if it's the last one
        } else {
             viewHistory = []; // Reset history
            showView('characters'); // Fallback to characters
        }
    });

    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.dataset.view;
            if (targetView === 'stories-view') {
                tg.showAlert("Stories coming soon!");
                return;
            }
            if (views[targetView] && currentViewId !== targetView) {
                if (targetView === 'characters' || targetView === 'settings') { 
                    viewHistory = []; 
                }
                showView(targetView);
            }
        });
    });

    // --- INITIAL APP STARTUP ---
    populateCharacters();
    showView('characters'); 

});
