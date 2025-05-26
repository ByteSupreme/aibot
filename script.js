document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand(); // Make sure app is expanded

    let initialBotData = null; // To store data from bot

    // Function to parse initial data from URL query parameters
    function getInitialBotData() {
        const params = new URLSearchParams(window.location.search);
        const dataParam = params.get('initial_bot_data');
        if (dataParam) {
            try {
                // URL decoding happens automatically with URLSearchParams
                return JSON.parse(dataParam);
            } catch (e) {
                console.error("Error parsing initial_bot_data:", e);
                tg.showAlert("Error loading initial application data. Please try reopening from Telegram.");
                return null;
            }
        }
        console.warn("initial_bot_data not found in URL query parameters.");
        tg.showAlert("Could not load user data. Please launch from the bot's /pickcharacter command.");
        return null;
    }

    // --- Initialize ---
    initialBotData = getInitialBotData();

    if (!initialBotData || initialBotData.error) {
        console.error("Failed to load initialBotData:", initialBotData ? initialBotData.error : "No data");
        // Display an error message in the webapp body if crucial data is missing
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: white;">
            <h1>Error</h1>
            <p>Could not load essential application data. Please ensure you are opening this app from the bot command /pickcharacter.</p>
            <p>If the problem persists, contact support.</p>
        </div>`;
        if (initialBotData && initialBotData.error) {
             tg.showAlert(initialBotData.error);
        }
        return; // Stop further execution if initial data is missing
    }

    console.log("Initial Bot Data Received:", initialBotData);
    tg.MainButton.setText("Close App");
    tg.MainButton.setParams({ color: '#FF0000' }); // Example: Red color for close
    tg.MainButton.onClick(() => tg.close());
    // tg.MainButton.show(); // Show it if always needed, or selectively.

    // Update theme colors (already in your code, good)
    try {
        tg.setHeaderColor(initialBotData.theme_params ? initialBotData.theme_params.bg_color || '#0E0F1A' : '#0E0F1A');
        tg.setBackgroundColor(initialBotData.theme_params ? initialBotData.theme_params.secondary_bg_color || '#0E0F1A' : '#0E0F1A');
    } catch (e) {
        console.error("Error setting Telegram theme colors from bot data:", e);
        try { // Fallback to hardcoded
            tg.setHeaderColor('#0E0F1A');
            tg.setBackgroundColor('#0E0F1A');
        } catch (e2) { console.error("Fallback theme setting failed:", e2);}
    }


    const views = {
        characters: document.getElementById('characters-view'),
        usersCharacters: document.getElementById('users-characters-view'),
        myCharacters: document.getElementById('my-characters-view'),
        characterDetail: document.getElementById('character-detail-view'),
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

    // --- DOM Cache ---
    const gemBarContainerOuter = document.getElementById('gem-bar-container-outer');
    const bottomNavBar = document.getElementById('bottom-nav-bar');
    const energyAmountInput = document.getElementById('energy-amount');
    const estimatedEnergyStarsEl = document.getElementById('estimated-energy-stars');
    const characterGrid = document.getElementById('character-grid'); // For predefined
    const publicCharacterGrid = document.getElementById('public-character-grid');
    const noPublicCharsMsg = document.getElementById('no-public-characters-message');
    const myCharacterList = document.getElementById('my-character-list');
    const noMyCharsMsg = document.getElementById('no-my-characters-message');
    const usersCharacterSearchInput = document.getElementById('users-character-search-input');
    const usersCharacterTabs = document.querySelectorAll('#users-characters-view .tab-button');


    // Character Detail View Elements
    const charDetailImage = document.getElementById('char-detail-image');
    const charDetailName = document.getElementById('char-detail-name');
    const charDetailDesc = document.getElementById('char-detail-desc');
    const charDetailFullDetailsSection = document.getElementById('char-detail-full-details-section');
    const charDetailFullDetails = document.getElementById('char-detail-full-details');
    const startCharacterBtn = document.getElementById('start-character-btn');
    let currentCharacterDetailData = null;

    // Creation/Editing Character form fields
    const createCharNameInput = document.getElementById('char-name');
    const createCharDescInput = document.getElementById('char-desc');
    const createCharDetailsInput = document.getElementById('char-details');
    const createCharImageInput = document.getElementById('char-image');
    const saveCharBtn = document.getElementById('save-character-btn');
    const creationCostNoteEl = document.querySelector('#create-character-view .creation-cost-note');

    const editingCharField = document.getElementById('editing-char-id');
    const editCharNameInput = document.getElementById('edit-char-name');
    const editCharDescInput = document.getElementById('edit-char-desc');
    const editCharDetailsInput = document.getElementById('edit-char-details');
    const editCharImageInput = document.getElementById('edit-char-image');
    const saveEditedCharBtn = document.getElementById('save-edited-character-btn');

    // Settings elements
    const currentLangDisplayEl = document.getElementById('current-language-display');
    const languageOptionsContainer = document.getElementById('language-view');
    const styleRealisticImg = document.getElementById('style-realistic');
    const styleAnimeImg = document.getElementById('style-anime');
    const styleRealisticLabel = document.querySelector('.style-label.realistic');
    const styleAnimeLabel = document.querySelector('.style-label.anime');


    // --- App State ---
    let viewHistory = [];
    let currentViewId = 'characters'; // Default start view
    const ENERGY_PER_STAR_RATE = initialBotData.energy_recharge_xtr_per_unit || 2; // From config, 2 XTR per energy point
    const CHARACTER_CREATION_COST_GEMS = initialBotData.character_creation_cost_gems || 15;

    let userCreatedCharacters = initialBotData.user_characters || []; // From bot
    let publicCharactersData = initialBotData.public_characters_sample || []; // From bot
    let nextUserCharacterIdInternalUiOnly = userCreatedCharacters.length > 0 ? Math.max(...userCreatedCharacters.map(c => parseInt(c.id_internal_ui_only || 0))) + 1 : 1;


    let currentUsersCharacterTab = 'featured';
    let currentUsersCharacterSearchTerm = '';

    // Update creation cost note display
    if (creationCostNoteEl) {
        creationCostNoteEl.innerHTML = `Cost: ${CHARACTER_CREATION_COST_GEMS} <span class="gem-currency-icon">💎</span> per character`;
        if (saveCharBtn) { // Also update button text
            saveCharBtn.innerHTML = `Create Character (${CHARACTER_CREATION_COST_GEMS} <span class="gem-currency-icon">💎</span>)`;
        }
    }

    // --- Utility Functions (Segmented Control, etc.) ---
    function setupSegmentedControl(segmentContainerId, onchangeCallback = null) {
        const container = document.getElementById(segmentContainerId);
        if (!container) return;
        const buttons = container.querySelectorAll('.segment-button');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                buttons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                if (onchangeCallback) onchangeCallback(button.dataset.value);
            });
        });
    }
    setupSegmentedControl('char-visibility-segment');
    setupSegmentedControl('edit-char-visibility-segment');

    function getSegmentedControlValue(segmentContainerId) {
        const container = document.getElementById(segmentContainerId);
        if (!container) return 'public'; // Default or error
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

    // --- Gem Bar Update ---
    function updateGemBar() {
        if (!gemBarContainerOuter) return;
        const gemCountEl = gemBarContainerOuter.querySelector('.gem-count');
        const energyStatusEl = gemBarContainerOuter.querySelector('.energy-status');

        if (gemCountEl) gemCountEl.textContent = initialBotData.gems_balance || 0;
        if (energyStatusEl) {
            if (initialBotData.energy_is_unlimited) {
                energyStatusEl.textContent = 'Unlimited';
            } else {
                energyStatusEl.textContent = `${initialBotData.energy_balance || 0}/${initialBotData.max_energy_non_premium || 100}`;
            }
        }
    }


    // --- Navigation & View Management ---
    tg.BackButton.onClick(() => {
        if (viewHistory.length > 0) {
            const previousViewId = viewHistory.pop();
            showView(previousViewId, true);
        } else {
            tg.BackButton.hide(); // Should not happen if logic is correct
        }
    });

    function updateTelegramBackButton() {
        if (viewHistory.length > 0 && currentViewId !== 'characters') { // Don't show on main 'characters' view
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
                views[id].style.display = (id === viewId) ? 'flex' : 'none';
                views[id].classList.toggle('active-view', id === viewId);

            }
        }
        currentViewId = viewId;
        updateStickyHeaderAndNav(viewId, params);
        updateTelegramBackButton();
        tg.expand(); // Ensure expanded on view change
        window.scrollTo(0, 0); // Scroll to top

        // View-specific population or logic
        if (viewId === 'usersCharacters') {
            if (!isBack || !usersCharacterSearchInput.value) {
                usersCharacterSearchInput.value = ''; currentUsersCharacterSearchTerm = '';
            }
            populatePublicCharacters(); // Was renderUsersCharacterContent
        } else if (viewId === 'myCharacters') {
            populateMyCharacters();
        } else if (viewId === 'characterDetail' && params.characterData) {
            populateCharacterDetailView(params.characterData);
        } else if (viewId === 'editCharacter' && params.charId) {
            loadCharacterForEditing(params.charId);
        } else if (viewId === 'settings') {
            initializeSettingsView();
        } else if (viewId === 'language') {
            initializeLanguageView();
        } else if (viewId === 'plan') {
            initializePlanView();
        }
    }

    function updateStickyHeaderAndNav(viewId, params = {}) {
        gemBarContainerOuter.innerHTML = ''; // Clear first

        const commonGemBarHTML = `
            <div class="gem-bar">
                <span class="gem-icon">💎</span>
                <span class="gem-count">${initialBotData.gems_balance || 0}</span>
                <span class="energy-icon">⚡️</span>
                <span class="energy-status">${initialBotData.energy_is_unlimited ? 'Unlimited' : `${initialBotData.energy_balance || 0}/${initialBotData.max_energy_non_premium || 100}`}</span>
                <button class="plus-btn" id="gem-bar-plus-btn">➕</button>
            </div>`;

        const viewsWithGemBar = ['characters', 'usersCharacters', 'myCharacters', 'characterDetail', 'settings', 'store', 'createCharacter', 'editCharacter', 'rechargeEnergy', 'plan', 'paymentSubscription', 'paymentItem', 'language'];
        if (viewsWithGemBar.includes(viewId)) {
            gemBarContainerOuter.innerHTML = commonGemBarHTML;
            const plusButton = document.getElementById('gem-bar-plus-btn');
            if (plusButton) {
                plusButton.onclick = () => showView('store');
            }
        }

        const viewsWithBottomNav = ['characters', 'usersCharacters', 'settings', 'createCharacter'];
        bottomNavBar.style.display = viewsWithBottomNav.includes(viewId) ? 'flex' : 'none';

        if (viewsWithBottomNav.includes(viewId)) {
            document.querySelectorAll('.bottom-nav-item').forEach(btn => {
                const btnDataView = btn.dataset.view.replace('-view', '');
                btn.classList.toggle('active', currentViewId === btnDataView);
            });
        }
        
        // Handle Payment View specific content (Subscription, Item)
        if (viewId === 'paymentSubscription' && params.planData) { // Check params.planData
            document.getElementById('payment-sub-plan-details').textContent = params.planData.title + " (" + params.planData.gems_bonus + " 💎 bonus)";
            document.getElementById('payment-sub-total-stars').innerHTML = `${params.planData.stars_cost} <span class="telegram-star">⭐</span>`;
        } else if (viewId === 'paymentItem' && params.itemData) { // Check params.itemData
            const paymentItemAvatar = document.getElementById('payment-item-avatar');
            document.getElementById('payment-item-purchase-title').textContent = `Purchasing ${params.itemData.type}`;
            if (params.itemData.type === 'energy') {
                document.getElementById('payment-item-details').textContent = `${params.itemData.amount} Energy`;
                if (paymentItemAvatar) paymentItemAvatar.src = 'https://placehold.co/80x80/FFD700/333333/png?text=⚡&font=roboto';
            } else if (params.itemData.type === 'gems') {
                document.getElementById('payment-item-details').textContent = `${params.itemData.gems} Gems`;
                if (paymentItemAvatar) paymentItemAvatar.src = 'https://placehold.co/80x80/4FC3F7/FFFFFF/png?text=Gems&font=roboto';
            }
            document.getElementById('payment-item-total-stars').innerHTML = `${params.itemData.stars_cost} <span class="telegram-star">⭐</span>`;
        }
    }

    // --- Predefined Characters Population ---
    function populatePredefinedCharacters() {
        characterGrid.innerHTML = '';
        if (!initialBotData || !initialBotData.predefined_personas) {
            characterGrid.innerHTML = "<p>No predefined characters available.</p>";
            return;
        }

        initialBotData.predefined_personas.forEach(charData => {
            const card = document.createElement('div');
            card.classList.add('character-card');
            card.dataset.idToSend = charData.id_to_send; // ID for bot

            const imageContainer = document.createElement('div');
            imageContainer.classList.add('character-image-container');
            const img = document.createElement('img');
            img.classList.add('character-image');
            img.src = charData.image_url || 'https://placehold.co/300x400/333/fff?text=N/A';
            img.alt = charData.display_name;
            imageContainer.appendChild(img);
            // Paw overlay logic (if still needed and provided by bot data)
             if (charData.special_decoration === "paws") {
                 const pawOverlay = document.createElement('div'); pawOverlay.classList.add('paw-print-overlay'); const pawPositions = [ { top: '8%', left: '10%', transform: 'rotate(-20deg)', class: 'p1' }, { top: '15%', right: '8%', transform: 'rotate(25deg)', class: 'p2' }, { top: '60%', left: '15%', transform: 'rotate(10deg)', class: 'p3' }, { top: '70%', right: '20%', transform: 'rotate(-10deg)', class: 'p4' } ]; pawPositions.forEach(pos => { const paw = document.createElement('span'); paw.classList.add('paw-print', pos.class); paw.style.top = pos.top; if(pos.left) paw.style.left = pos.left; if(pos.right) paw.style.right = pos.right; paw.style.transform = pos.transform; paw.textContent = '🐾'; pawOverlay.appendChild(paw); }); imageContainer.appendChild(pawOverlay);
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
                iconSpan.innerHTML = charData.icon;
                nameHeader.appendChild(iconSpan);
            }
            const desc = document.createElement('p');
            desc.classList.add('character-description');
            desc.textContent = charData.description;
            info.appendChild(nameHeader);
            info.appendChild(desc);
            card.appendChild(info);

            // No 'selected' class applied here by default, detail view handles selection.
            card.addEventListener('click', function () {
                const detailData = {
                    type: 'predefined',
                    id_to_send: charData.id_to_send,
                    name: charData.display_name,
                    description: charData.description,
                    image_url: charData.image_url,
                    // No 'details' for predefined in this simplified version for card click
                };
                showView('characterDetail', false, { characterData: detailData });
            });
            characterGrid.appendChild(card);
        });
    }

    // --- User-Created Characters ("My Creations" & "Public") ---
    function populateMyCharacters() {
        myCharacterList.innerHTML = '';
        if (userCreatedCharacters.length === 0) {
            if (noMyCharsMsg) { noMyCharsMsg.style.display = 'block'; }
            return;
        }
        if (noMyCharsMsg) { noMyCharsMsg.style.display = 'none'; }

        userCreatedCharacters.forEach(charData => { // charData is from initialBotData.user_characters
            const card = document.createElement('div');
            card.classList.add('my-character-card');
            card.dataset.charId = charData.char_id; // Use char_id from DB

            card.addEventListener('click', (event) => {
                if (event.target.closest('.my-character-actions .action-btn')) return;
                const detailData = {
                    type: 'user_created',
                    id: charData.char_id, // Bot needs char_id
                    name: charData.name,
                    description: charData.description,
                    details: charData.details,
                    image_url: charData.image_url,
                    visibility: charData.visibility, // Store for startCharacterBtn
                };
                showView('characterDetail', false, { characterData: detailData });
            });

            const img = document.createElement('img'); // ... (as before)
            img.classList.add('character-image-thumb');
            img.src = charData.image_url || 'https://placehold.co/70x90/4B4265/E0E0E0/png?text=N/A&font=roboto';
            img.alt = charData.name;

            const detailsDiv = document.createElement('div');
            detailsDiv.classList.add('my-character-details');

            const statusSpan = document.createElement('span'); // ... (as before)
            statusSpan.classList.add('my-character-status', charData.visibility);
            statusSpan.textContent = charData.visibility;

            const nameHeader = document.createElement('h3'); // ... (as before)
            nameHeader.classList.add('my-character-name');
            nameHeader.textContent = charData.name;

            const descP = document.createElement('p'); // ... (as before)
            descP.classList.add('my-character-desc');
            descP.textContent = charData.description;

            const actionsDiv = document.createElement('div'); // ... (as before)
            actionsDiv.classList.add('my-character-actions');

            const toggleBtn = document.createElement('button');
            toggleBtn.classList.add('action-btn', 'toggle-visibility');
            toggleBtn.textContent = charData.visibility === 'public' ? 'Make Private' : 'Make Public';
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const newVisibility = charData.visibility === 'public' ? 'private' : 'public';
                const updatedCharData = { ...charData, visibility: newVisibility, id: charData.char_id }; // send id as char_id from DB
                tg.sendData(JSON.stringify({ action: "save_user_character", character: updatedCharData }));
                // Optimistic UI update
                charData.visibility = newVisibility;
                populateMyCharacters();
                populatePublicCharacters();
                tg.HapticFeedback.impactOccurred('light');
            });

            const editBtn = document.createElement('button'); // ... (as before)
            editBtn.classList.add('action-btn', 'edit');
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', (e) => { e.stopPropagation(); showView('editCharacter', false, { charId: charData.char_id }); });

            const deleteBtn = document.createElement('button'); // ... (as before)
            deleteBtn.classList.add('action-btn', 'delete');
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                tg.showConfirm(`Are you sure you want to delete "${charData.name}"?`, (ok) => {
                    if (ok) {
                        tg.sendData(JSON.stringify({ action: "delete_user_character", char_id: charData.char_id, char_name: charData.name }));
                        // Optimistic UI update
                        userCreatedCharacters = userCreatedCharacters.filter(c => c.char_id !== charData.char_id);
                        populateMyCharacters();
                        populatePublicCharacters(); // Refresh public view too
                        tg.HapticFeedback.notificationOccurred('success');
                    }
                });
            });
            actionsDiv.appendChild(toggleBtn); actionsDiv.appendChild(editBtn); actionsDiv.appendChild(deleteBtn);
            detailsDiv.appendChild(statusSpan); detailsDiv.appendChild(nameHeader); detailsDiv.appendChild(descP); detailsDiv.appendChild(actionsDiv);
            card.appendChild(img); card.appendChild(detailsDiv);
            myCharacterList.appendChild(card);
        });
    }

    function populatePublicCharacters() {
        if (currentViewId !== 'usersCharacters') return;

        let charactersToDisplay = publicCharactersData.filter(char => char.visibility === 'public'); // Assuming publicCharactersData IS already public

        if (currentUsersCharacterTab === 'featured') { // Logic for 'featured' might need specific data from bot
            const featuredChars = [...charactersToDisplay]
                                .sort((a,b) => (b.usage_count || 0) - (a.usage_count || 0)) // Example: sort by usage
                                // .filter(char => char.image_url) // if only image chars for featured
                                .slice(0, 10); // Show top 10 featured
            charactersToDisplay = featuredChars;
        } else if (currentUsersCharacterTab === 'recent') {
            charactersToDisplay.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        const searchTerm = currentUsersCharacterSearchTerm.toLowerCase();
        if (searchTerm) {
            charactersToDisplay = charactersToDisplay.filter(char =>
                char.name.toLowerCase().includes(searchTerm) ||
                char.description.toLowerCase().includes(searchTerm)
            );
        }

        publicCharacterGrid.innerHTML = '';
        if (charactersToDisplay.length === 0) {
            if (noPublicCharsMsg) noPublicCharsMsg.style.display = 'block'; return;
        }
        if (noPublicCharsMsg) noPublicCharsMsg.style.display = 'none';

        charactersToDisplay.forEach(charData => { // charData from publicCharactersData
            const card = document.createElement('div');
            card.classList.add('character-card');
            card.dataset.charId = charData.char_id;

            const imageContainer = document.createElement('div'); /* ... same as predefined ... */
            imageContainer.classList.add('character-image-container');
            const img = document.createElement('img');
            img.classList.add('character-image');
            img.src = charData.image_url || 'https://placehold.co/300x400/4B4265/E0E0E0/png?text=N/A&font=roboto';
            img.alt = charData.name;
            imageContainer.appendChild(img);
            card.appendChild(imageContainer);

            const info = document.createElement('div'); /* ... same as predefined ... */
            info.classList.add('character-info');
            const nameHeader = document.createElement('h3');
            nameHeader.classList.add('character-name');
            nameHeader.textContent = charData.name;
            const desc = document.createElement('p');
            desc.classList.add('character-description');
            desc.textContent = charData.description;
            info.appendChild(nameHeader); info.appendChild(desc); card.appendChild(info);


            card.addEventListener('click', () => {
                 const detailData = {
                    type: 'user_created', // Or 'public_user_created'
                    id: charData.char_id, // Bot needs char_id from DB
                    name: charData.name,
                    description: charData.description,
                    details: charData.details,
                    image_url: charData.image_url,
                    visibility: charData.visibility,
                };
                showView('characterDetail', false, { characterData: detailData });
            });
            publicCharacterGrid.appendChild(card);
        });
    }

    if (usersCharacterSearchInput) {
         usersCharacterSearchInput.addEventListener('input', (e) => {
            currentUsersCharacterSearchTerm = e.target.value;
            populatePublicCharacters();
        });
    }
    usersCharacterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            usersCharacterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentUsersCharacterTab = tab.dataset.tab;
            // Potentially trigger a new data fetch from bot if pagination/filtering is server-side
            // tg.sendData(JSON.stringify({ action: "load_public_characters_data", filter: currentUsersCharacterTab, search: currentUsersCharacterSearchTerm  }));
            // For now, just re-filters existing `publicCharactersData`
            populatePublicCharacters();
        });
    });


    // --- Character Detail View ---
    function populateCharacterDetailView(characterData) {
        currentCharacterDetailData = characterData;
        charDetailImage.src = characterData.image_url || 'https://placehold.co/600x800/333/fff?text=N/A';
        charDetailImage.alt = characterData.name;
        charDetailName.textContent = characterData.name;
        charDetailDesc.textContent = characterData.description;

        if (characterData.details && characterData.details.trim() !== "") {
            charDetailFullDetails.textContent = characterData.details;
            charDetailFullDetailsSection.style.display = 'block';
        } else {
            charDetailFullDetailsSection.style.display = 'none';
        }
    }

    if (startCharacterBtn) {
        startCharacterBtn.addEventListener('click', () => {
            if (currentCharacterDetailData) {
                let payload;
                if (currentCharacterDetailData.type === 'predefined') {
                    payload = { action: "select_predefined_character", id_to_send: currentCharacterDetailData.id_to_send };
                } else { // user_created or public_user_created
                    payload = { action: "select_user_character", char_id: currentCharacterDetailData.id };
                }
                tg.sendData(JSON.stringify(payload));
                // Usually close webapp after sending selection, bot will confirm in chat
                tg.showAlert(`Starting chat with ${currentCharacterDetailData.name}... Bot will confirm in Telegram.`);
                setTimeout(() => tg.close(), 1500); // Give time for alert to show
            } else {
                tg.showAlert("No character data to start.");
            }
        });
    }

    // --- Character Creation & Editing ---
    function loadCharacterForEditing(charIdToEdit) {
        const character = userCreatedCharacters.find(c => c.char_id === charIdToEdit);
        if (character) {
            editingCharField.value = charIdToEdit;
            editCharNameInput.value = character.name;
            editCharDescInput.value = character.description;
            editCharDetailsInput.value = character.details || '';
            editCharImageInput.value = character.image_url || '';
            setSegmentedControlValue('edit-char-visibility-segment', character.visibility);
        } else {
            tg.showAlert("Error: Could not find character to edit.");
            showView('myCharacters', true); // Go back
        }
    }
    if (saveCharBtn) {
        saveCharBtn.addEventListener('click', () => {
            const charName = createCharNameInput.value.trim();
            const charDesc = createCharDescInput.value.trim();
            const charDetails = createCharDetailsInput.value.trim();
            const charImage = createCharImageInput.value.trim();
            const charVisibility = getSegmentedControlValue('char-visibility-segment');

            if (charName === "" || charDesc === "") {
                tg.showAlert("Name and Short Description are required."); return;
            }
            if (initialBotData.gems_balance < CHARACTER_CREATION_COST_GEMS) {
                 tg.showAlert(`Not enough Gems! Need ${CHARACTER_CREATION_COST_GEMS} 💎, you have ${initialBotData.gems_balance} 💎.`);
                 return;
            }

            tg.showConfirm(`Create character "${charName}" for ${CHARACTER_CREATION_COST_GEMS} 💎?`, (ok) => {
               if (ok) {
                    const newCharData = {
                        // id is assigned by backend (char_id)
                        name: charName, description: charDesc, details: charDetails,
                        image_url: charImage || null, visibility: charVisibility
                    };
                    tg.sendData(JSON.stringify({ action: "save_user_character", character: newCharData }));
                    // Optimistic: Assume success, bot will confirm or show error
                    // Update local state IF bot doesn't send full refresh, for smoother UX
                    // For now, rely on bot message and potential future full data refresh
                    tg.showAlert("Creation request sent to bot...");
                    setTimeout(() => tg.close(), 1500);
               }
            });
        });
    }
    if (saveEditedCharBtn) {
        saveEditedCharBtn.addEventListener('click', () => {
            const charId = editingCharField.value; // This is char_id from DB
            const charName = editCharNameInput.value.trim();
            const charDesc = editCharDescInput.value.trim();
            const charDetails = editCharDetailsInput.value.trim();
            const charImage = editCharImageInput.value.trim();
            const charVisibility = getSegmentedControlValue('edit-char-visibility-segment');

            if (!charName || !charDesc) { tg.showAlert("Name and Short Description required."); return; }

            const updatedCharData = {
                id: charId, // Send DB char_id for identification
                name: charName, description: charDesc, details: charDetails,
                image_url: charImage || null, visibility: charVisibility
            };
            tg.sendData(JSON.stringify({ action: "save_user_character", character: updatedCharData }));
            tg.showAlert("Update request sent to bot...");
            setTimeout(() => tg.close(), 1500);
        });
    }


    // --- Settings View Initialization and Handlers ---
    function initializeSettingsView() {
        // Language
        if (currentLangDisplayEl) {
            const langName = languageOptionsContainer.querySelector(`.language-option[data-lang="${initialBotData.language}"]`)?.dataset.langName || initialBotData.language;
            currentLangDisplayEl.textContent = langName;
        }
        // Style
        const currentStyle = initialBotData.style || 'realistic';
        if (styleRealisticImg && styleAnimeImg && styleRealisticLabel && styleAnimeLabel) {
            styleRealisticImg.classList.toggle('active', currentStyle === 'realistic');
            styleAnimeImg.classList.toggle('active', currentStyle === 'anime');
            styleRealisticLabel.classList.toggle('active', currentStyle === 'realistic');
            styleRealisticLabel.querySelector('.checkbox-custom').classList.toggle('checked', currentStyle === 'realistic');
            styleAnimeLabel.classList.toggle('active', currentStyle === 'anime');
            styleAnimeLabel.querySelector('.checkbox-custom').classList.toggle('checked', currentStyle === 'anime');
        }
        // Plan button (dynamic text if needed)
        const planCard = document.querySelector('.settings-plan-card');
        if(planCard){
            const planNameEl = planCard.querySelector('span');
            if(initialBotData.webapp_subscription && initialBotData.webapp_subscription.active){
                const planConf = initialBotData.webapp_subscription_plans_config.find(p => p.id === initialBotData.webapp_subscription.plan_id);
                planNameEl.textContent = planConf ? planConf.name_for_user : "Active Subscription";
                document.getElementById('settings-upgrade-plan-btn').textContent = "Manage Plan";
            } else {
                 planNameEl.textContent = "Free Plan";
                 document.getElementById('settings-upgrade-plan-btn').textContent = "Upgrade";
            }
        }

    }
    document.getElementById('settings-upgrade-plan-btn').addEventListener('click', () => showView('plan'));
    document.getElementById('settings-language-btn').addEventListener('click', () => showView('language'));

    [styleRealisticLabel, styleAnimeLabel].forEach(label => {
        if (!label) return;
        label.addEventListener('click', () => {
            const selectedStyle = label.classList.contains('realistic') ? 'realistic' : 'anime';
            if (selectedStyle !== initialBotData.style) {
                initialBotData.style = selectedStyle; // Optimistic UI update
                initializeSettingsView(); // Re-render settings part
                tg.sendData(JSON.stringify({ action: "update_settings", settings: { style: selectedStyle } }));
                tg.HapticFeedback.impactOccurred('light');
            }
        });
    });

    // --- Language View ---
    function initializeLanguageView() {
        if (!languageOptionsContainer) return;
        const currentLang = initialBotData.language || 'en';
        languageOptionsContainer.querySelectorAll('.language-option').forEach(opt => {
            const isSelected = opt.dataset.lang === currentLang;
            opt.classList.toggle('selected', isSelected);
            opt.querySelector('.radio-custom').classList.toggle('checked', isSelected);

            // Remove old listeners and add new one to avoid duplication
            const newOpt = opt.cloneNode(true);
            opt.parentNode.replaceChild(newOpt, opt);

            newOpt.addEventListener('click', () => {
                const selectedLang = newOpt.dataset.lang;
                if (selectedLang !== initialBotData.language) {
                    initialBotData.language = selectedLang; // Optimistic
                    initializeLanguageView(); // Re-render
                    tg.sendData(JSON.stringify({ action: "update_settings", settings: { language: selectedLang } }));
                    tg.HapticFeedback.impactOccurred('light');
                    if (viewHistory.length > 0 && tg.BackButton.isVisible) tg.BackButton.onClick(); else showView('settings');
                }
            });
        });
    }

    // --- Plan View & Payment for Subscription ---
    const planOptions = document.querySelectorAll('.plan-option');
    const planFeatureGemsAmountEl = document.getElementById('plan-feature-gems-amount');
    let selectedPlanData = null; // To hold data of selected plan

    function initializePlanView() {
        // Get plans from initialBotData or config.js if plans are static in UI
        // Assuming plans are hardcoded in HTML for now, select first one.
        if(planOptions.length > 0){
            planOptions.forEach(opt => { opt.classList.remove('selected'); opt.querySelector('.radio-custom').classList.remove('checked'); });
            planOptions[0].classList.add('selected');
            planOptions[0].querySelector('.radio-custom').classList.add('checked');
            if (planFeatureGemsAmountEl) planFeatureGemsAmountEl.textContent = planOptions[0].dataset.gemsBonus;
            selectedPlanData = {
                plan_id: planOptions[0].dataset.plan, // The unique ID sent to bot. "1month" is from HTML. Bot maps this to config.
                title: planOptions[0].querySelector('.plan-title').textContent.replace(/<span.*?<\/span>/g, '').trim(),
                gems_bonus: planOptions[0].dataset.gemsBonus,
                stars_cost: planOptions[0].dataset.starsCost,
            };

        }
    }

    planOptions.forEach(option => {
        option.addEventListener('click', () => {
            planOptions.forEach(opt => { opt.classList.remove('selected'); opt.querySelector('.radio-custom').classList.remove('checked'); });
            option.classList.add('selected'); option.querySelector('.radio-custom').classList.add('checked');
            const gemsBonus = option.dataset.gemsBonus;
            if (planFeatureGemsAmountEl) { planFeatureGemsAmountEl.textContent = gemsBonus; }
            selectedPlanData = {
                plan_id: option.dataset.plan,
                title: option.querySelector('.plan-title').textContent.replace(/<span.*?<\/span>/g, '').trim(),
                gems_bonus: gemsBonus,
                stars_cost: option.dataset.starsCost,
            };
        });
    });

    document.getElementById('plan-upgrade-btn').addEventListener('click', () => {
        if (selectedPlanData) {
            showView('paymentSubscription', false, { planData: selectedPlanData });
        } else { tg.showAlert("Please select a plan first."); }
    });

    document.getElementById('payment-sub-confirm-btn').addEventListener('click', () => {
        if (selectedPlanData) {
            tg.sendData(JSON.stringify({ action: "request_subscription_purchase", plan: selectedPlanData }));
            tg.showAlert(`Requesting subscription for ${selectedPlanData.title}. Bot will send invoice.`);
            setTimeout(() => tg.close(), 2000);
        } else {
            tg.showAlert("No plan selected for payment confirmation.");
        }
    });


    // --- Store View & Payment for Items (Gems, Energy) ---
    const storeGemPacks = document.querySelectorAll('.store-gem-pack');
    let selectedItemData = null; // For gems or energy

    storeGemPacks.forEach(pack => {
        pack.addEventListener('click', () => {
            selectedItemData = {
                type: 'gems',
                package_id: `webapp_gems_${pack.dataset.gems}`, // Construct an ID the bot will map to config
                gems: pack.dataset.gems,
                stars_cost: pack.dataset.stars,
                price_usd: pack.querySelector('p').textContent // Just for UI data if needed
            };
            showView('paymentItem', false, { itemData: selectedItemData });
        });
    });

    document.getElementById('recharge-energy-btn').addEventListener('click', () => {
         energyAmountInput.value = 50; // Default
         if (estimatedEnergyStarsEl) estimatedEnergyStarsEl.textContent = Math.ceil(50 / ENERGY_PER_STAR_RATE);
         showView('rechargeEnergy');
    });
    if(energyAmountInput && estimatedEnergyStarsEl) {
        energyAmountInput.addEventListener('input', () => {
            const amount = parseInt(energyAmountInput.value) || 0;
            estimatedEnergyStarsEl.textContent = Math.ceil(amount / ENERGY_PER_STAR_RATE);
        });
    }

    const confirmRechargeBtn = document.getElementById('confirm-recharge-btn');
    if(confirmRechargeBtn) {
        confirmRechargeBtn.addEventListener('click', () => {
            const amount = parseInt(energyAmountInput.value);
            if (isNaN(amount) || amount <= 0) {
                tg.showAlert("Please enter a valid energy amount."); return;
            }
            const starsCost = Math.ceil(amount / ENERGY_PER_STAR_RATE);
            selectedItemData = { type: 'energy', amount: amount, stars_cost: starsCost };
            showView('paymentItem', false, {itemData: selectedItemData });
        });
    }

    document.getElementById('payment-item-confirm-btn').addEventListener('click', () => {
        if (selectedItemData) {
            if (selectedItemData.type === 'gems') {
                tg.sendData(JSON.stringify({ action: "request_gem_package_purchase", package: selectedItemData }));
                tg.showAlert(`Requesting ${selectedItemData.gems} Gems. Bot will send invoice.`);
            } else if (selectedItemData.type === 'energy') {
                tg.sendData(JSON.stringify({ action: "request_energy_recharge", amount: selectedItemData.amount, stars_cost: selectedItemData.stars_cost }));
                 tg.showAlert(`Requesting ${selectedItemData.amount} Energy. Bot will send invoice.`);
            }
            setTimeout(() => tg.close(), 2000);
        } else {
            tg.showAlert("No item selected for payment confirmation.");
        }
    });


    // --- Bottom Navigation Bar Logic ---
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
         item.addEventListener('click', () => {
            const targetViewHtmlId = item.dataset.view; // e.g., "characters-view"
            const targetInternalViewId = targetViewHtmlId.replace('-view', ''); // e.g., "characters"
            if (views[targetInternalViewId] && currentViewId !== targetInternalViewId) {
                viewHistory = []; // Reset history when using bottom nav for main views
                showView(targetInternalViewId);
            }
        });
    });
    
    // Links within views that change view
    if (document.getElementById('my-characters-btn')) {
        document.getElementById('my-characters-btn').addEventListener('click', () => showView('myCharacters'));
    }
    if (document.getElementById('create-first-character-link')) {
        document.getElementById('create-first-character-link').addEventListener('click', (e) => {
            e.preventDefault();
            showView('createCharacter');
        });
    }


    // --- Initial Load and View Setup ---
    populatePredefinedCharacters(); // Populate characters from bot data
    populateMyCharacters();
    populatePublicCharacters();
    updateGemBar();
    initializeSettingsView(); // Initialize with bot-provided settings
    initializeLanguageView();
    initializePlanView();

    // Show default view
    showView('characters'); // Default view
    // For deep linking, you could parse window.location.hash or a query param to set initial view.
});
