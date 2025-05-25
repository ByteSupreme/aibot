document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

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
    const backBtn = document.getElementById('back-btn');
    const gemBarContainer = document.getElementById('header-gem-bar-container');
    const mainHeaderActions = document.getElementById('header-actions-main');
    const mainFooter = document.getElementById('app-main-footer');
    const bottomNavBar = document.getElementById('bottom-nav-bar');

    let viewHistory = []; // For back button functionality

    function showView(viewId, isBack = false) {
        if (!isBack && currentViewId) {
            viewHistory.push(currentViewId);
        }

        for (const id in views) {
            if (views[id]) {
                views[id].classList.toggle('active-view', id === viewId);
                views[id].style.display = (id === viewId) ? 'flex' : 'none';
            }
        }
        currentViewId = viewId;
        updateHeaderAndFooter(viewId);
        tg.expand();
        window.scrollTo(0, 0); // Scroll to top on view change
    }

    let currentViewId = 'characters'; // Initial view

    function updateHeaderAndFooter(viewId) {
        // Default states
        backBtn.style.display = 'none';
        mainHeaderActions.innerHTML = ''; // Clear actions
        gemBarContainer.innerHTML = ''; // Clear gem bar
        bottomNavBar.style.display = 'none';
        mainFooter.style.display = 'none'; // Hide main @luciddreams footer by default

        // Common Gem Bar HTML (can be refilled if needed)
        const commonGemBarHTML = `
            <div class="gem-bar">
                <span class="gem-icon">💎</span>
                <span class="gem-count">0</span>
                <span class="energy-icon">⚡️</span>
                <span class="energy-status">100/100</span>
                <button class="plus-btn" id="gem-bar-plus-btn">➕</button>
            </div>`;

        if (viewId === 'characters') {
            headerTitleTextEl.textContent = 'Characters';
            mainHeaderActions.innerHTML = `
                <span class="icon-button" id="more-options-btn">⋮</span>
                <span class="icon-button" id="close-main-btn">✕</span>`;
            gemBarContainer.innerHTML = commonGemBarHTML;
            mainFooter.style.display = 'block'; // Show @luciddreams footer
            addCharacterScreenEventListeners();
        } else if (viewId === 'settings') {
            headerTitleTextEl.textContent = 'Settings';
            backBtn.style.display = viewHistory.length > 0 ? 'inline-block' : 'none';
            gemBarContainer.innerHTML = commonGemBarHTML;
            bottomNavBar.style.display = 'flex';
             // Ensure correct nav item is active
            document.querySelectorAll('.bottom-nav-item').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === viewId);
            });
        } else if (viewId === 'plan') {
            headerTitleTextEl.textContent = 'Plan';
            backBtn.style.display = 'inline-block';
        } else if (viewId === 'paymentSubscription' || viewId === 'paymentGems') {
            headerTitleTextEl.textContent = 'Payment Method';
            backBtn.style.display = 'inline-block';
        } else if (viewId === 'language') {
            headerTitleTextEl.textContent = 'Language';
            backBtn.style.display = 'inline-block';
        } else if (viewId === 'store') {
            headerTitleTextEl.textContent = 'Store';
            backBtn.style.display = 'inline-block';
            gemBarContainer.innerHTML = commonGemBarHTML;
        }

        // Add event listener for dynamically added plus button
        const plusButton = document.getElementById('gem-bar-plus-btn');
        if(plusButton) {
            plusButton.addEventListener('click', () => showView('store'));
        }
    }

    backBtn.addEventListener('click', () => {
        if (viewHistory.length > 0) {
            const previousViewId = viewHistory.pop();
            showView(previousViewId, true);
        } else {
            // If no history, maybe go to a default view or close
            // For now, character screen if back from settings is common
            if(currentViewId === 'settings') showView('characters', true);
            else tg.close(); // Or showView('characters');
        }
    });
    
    // --- Character Screen Logic (from user's original script) ---
    const charactersData = [
        { id_to_send: "jane", display_name: "Jane", description: "Flirtatious traditional girl.", image_url: "https://placehold.co/300x400/332E45/E0E0E0/png?text=Jane&font=roboto" },
        { id_to_send: "mrsgrace", display_name: "Mrs. Grace", description: "Caring and charming MILF.", image_url: "https://placehold.co/300x400/2A203C/E0E0E0/png?text=Mrs.+Grace&font=roboto" },
        { id_to_send: "sakura", display_name: "Sakura", description: "Japanese secret agent.", image_url: "https://placehold.co/300x400/3A2F4B/E0E0E0/png?text=Sakura&font=roboto", icon: "❤️" },
        { id_to_send: "nya", display_name: "Nya", description: "Playful, mischievous, and affectionate cat girl.", image_url: "https://placehold.co/300x400/2D2542/E0E0E0/png?text=Nya&font=roboto", selected: true, special_decoration: "paws" }
    ];
    const characterGrid = document.getElementById('character-grid');
    let selectedCharacterCard = null;

    function populateCharacters() {
        characterGrid.innerHTML = ''; // Clear existing
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
                // tg.sendData(JSON.stringify({ selected_persona_id: personaIdToSend }));
                console.log("Selected Persona ID:", personaIdToSend); // For testing
                 // tg.close(); // Optional: close after selection
            });
            characterGrid.appendChild(card);
        });
    }
    
    function addCharacterScreenEventListeners() {
        const moreOptionsBtn = document.getElementById('more-options-btn');
        if (moreOptionsBtn) {
            moreOptionsBtn.onclick = () => tg.showAlert("More options coming soon!");
        }
        const closeMainBtn = document.getElementById('close-main-btn');
        if (closeMainBtn) {
            closeMainBtn.onclick = () => tg.close();
        }
    }

    // --- Settings Screen Logic ---
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


    // --- Plan Screen Logic ---
    const planOptions = document.querySelectorAll('.plan-option');
    planOptions.forEach(option => {
        option.addEventListener('click', () => {
            planOptions.forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('.radio-custom').classList.remove('checked');
            });
            option.classList.add('selected');
            option.querySelector('.radio-custom').classList.add('checked');
            // Update feature list based on selected plan if necessary
            // For now, the list is static. If it changes, update it here.
            // E.g., the "+30 gems" detail for features list can be dynamic
            const selectedPlanGems = option.querySelector('.plan-gems').textContent;
            const featuresList = document.querySelector('#plan-view .plan-features');
            if(featuresList && featuresList.children[1]) {
                 featuresList.children[1].innerHTML = `💎 ${selectedPlanGems.trim().split(' ')[0].replace('+','')} gems for shopping`;
            }
        });
    });
    document.getElementById('plan-upgrade-btn').addEventListener('click', () => showView('paymentSubscription'));

    // --- Payment Subscription Logic ---
    document.getElementById('payment-sub-confirm-btn').addEventListener('click', () => {
        tg.showAlert("Subscription upgrade initiated (simulated)!");
        // Potentially navigate to characters or a success screen
        showView('characters'); 
    });

    // --- Language Screen Logic ---
    const languageOptions = document.querySelectorAll('.language-option');
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
            // Update settings screen text after selection
            document.querySelector('#settings-language-btn span:first-child').textContent = option.childNodes[0].nodeValue.trim();
            // Go back to settings after selection
            if (viewHistory.length > 0) {
                 const previousViewId = viewHistory.pop();
                 showView(previousViewId, true);
            } else {
                showView('settings', true);
            }
        });
    });

    // --- Store Screen Logic ---
    const storeGemPacks = document.querySelectorAll('.store-gem-pack');
    storeGemPacks.forEach(pack => {
        pack.addEventListener('click', () => {
            // TODO: Pass data about which pack was clicked to payment-gems-view
            // For now, just show the generic paymentGems view
            showView('paymentGems');
        });
    });
     document.querySelector('.recharge-button').addEventListener('click', () => {
        tg.showAlert("Energy recharge initiated (simulated)!");
    });

    // --- Payment Gems Logic ---
    document.getElementById('payment-gems-confirm-btn').addEventListener('click', () => {
        tg.showAlert("Gem purchase initiated (simulated)!");
        showView('store'); // Go back to store or characters
    });

    // --- Bottom Nav Bar Logic ---
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.dataset.view;
            if (targetView === 'stories-view') { // Handle dummy view
                tg.showAlert("Stories coming soon!");
                return;
            }
            if (views[targetView]) {
                bottomNavItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                showView(targetView);
            }
        });
    });

    // --- Initial Setup ---
    populateCharacters(); // Populate character grid on load
    showView('characters'); // Show initial view and setup header

});
