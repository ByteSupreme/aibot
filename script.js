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
        usersCharacters: document.getElementById('users-characters-view'),
        myCharacters: document.getElementById('my-characters-view'),
        settings: document.getElementById('settings-view'),
        createCharacter: document.getElementById('create-character-view'),
        editCharacter: document.getElementById('edit-character-view'),
        rechargeEnergy: document.getElementById('recharge-energy-view'),
        plan: document.getElementById('plan-view'),
        paymentSubscription: document.getElementById('payment-subscription-view'),
        language: document.getElementById('language-view'),
        store: document.getElementById('store-view'),
        paymentItem: document.getElementById('payment-item-view')
    };

    const gemBarContainerOuter = document.getElementById('gem-bar-container-outer');
    const bottomNavBar = document.getElementById('bottom-nav-bar');
    const energyAmountInput = document.getElementById('energy-amount');
    const estimatedEnergyStarsEl = document.getElementById('estimated-energy-stars');

    // Users Characters View elements
    const usersCharacterSearchInput = document.getElementById('users-character-search-input');
    const usersCharacterTabs = document.querySelectorAll('#users-characters-view .tab-button');
    const publicCharacterGrid = document.getElementById('public-character-grid');
    const noPublicCharsMsg = document.getElementById('no-public-characters-message');


    let viewHistory = [];
    let currentViewId = 'characters';
    let selectedLanguage = 'en';
    const ENERGY_PER_STAR_RATE = 0.5;
    const CHARACTER_CREATION_COST_GEMS = 15;

    let userCreatedCharacters = []; // { id, name, description, details, image_url, visibility, createdAt (timestamp) }
    let nextUserCharacterId = 1;

    // State for Users Characters View
    let currentUsersCharacterTab = 'featured'; // 'featured' or 'recent'
    let currentUsersCharacterSearchTerm = '';

    function setupSegmentedControl(segmentContainerId) {
        const container = document.getElementById(segmentContainerId);
        if (!container) return;
        const buttons = container.querySelectorAll('.segment-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });
    }
    setupSegmentedControl('char-visibility-segment');
    setupSegmentedControl('edit-char-visibility-segment');

    function getSegmentedControlValue(segmentContainerId) {
        const container = document.getElementById(segmentContainerId);
        if (!container) return 'public';
        const activeButton = container.querySelector('.segment-button.active');
        return activeButton ? activeButton.dataset.value : 'public';
    }

    function setSegmentedControlValue(segmentContainerId, value) {
        const container = document.getElementById(segmentContainerId);
        if (!container) return;
        const buttons = container.querySelectorAll('.segment-button');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.value === value);
        });
    }

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

        if (viewId === 'usersCharacters') {
            // Reset search and set default tab if not already set or if navigating fresh
            if (!isBack || !usersCharacterSearchInput.value) { // Reset search on fresh navigation
                 usersCharacterSearchInput.value = '';
                 currentUsersCharacterSearchTerm = '';
            }
            // Default to 'featured' if no specific tab brought us here
            // currentUsersCharacterTab will persist if user was already on this view and switched tabs
            renderUsersCharacterContent(); // Render with current tab and search
        } else if (viewId === 'myCharacters') {
            populateMyCharacters();
        } else if (viewId === 'editCharacter' && params.charId) {
            loadCharacterForEditing(params.charId);
        }

        tg.expand();
        window.scrollTo(0, 0);
    }

    function updateStickyHeaderAndNav(viewId, params = {}) { /* ... as before ... */
        gemBarContainerOuter.innerHTML = '';

        const commonGemBarHTML = `
            <div class="gem-bar">
                <span class="gem-icon">💎</span>
                <span class="gem-count">0</span>
                <span class="energy-icon">⚡️</span>
                <span class="energy-status">100/100</span>
                <button class="plus-btn" id="gem-bar-plus-btn">➕</button>
            </div>`;

        const viewsWithGemBar = ['characters', 'usersCharacters', 'myCharacters', 'settings', 'store', 'createCharacter', 'editCharacter', 'rechargeEnergy'];
        if (viewsWithGemBar.includes(viewId)) {
            gemBarContainerOuter.innerHTML = commonGemBarHTML;
            const plusButton = document.getElementById('gem-bar-plus-btn');
            if(plusButton) {
                plusButton.onclick = () => showView('store');
            }
        }

        const viewsWithBottomNav = ['characters', 'usersCharacters', 'settings', 'createCharacter'];
        if (viewsWithBottomNav.includes(viewId)) {
            bottomNavBar.style.display = 'flex';
            document.querySelectorAll('.bottom-nav-item').forEach(btn => {
                const btnDataView = btn.dataset.view;
                let btnInternalViewId = '';
                if (btnDataView === 'characters-view') btnInternalViewId = 'characters';
                else if (btnDataView === 'users-characters-view') btnInternalViewId = 'usersCharacters';
                else if (btnDataView === 'create-character-view') btnInternalViewId = 'createCharacter';
                else if (btnDataView === 'settings-view') btnInternalViewId = 'settings';

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
            }
            paymentItemTotalStars.innerHTML = `${params.stars} <span class="telegram-star">⭐</span>`;
        }

        if (viewId === 'paymentSubscription' && params.planDetails && params.stars) {
            document.getElementById('payment-sub-plan-details').textContent = params.planDetails;
            document.getElementById('payment-sub-total-stars').innerHTML = `${params.stars} <span class="telegram-star">⭐</span>`;
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

    function populateCharacters() { /* ... as before ... */
        characterGrid.innerHTML = '';
        charactersData.forEach(charData => {
            const card = document.createElement('div'); card.classList.add('character-card'); card.dataset.personaId = charData.id_to_send; card.dataset.displayName = charData.display_name;
            const imageContainer = document.createElement('div'); imageContainer.classList.add('character-image-container');
            const img = document.createElement('img'); img.classList.add('character-image'); img.src = charData.image_url; img.alt = charData.display_name; imageContainer.appendChild(img);
            if (charData.special_decoration === "paws") { const pawOverlay = document.createElement('div'); pawOverlay.classList.add('paw-print-overlay'); const pawPositions = [ { top: '8%', left: '10%', transform: 'rotate(-20deg)', class: 'p1' }, { top: '15%', right: '8%', transform: 'rotate(25deg)', class: 'p2' }, { top: '60%', left: '15%', transform: 'rotate(10deg)', class: 'p3' }, { top: '70%', right: '20%', transform: 'rotate(-10deg)', class: 'p4' } ]; pawPositions.forEach(pos => { const paw = document.createElement('span'); paw.classList.add('paw-print', pos.class); paw.style.top = pos.top; if(pos.left) paw.style.left = pos.left; if(pos.right) paw.style.right = pos.right; paw.style.transform = pos.transform; paw.textContent = '🐾'; pawOverlay.appendChild(paw); }); imageContainer.appendChild(pawOverlay); }
            card.appendChild(imageContainer);
            const info = document.createElement('div'); info.classList.add('character-info');
            const nameHeader = document.createElement('h3'); nameHeader.classList.add('character-name'); nameHeader.textContent = charData.display_name;
            if (charData.icon) { const iconSpan = document.createElement('span'); iconSpan.classList.add('card-icon'); iconSpan.innerHTML = charData.icon; nameHeader.appendChild(iconSpan); }
            const desc = document.createElement('p'); desc.classList.add('character-description'); desc.textContent = charData.description;
            info.appendChild(nameHeader); info.appendChild(desc); card.appendChild(info);
            if (charData.selected) { card.classList.add('selected'); selectedCharacterCard = card; }
            card.addEventListener('click', function () { if (selectedCharacterCard) { selectedCharacterCard.classList.remove('selected'); } this.classList.add('selected'); selectedCharacterCard = this; console.log("Selected Persona ID:", this.dataset.personaId); });
            characterGrid.appendChild(card);
        });
    }


    // --- USER-CREATED CHARACTER FUNCTIONS (My Creations Page) ---
    const myCharacterList = document.getElementById('my-character-list');
    const noMyCharsMsg = document.getElementById('no-my-characters-message');

    function populateMyCharacters() { /* ... as before ... */
        myCharacterList.innerHTML = '';

        if (userCreatedCharacters.length === 0) {
            if (noMyCharsMsg) {
                myCharacterList.appendChild(noMyCharsMsg);
                noMyCharsMsg.style.display = 'block';
            }
            return;
        }
        if (noMyCharsMsg) noMyCharsMsg.style.display = 'none';

        userCreatedCharacters.forEach(charData => {
            const card = document.createElement('div');
            card.classList.add('my-character-card');
            card.dataset.charId = charData.id;

            const img = document.createElement('img');
            img.classList.add('character-image-thumb');
            img.src = charData.image_url || 'https://placehold.co/70x90/4B4265/E0E0E0/png?text=N/A&font=roboto';
            img.alt = charData.name;

            const detailsDiv = document.createElement('div');
            detailsDiv.classList.add('my-character-details');

            const statusSpan = document.createElement('span');
            statusSpan.classList.add('my-character-status', charData.visibility);
            statusSpan.textContent = charData.visibility;

            const nameHeader = document.createElement('h3');
            nameHeader.classList.add('my-character-name');
            nameHeader.textContent = charData.name;

            const descP = document.createElement('p');
            descP.classList.add('my-character-desc');
            descP.textContent = charData.description;

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('my-character-actions');

            const toggleBtn = document.createElement('button');
            toggleBtn.classList.add('action-btn', 'toggle-visibility');
            toggleBtn.textContent = charData.visibility === 'public' ? 'Make Private' : 'Make Public';
            toggleBtn.addEventListener('click', () => toggleCharacterVisibility(charData.id));

            const editBtn = document.createElement('button');
            editBtn.classList.add('action-btn', 'edit');
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', () => {
                 showView('editCharacter', false, { charId: charData.id });
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('action-btn', 'delete');
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteCharacter(charData.id, charData.name));

            actionsDiv.appendChild(toggleBtn);
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);

            detailsDiv.appendChild(statusSpan);
            detailsDiv.appendChild(nameHeader);
            detailsDiv.appendChild(descP);
            detailsDiv.appendChild(actionsDiv);

            card.appendChild(img);
            card.appendChild(detailsDiv);
            myCharacterList.appendChild(card);
        });
    }

    function toggleCharacterVisibility(charId) {
        const charIndex = userCreatedCharacters.findIndex(c => c.id === charId);
        if (charIndex > -1) {
            userCreatedCharacters[charIndex].visibility = userCreatedCharacters[charIndex].visibility === 'public' ? 'private' : 'public';
            populateMyCharacters(); // Refresh "My Characters" list
            renderUsersCharacterContent(); // Refresh "Users Characters" if visible and relevant
            tg.HapticFeedback.impactOccurred('light');
        }
    }

    function deleteCharacter(charId, charName) {
        tg.showConfirm(`Are you sure you want to delete "${charName}"? This action cannot be undone.`, (ok) => {
            if (ok) {
                userCreatedCharacters = userCreatedCharacters.filter(c => c.id !== charId);
                populateMyCharacters(); // Refresh "My Characters" list
                renderUsersCharacterContent(); // Refresh "Users Characters" if visible and relevant
                tg.HapticFeedback.notificationOccurred('success');
                tg.showAlert(`Character "${charName}" has been deleted.`);
            }
        });
    }

    // --- USERS CHARACTERS VIEW LOGIC (Tabs & Search) ---
    function renderUsersCharacterContent() {
        if (currentViewId !== 'usersCharacters') return; // Only render if this view is active

        let charactersToDisplay = userCreatedCharacters.filter(char => char.visibility === 'public');

        // Apply tab logic
        if (currentUsersCharacterTab === 'featured') {
            // Simulated: first N public characters with images are "featured", newest first
            const featuredChars = [...charactersToDisplay] // Create a copy to sort
                                .sort((a,b) => b.createdAt - a.createdAt) // newest first
                                .filter(char => char.image_url) // only with images
                                .slice(0, 4); // Max 4 featured
            charactersToDisplay = featuredChars;
        } else if (currentUsersCharacterTab === 'recent') {
            // Sort by newest first (based on creation timestamp)
            charactersToDisplay.sort((a, b) => b.createdAt - a.createdAt);
        }

        // Apply search term
        const searchTerm = currentUsersCharacterSearchTerm.toLowerCase();
        if (searchTerm) {
            charactersToDisplay = charactersToDisplay.filter(char =>
                char.name.toLowerCase().includes(searchTerm) ||
                char.description.toLowerCase().includes(searchTerm)
            );
        }

        // Render
        publicCharacterGrid.innerHTML = '';
        if (charactersToDisplay.length === 0) {
            if (noPublicCharsMsg) {
                publicCharacterGrid.appendChild(noPublicCharsMsg);
                noPublicCharsMsg.style.display = 'block';
            }
            return;
        }
        if (noPublicCharsMsg) noPublicCharsMsg.style.display = 'none';

        charactersToDisplay.forEach(charData => {
            // Re-use character card structure
            const card = document.createElement('div');
            card.classList.add('character-card');
            const imageContainer = document.createElement('div');
            imageContainer.classList.add('character-image-container');
            const img = document.createElement('img');
            img.classList.add('character-image');
            img.src = charData.image_url || 'https://placehold.co/300x400/4B4265/E0E0E0/png?text=No+Image&font=roboto';
            img.alt = charData.name;
            imageContainer.appendChild(img);
            card.appendChild(imageContainer);

            const info = document.createElement('div');
            info.classList.add('character-info');
            const nameHeader = document.createElement('h3');
            nameHeader.classList.add('character-name');
            nameHeader.textContent = charData.name;
            const desc = document.createElement('p');
            desc.classList.add('character-description');
            desc.textContent = charData.description; // Short description
            info.appendChild(nameHeader); info.appendChild(desc); card.appendChild(info);
            card.addEventListener('click', () => {
                tg.showAlert(`You selected public character: ${charData.name}. Full details (not shown on card): ${charData.details || 'N/A'}`);
            });
            publicCharacterGrid.appendChild(card);
        });
    }

    if (usersCharacterSearchInput) {
        usersCharacterSearchInput.addEventListener('input', (e) => {
            currentUsersCharacterSearchTerm = e.target.value;
            renderUsersCharacterContent();
        });
    }

    usersCharacterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            usersCharacterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentUsersCharacterTab = tab.dataset.tab;
            renderUsersCharacterContent();
        });
    });


    // --- CHARACTER EDITING ---
    const editingCharField = document.getElementById('editing-char-id');
    const editCharNameInput = document.getElementById('edit-char-name');
    const editCharDescInput = document.getElementById('edit-char-desc');
    const editCharDetailsInput = document.getElementById('edit-char-details');
    const editCharImageInput = document.getElementById('edit-char-image');
    const saveEditedCharBtn = document.getElementById('save-edited-character-btn');

    function loadCharacterForEditing(charId) {
        const character = userCreatedCharacters.find(c => c.id === charId);
        if (character) {
            editingCharField.value = charId;
            editCharNameInput.value = character.name;
            editCharDescInput.value = character.description;
            editCharDetailsInput.value = character.details || '';
            editCharImageInput.value = character.image_url || '';
            setSegmentedControlValue('edit-char-visibility-segment', character.visibility);
        } else {
            tg.showAlert("Error: Could not find character to edit.");
            showView('myCharacters', true);
        }
    }

    if (saveEditedCharBtn) {
        saveEditedCharBtn.addEventListener('click', () => {
            const charId = parseInt(editingCharField.value);
            const charName = editCharNameInput.value.trim();
            const charDesc = editCharDescInput.value.trim();
            const charDetails = editCharDetailsInput.value.trim();
            const charImage = editCharImageInput.value.trim();
            const charVisibility = getSegmentedControlValue('edit-char-visibility-segment');

            if (!charName || !charDesc) {
                tg.showAlert("Name and Short Description cannot be empty.");
                return;
            }

            const charIndex = userCreatedCharacters.findIndex(c => c.id === charId);
            if (charIndex > -1) {
                userCreatedCharacters[charIndex] = {
                    ...userCreatedCharacters[charIndex],
                    name: charName,
                    description: charDesc,
                    details: charDetails,
                    image_url: charImage || null,
                    visibility: charVisibility,
                    // createdAt: userCreatedCharacters[charIndex].createdAt // Preserve original creation time
                };
                tg.HapticFeedback.notificationOccurred('success');
                tg.showAlert(`Character "${charName}" updated!`);
                populateMyCharacters();
                renderUsersCharacterContent(); // Update UsersCharacters view as data might have changed

                if (tg.BackButton.isVisible) tg.BackButton.onClick();
                else showView('myCharacters', true);

            } else {
                tg.showAlert("Error: Could not save changes. Character not found.");
            }
        });
    }

    document.getElementById('my-characters-btn').addEventListener('click', () => showView('myCharacters'));
    if (document.getElementById('create-first-character-link')) {
        document.getElementById('create-first-character-link').addEventListener('click', (e) => {
            e.preventDefault();
            showView('createCharacter');
        });
    }
    document.getElementById('settings-upgrade-plan-btn').addEventListener('click', () => showView('plan'));
    document.getElementById('settings-language-btn').addEventListener('click', () => showView('language'));

    // ... (Style toggle, Plan options, Language options, Store, Energy, Payment logic - remains as before) ...
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
            const planTitle = selectedPlan.querySelector('.plan-title').textContent.replace(/<span.*?<\/span>/g, '').trim();
            const stars = selectedPlan.dataset.starsCost;
            showView('paymentSubscription', false, { planDetails: planTitle, stars: stars });
        } else { tg.showAlert("Please select a plan first."); }
    });

    document.getElementById('payment-sub-confirm-btn').addEventListener('click', () => { tg.showAlert("Subscription upgrade initiated (simulated)!"); viewHistory = []; showView('characters'); });

    const languageOptions = document.querySelectorAll('.language-option');
    const currentLangDisplayEl = document.getElementById('current-language-display');
    selectedLanguage = 'en';
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
            if (viewHistory.length > 0 && tg.BackButton.isVisible) { tg.BackButton.onClick(); } else { showView('settings', true); }
        });
    });

    const storeGemPacks = document.querySelectorAll('.store-gem-pack');
    storeGemPacks.forEach(pack => {
        pack.addEventListener('click', () => {
            const gems = pack.dataset.gems; const stars = pack.dataset.stars;
            showView('paymentItem', false, { type: 'gems', gems, stars });
        });
    });

    document.getElementById('recharge-energy-btn').addEventListener('click', () => {
        showView('rechargeEnergy');
    });

    if(energyAmountInput && estimatedEnergyStarsEl) {
        energyAmountInput.addEventListener('input', () => {
            const amount = parseInt(energyAmountInput.value) || 0;
            estimatedEnergyStarsEl.textContent = Math.ceil(amount / ENERGY_PER_STAR_RATE);
        });
        estimatedEnergyStarsEl.textContent = Math.ceil(parseInt(energyAmountInput.value) / ENERGY_PER_STAR_RATE);
    }

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
            if (viewHistory.length > 0 && viewHistory[viewHistory.length-1] === 'store' && tg.BackButton.isVisible) tg.BackButton.onClick();
            else showView('store', true);
        } else {
            viewHistory = [];
            showView('characters');
        }
    });


    const saveCharBtn = document.getElementById('save-character-btn');
    if (saveCharBtn) {
        saveCharBtn.addEventListener('click', () => {
            const charNameInput = document.getElementById('char-name');
            const charDescInput = document.getElementById('char-desc');
            const charDetailsInput = document.getElementById('char-details');
            const charImageInput = document.getElementById('char-image');

            const charName = charNameInput.value.trim();
            const charDesc = charDescInput.value.trim();
            const charDetails = charDetailsInput.value.trim();
            const charImage = charImageInput.value.trim();
            const charVisibility = getSegmentedControlValue('char-visibility-segment');

            if (charName === "" || charDesc === "") {
                tg.showAlert("Please enter a Name and Short Description."); return;
            }

            tg.showConfirm(`Create character "${charName}" (${charVisibility}) for ${CHARACTER_CREATION_COST_GEMS} 💎?`, (ok) => {
               if (ok) {
                    const newChar = {
                        id: nextUserCharacterId++,
                        name: charName,
                        description: charDesc,
                        details: charDetails,
                        image_url: charImage || null,
                        visibility: charVisibility,
                        createdAt: Date.now() // Add creation timestamp
                    };
                    userCreatedCharacters.push(newChar); // Add to end (naturally newest)
                    console.log("Creating character:", newChar);
                    tg.HapticFeedback.notificationOccurred('success');
                    tg.showAlert(`Character "${charName}" created as ${charVisibility} for ${CHARACTER_CREATION_COST_GEMS} 💎 (simulated)!`);

                    charNameInput.value = '';
                    charDescInput.value = '';
                    charDetailsInput.value = '';
                    charImageInput.value = '';
                    setSegmentedControlValue('char-visibility-segment', 'public');

                    renderUsersCharacterContent(); // Update UsersCharacters view immediately if visible
                    let navigated = false;
                    if (viewHistory.length > 0) {
                        const previousView = viewHistory[viewHistory.length - 1];
                         if (previousView === 'myCharacters' || previousView === 'usersCharacters' || previousView === 'characters') {
                            if(tg.BackButton.isVisible) tg.BackButton.onClick();
                            navigated = true;
                        }
                    }
                     if (!navigated) {
                        showView('myCharacters', true);
                    }
               }
            });
        });
    }

    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
         item.addEventListener('click', () => {
            const targetViewHtmlId = item.dataset.view;
            let targetInternalViewId = '';

            if (targetViewHtmlId === 'characters-view') targetInternalViewId = 'characters';
            else if (targetViewHtmlId === 'users-characters-view') targetInternalViewId = 'usersCharacters';
            else if (targetViewHtmlId === 'settings-view') targetInternalViewId = 'settings';
            else if (targetViewHtmlId === 'create-character-view') targetInternalViewId = 'createCharacter';
            else { console.warn("Unknown bottom nav item:", targetViewHtmlId); return; }

            if (views[targetInternalViewId] && currentViewId !== targetInternalViewId) {
                viewHistory = [];
                showView(targetInternalViewId);
            }
        });
    });

    populateCharacters();
    showView('characters');
});
