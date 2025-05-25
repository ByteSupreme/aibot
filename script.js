document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    // Set Telegram UI colors to match the app's dark theme
    try {
        tg.setHeaderColor('#0E0F1A'); // Matches your app-header-bg
        tg.setBackgroundColor('#0E0F1A'); // Matches your app-bg-main
    } catch (e) {
        console.error("Error setting Telegram theme colors:", e);
        // This might fail if tg is not fully initialized or in non-TG environment
    }


    // --- Global State & View Management ---
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
    const mainFooter = document.getElementById('app-main-footer');
    const bottomNavBar = document.getElementById('bottom-nav-bar');

    let viewHistory = [];
    let currentViewId = 'characters'; // Initial view, root of navigation

    // Telegram Back Button Handler
    tg.BackButton.onClick(() => {
        if (viewHistory.length > 0) {
            const previousViewId = viewHistory.pop();
            showView(previousViewId, true); // true indicates it's a 'back' navigation
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
        
        tg.expand(); // Ensure full height on view change
        window.scrollTo(0, 0); // Scroll to top on view change
    }

    function updateHeaderContent(viewId) {
        gemBarContainer.innerHTML = '';
        mainFooter.style.display = 'none';
        bottomNavBar.style.display = 'none';

        const commonGemBarHTML = `
            <div class="gem-bar">
                <span class="gem-icon">💎</span>
                <span class="gem-count">0</span> <!-- This would be dynamic -->
                <span class="energy-icon">⚡️</span>
                <span class="energy-status">100/100</span> <!-- This would be dynamic -->
                <button class="plus-btn" id="gem-bar-plus-btn">➕</button>
            </div>`;

        // Set the main screen title in your HTML view, not in the header.
        // headerTitleTextEl.textContent = document.querySelector(`#${viewId} .screen-main-title`).textContent;

        // Update the title displayed in Telegram's Mini App header bar (if supported by version)
        // This is a good practice as it makes the native back button more contextual
        let titleForTelegramHeader = "Lucid Dreams"; // Default
        const currentScreenTitleEl = document.querySelector(`#${viewId} > .screen-main-title`);
        if (currentScreenTitleEl) {
            titleForTelegramHeader = currentScreenTitleEl.textContent;
        }
        tg.MainButton.setText(titleForTelegramHeader); // Not for title, but shows how MainButton can be used
                                                    // There isn't a direct API to set Telegram's header title *text* via JS.
                                                    // The title often reflects the bot's name or Mini App name.
                                                    // The WebApp's internal <title> tag is what you control.

        // Update your own header title:
        headerTitleTextEl.textContent = titleForTelegramHeader;


        if (viewId === 'characters') {
            gemBarContainer.innerHTML = commonGemBarHTML;
            mainFooter.style.display = 'block';
        } else if (viewId === 'settings') {
            gemBarContainer.innerHTML = commonGemBarHTML;
            bottomNavBar.style.display = 'flex';
            document.querySelectorAll('.bottom-nav-item').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === viewId);
            });
        } else if (viewId === 'plan') {
            // No gem bar in header for plan screen as per design
        } else if (viewId === 'paymentSubscription' || viewId === 'paymentGems') {
            // No gem bar in header
        } else if (viewId === 'language') {
            // No gem bar in header
        } else if (viewId === 'store') {
            gemBarContainer.innerHTML = commonGemBarHTML;
        }

        const plusButton = document.getElementById('gem-bar-plus-btn');
        if(plusButton) {
            plusButton.onclick = () => showView('store');
        }
    }
    
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
                const personaIdToSend = this.dataset.personaId;
                console.log("Selected Persona ID:", personaIdToSend);
                // tg.sendData(JSON.stringify({ selected_persona_id: personaIdToSend }));
                // Consider if tg.close() is desired after selection
            });
            characterGrid.appendChild(card);
        });
    }
    
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

            if (label.classList.contains('realistic')) {
                styleImages.realistic.classList.add('active');
                styleImages.anime.classList.remove('active');
            } else {
                styleImages.anime.classList.add('active');
                styleImages.realistic.classList.remove('active');
            }
        });
    });

    const planOptions = document.querySelectorAll('.plan-option');
    planOptions.forEach(option => {
        option.addEventListener('click', () => {
            planOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('.radio-custom').classList.remove('checked');
            });
            option.classList.add('selected');
            option.querySelector('.radio-custom').classList.add('checked');
            const selectedPlanGems = option.querySelector('.plan-gems').textContent;
            const featuresList = document.querySelector('#plan-view .plan-features');
            if(featuresList && featuresList.children[1]) {
                 featuresList.children[1].innerHTML = `💎 ${selectedPlanGems.trim().split(' ')[0].replace('+','')} gems for shopping`;
            }
        });
    });
    document.getElementById('plan-upgrade-btn').addEventListener('click', () => showView('paymentSubscription'));

    document.getElementById('payment-sub-confirm-btn').addEventListener('click', () => {
        tg.showAlert("Subscription upgrade initiated (simulated)!");
        // Navigate to a suitable view, perhaps clear history to this point
        viewHistory = []; // Reset history if this is a "final" action for a flow
        showView('characters'); 
    });

    const languageOptions = document.querySelectorAll('.language-option');
    // Set initial selected language (e.g., English) if needed for display
    const currentLangSettingEl = document.querySelector('#settings-language-btn span:first-child');
    const initiallySelectedLang = Array.from(languageOptions).find(opt => opt.classList.contains('selected'));
    if (initiallySelectedLang && currentLangSettingEl) {
         currentLangSettingEl.textContent = initiallySelectedLang.childNodes[0].nodeValue.trim();
    } else if (languageOptions.length > 0 && currentLangSettingEl) { // Default to first if none selected
        languageOptions[0].classList.add('selected');
        languageOptions[0].querySelector('.radio-custom').classList.add('checked');
        currentLangSettingEl.textContent = languageOptions[0].childNodes[0].nodeValue.trim();
    }


    languageOptions.forEach(option => {
        option.addEventListener('click', () => {
            languageOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('.radio-custom').classList.remove('checked');
            });
            option.classList.add('selected');
            option.querySelector('.radio-custom').classList.add('checked');
            const selectedLang = option.dataset.lang;
            console.log("Language selected:", selectedLang);
            currentLangSettingEl.textContent = option.childNodes[0].nodeValue.trim();
            
            if (viewHistory.length > 0) {
                 tg.BackButton.onClick(); // Simulate a back button press
            } else {
                showView('settings', true); // Fallback
            }
        });
    });

    const storeGemPacks = document.querySelectorAll('.store-gem-pack');
    storeGemPacks.forEach(pack => {
        pack.addEventListener('click', () => {
            // Here you could store which pack was clicked to show details on paymentGems view
            // For now, it just navigates.
            // Example: document.querySelector('#payment-gems-view .payment-plan-details').textContent = pack.querySelector('h4').textContent;
            showView('paymentGems');
        });
    });
     document.querySelector('.recharge-button').addEventListener('click', () => {
        tg.showAlert("Energy recharge initiated (simulated)!");
    });

    document.getElementById('payment-gems-confirm-btn').addEventListener('click', () => {
        tg.showAlert("Gem purchase initiated (simulated)!");
        viewHistory = viewHistory.filter(v => v !== 'paymentGems'); // Remove current view from history before going back
        if (viewHistory.length > 0 && viewHistory.includes('store')) { // Prefer going back to store
            tg.BackButton.onClick();
        } else {
            showView('store', true); // Fallback if store is not in history
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
                // If switching main tabs, reset history to that tab as new root
                if (targetView === 'characters' || targetView === 'settings') { // Assuming these are "root" tabs
                    viewHistory = []; 
                }
                showView(targetView);
            }
        });
    });

    populateCharacters();
    showView('characters'); 

});
