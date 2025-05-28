// mini_app_character_selector/script.js

document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
    try {
        tg.setHeaderColor('#0E0F1A');
        tg.setBackgroundColor('#0E0F1A');
    } catch (e) { console.warn("Error setting Telegram theme colors:", e); }

    const API_BASE_URL = 'https://cp7ghdz8-8000.inc1.devtunnels.ms/api/v1'; 
    const TELEGRAM_BOT_USERNAME = "floratestobot"; // Renamed bot for payment details
    const ADMIN_PANEL_URL = 'admin_panel.html'; // Path to your admin panel

    if (API_BASE_URL === 'YOUR_HOSTED_FASTAPI_BACKEND_URL/api/v1' || API_BASE_URL.includes('YOUR_HOSTED_FASTAPI_BACKEND_URL')) {
        tg.showAlert(translate("api_dev_alert_url_not_set")); // Using translate
    }
    if (TELEGRAM_BOT_USERNAME === "YourBotUsernameWithoutAtSign") {
        console.warn("Developer Note: TELEGRAM_BOT_USERNAME is using placeholder in script.js.");
    }

    let TELEGRAM_INIT_DATA = tg.initData;
    if (!TELEGRAM_INIT_DATA && tg.initDataUnsafe) {
        console.warn("tg.initData is empty. Using tg.initDataUnsafe.hash.");
        TELEGRAM_INIT_DATA = tg.initDataUnsafe.hash;
    }
    if (!TELEGRAM_INIT_DATA && (!tg.initDataUnsafe || !tg.initDataUnsafe.query_id)) {
        const errorMsg = translate("init_data_missing_alert");
        tg.showAlert(errorMsg);
        document.body.innerHTML = translate("fatal_error_init_data_missing_html");
        return;
    }

    let currentUserProfile = null;
    let viewHistory = [];
    let currentViewId = '';
    let predefinedCharacters = [];
    let userCreatedCharactersCache = []; // For 'My Creations'
    let publicCharactersData = { featured: [], recent: [] }; // Separate cache for public tabs
    let storeDataCache = null;
    let currentCharacterDetailData = null;
    
    // --- MULTILINGUAL UI ---
    let translations = {};
    let currentSelectedLanguage = 'en'; // Default

    async function loadTranslations(lang) {
        try {
            const response = await fetch('translations.json');
            if (!response.ok) throw new Error(`Failed to load translations.json: ${response.status}`);
            const allTranslations = await response.json();
            translations = allTranslations[lang] || allTranslations['en']; // Fallback to English
            currentSelectedLanguage = lang; // Update global state
        } catch (error) {
            console.error("Error loading translations:", error);
            // Try to load English as a hard fallback if the selected one failed for some reason
            if (lang !== 'en') {
                try {
                    const response = await fetch('translations.json');
                    const allTranslations = await response.json();
                    translations = allTranslations['en'];
                } catch (e) { console.error("Failed to load English fallback translations", e); }
            }
        }
    }

    function translate(key, params = {}) {
        let text = translations[key] || key; // Fallback to key if not found
        for (const paramKey in params) {
            text = text.replace(`{${paramKey}}`, params[paramKey]);
        }
        return text;
    }
    
    function translateElement(element) {
        const key = element.dataset.translateKey;
        const placeholderKey = element.dataset.translateKeyPlaceholder;
        const ariaLabelKey = element.dataset.translateKeyAriaLabel;
        const htmlKey = element.dataset.translateKeyHtml; // For elements that contain HTML needing translation variables

        if (key && translations[key]) {
            element.textContent = translate(key);
        }
        if (placeholderKey && translations[placeholderKey]) {
            element.placeholder = translate(placeholderKey);
        }
        if (ariaLabelKey && translations[ariaLabelKey]) {
            element.setAttribute('aria-label', translate(ariaLabelKey));
        }
        if (htmlKey && translations[htmlKey]) {
            let params = {};
            for (const attr in element.dataset) {
                if (attr.startsWith('translateVar')) {
                    const paramName = attr.substring('translateVar'.length).toLowerCase();
                    params[paramName] = element.dataset[attr];
                }
            }
            element.innerHTML = translate(htmlKey, params);
        }
    }

    async function applyTranslations(lang) {
        await loadTranslations(lang);
        document.querySelectorAll('[data-translate-key], [data-translate-key-placeholder], [data-translate-key-aria-label], [data-translate-key-html]').forEach(translateElement);
        // Update dynamic content that might have been rendered before translations loaded or needs re-render
        if (currentUserProfile) updateSettingsViewFromProfile(); // Language display might change
        document.title = translate("app_title"); // Translate document title

        // Specific updates that might rely on translated text from objects (like plans)
        if (currentViewId === 'plan' && storeDataCache && storeDataCache.premium_plans.length > 0) {
             const selectedPlanEl = document.querySelector('#plan-options-container .plan-option.selected');
             if(selectedPlanEl && selectedPlanEl.dataset.itemId){
                 const planData = storeDataCache.premium_plans.find(p => p.item_id === selectedPlanEl.dataset.itemId);
                 if(planData) updatePlanFeaturesDisplay(planData); // Re-render plan features which uses button text
             }
        }
        // Re-render other dynamic texts if necessary
        updateCharacterCreationCostDisplay(); // Ensure creation cost text is updated with current lang
    }
    // --- END MULTILINGUAL UI ---


    const CHARACTER_CREATION_COST_GEMS_UI = 15; // Default client-side, will be confirmed/overridden by server if available.

    const views = { /* same as before */
        characters: document.getElementById('characters-view'), usersCharacters: document.getElementById('users-characters-view'),
        myCharacters: document.getElementById('my-characters-view'), characterDetail: document.getElementById('character-detail-view'),
        settings: document.getElementById('settings-view'), createCharacter: document.getElementById('create-character-view'),
        editCharacter: document.getElementById('edit-character-view'), rechargeEnergy: document.getElementById('recharge-energy-view'),
        plan: document.getElementById('plan-view'), paymentSubscription: document.getElementById('payment-subscription-view'),
        language: document.getElementById('language-view'), store: document.getElementById('store-view'),
        paymentItem: document.getElementById('payment-item-view')
    };
    const gemBarContainerOuter = document.getElementById('gem-bar-container-outer');
    const adminPanelLinkContainer = document.getElementById('admin-panel-link-container'); // New
    const bottomNavBar = document.getElementById('bottom-nav-bar');
    const predefinedCharacterGrid = document.getElementById('character-grid');
    const publicCharacterGrid = document.getElementById('public-character-grid');
    const myCharacterListEl = document.getElementById('my-character-list');
    const noPublicCharsMsg = document.getElementById('no-public-characters-message');
    const noMyCharsMsg = document.getElementById('no-my-characters-message');
    const charNameInput = document.getElementById('char-name'), charDescInput = document.getElementById('char-desc'),
          charDetailsInput = document.getElementById('char-details'), charImageInput = document.getElementById('char-image'),
          saveCharBtn = document.getElementById('save-character-btn');
    const createCharCostGemsSpan = document.getElementById('create-char-cost-gems'); // For the note text
    const createCharCostBtnGemsSpan = document.getElementById('create-char-cost-btn-gems'); // For the button text's gem part

    const planOptionsContainer = document.getElementById('plan-options-container');
    const planFeaturesListEl = document.getElementById('plan-features-list');
    const storeGemGridContainer = document.getElementById('store-gem-grid-container');
    
    const rechargeEnergyViewInput = document.getElementById('energy-amount');
    const rechargeEnergyStarsDisplay = document.getElementById('estimated-energy-stars'); // Used in recharge-energy-stars-text P tag
    const rechargeEnergyStarsText = document.getElementById('estimated-energy-stars-text');
    const rechargeEnergyConfirmBtn = document.getElementById('confirm-recharge-btn');

    const charDetailImage = document.getElementById('char-detail-image');
    const charDetailName = document.getElementById('char-detail-name');
    const charDetailDesc = document.getElementById('char-detail-desc');
    const charDetailFullDetailsSection = document.getElementById('char-detail-full-details-section');
    const charDetailFullDetails = document.getElementById('char-detail-full-details');
    const charDetailCreatorInfoSection = document.getElementById('char-detail-creator-info-section'); // New
    const charDetailCreatorUsername = document.getElementById('char-detail-creator-username'); // New
    const charDetailCreatorCharCreatedDate = document.getElementById('char-detail-creator-char-created-date'); // New
    const charDetailCreatorUserJoinedDate = document.getElementById('char-detail-creator-user-joined-date'); // New

    const startCharacterBtn = document.getElementById('start-character-btn');


    async function makeApiRequest(endpoint, method = 'GET', body = null, authenticated = true) {
        const headers = { 'Content-Type': 'application/json' };
        if (authenticated && !TELEGRAM_INIT_DATA) {
            tg.showAlert(translate("init_data_missing_alert"));
            throw new Error("Missing Telegram InitData for authenticated API request.");
        }
        if (authenticated) headers['X-Telegram-Init-Data'] = TELEGRAM_INIT_DATA;

        const config = { method, headers };
        if (body && (method === 'POST' || method === 'PATCH' || method === 'DELETE')) {
            config.body = JSON.stringify(body);
        }

        try {
            tg.MainButton.showProgress();
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            if (!response.ok) {
                let errorData, errorDetailMessage = translate("general_api_error_alert", {status: response.status, statusText: response.statusText});
                try {
                    errorData = await response.json();
                    if (errorData && errorData.detail) {
                        errorDetailMessage = Array.isArray(errorData.detail) ? errorData.detail.map(err => `${err.loc ? err.loc.join('.')+": " : ''}${err.msg}`).join('; ') : String(errorData.detail);
                    } else if(typeof errorData === 'object' && errorData !== null) { errorDetailMessage = JSON.stringify(errorData); }
                    else if (typeof errorData === 'string' && errorData.length > 0) { errorDetailMessage = errorData; }
                } catch (e) { /* use default */ }
                console.error(`API Error (${response.status}) for ${method} ${endpoint}:`, errorDetailMessage, errorData);
                tg.HapticFeedback.notificationOccurred('error');
                tg.showAlert(errorDetailMessage);
                throw new Error(errorDetailMessage);
            }
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            console.error(`Network or other error for ${method} ${endpoint}:`, error);
            if (!error.message.startsWith(translate("general_api_error_alert",{status: '', statusText: ''}).split(':')[0])) { 
                 tg.showAlert(translate("network_error_alert", {message: error.message}));
            }
            throw error;
        } finally {
            tg.MainButton.hideProgress();
        }
    }

    function updateGemBar() { /* same as before */
        gemBarContainerOuter.innerHTML = ''; if (!currentUserProfile) {gemBarContainerOuter.innerHTML = translate("loading_text"); return; }
        let remEnergyDisp = currentUserProfile.total_remaining_energy_today;
        if (remEnergyDisp === "unlimited" || (typeof remEnergyDisp === 'number' && !isFinite(remEnergyDisp))) remEnergyDisp = '∞';
        else if (typeof remEnergyDisp === 'number') remEnergyDisp = Math.floor(remEnergyDisp); 

        gemBarContainerOuter.innerHTML = `<div class="gem-bar"><span class="gem-icon">💎</span><span class="gem-count">${currentUserProfile.gems}</span><span class="energy-icon">⚡️</span><span class="energy-status">${remEnergyDisp}</span><button class="plus-btn" id="gem-bar-plus-btn">➕</button></div>`;
        document.getElementById('gem-bar-plus-btn').onclick = () => showView('store');
    }
    
    function updateAdminPanelLink() { // New Function
        if (!adminPanelLinkContainer || !currentUserProfile) return;
        adminPanelLinkContainer.innerHTML = ''; // Clear previous
        if (currentUserProfile.is_sudo || currentUserProfile.is_owner) {
            const adminLink = document.createElement('a');
            adminLink.href = ADMIN_PANEL_URL;
            adminLink.className = 'action-button stylish-button'; // Re-use existing button style
            adminLink.style.padding = '6px 12px'; // Make it smaller
            adminLink.style.fontSize = '0.75em';
            adminLink.textContent = 'Admin Panel';
            adminLink.onclick = (e) => { e.preventDefault(); tg.openLink(ADMIN_PANEL_URL, {try_instant_view: false}); }; // Use tg.openLink
            adminPanelLinkContainer.appendChild(adminLink);
        }
    }

    async function updateSettingsViewFromProfile() { // Modified for translation
        if (!currentUserProfile || !views.settings.classList.contains('active-view')) return;
        const settings = currentUserProfile.settings;
        const planCardText = views.settings.querySelector('.settings-plan-card span');
        const upgradeBtn = document.getElementById('settings-upgrade-plan-btn');
        
        if (planCardText && upgradeBtn) {
            if (currentUserProfile.is_premium_active) {
                planCardText.textContent = `${translate("settings_plan_header_value_premium") || 'Premium'} (${currentUserProfile.premium_expires_in_str || translate('active_plan_status') || 'Active'})`; // Assuming new translation keys
                upgradeBtn.textContent = translate("settings_manage_plan_btn");
            } else {
                planCardText.textContent = translate("settings_free_user_plan");
                upgradeBtn.textContent = translate("settings_upgrade_btn");
            }
            upgradeBtn.onclick = () => showView('plan');
        }

        currentSelectedLanguage = settings.selected_ui_language || 'en'; // Ensure currentSelectedLanguage is up-to-date
        await applyTranslations(currentSelectedLanguage); // Re-apply translations to update all dependent texts like current lang display

        const styleLabels = views.settings.querySelectorAll('.style-label');
        const styleImages = { realistic: document.getElementById('style-realistic'), anime: document.getElementById('style-anime') };
        styleLabels.forEach(label => {
            const isRealistic = label.classList.contains('realistic');
            const isActive = (isRealistic && settings.selected_ui_style === 'realistic') || (!isRealistic && settings.selected_ui_style === 'anime');
            label.classList.toggle('active', isActive);
            label.querySelector('.checkbox-custom').classList.toggle('checked', isActive);
            if (styleImages.realistic) styleImages.realistic.classList.toggle('active', settings.selected_ui_style === 'realistic');
            if (styleImages.anime) styleImages.anime.classList.toggle('active', settings.selected_ui_style === 'anime');
        });
    }
    
    tg.BackButton.onClick(() => { if (viewHistory.length > 0) { const prev = viewHistory.pop(); showView(prev, false, {}, true); }});
    function updateTelegramBackButton() { if (viewHistory.length > 0) tg.BackButton.show(); else tg.BackButton.hide(); }

    async function showView(viewId, isBack = false, params = {}, isBackNav = false) { /* (Existing logic, with call to applyTranslations at the end if appropriate for the view) */
        const oldViewId = currentViewId;
        if (!isBackNav && oldViewId && oldViewId !== viewId) { viewHistory.push(oldViewId); }
        if (isBack && !isBackNav && viewHistory.length > 0 && viewHistory[viewHistory.length -1] === viewId) { viewHistory.pop(); }

        for (const id in views) { if (views[id]) views[id].style.display = 'none'; }
        if (views[viewId]) { views[viewId].style.display = 'flex'; views[viewId].classList.add('active-view'); }
        else { console.error("View not found:", viewId); return; }
        if (oldViewId && views[oldViewId]) views[oldViewId].classList.remove('active-view');
        
        currentViewId = viewId;
        updateTelegramBackButton();
        window.scrollTo(0, 0);
        updateStickyHeaderAndNav(viewId, params); 

        try {
            tg.MainButton.showProgress();
            if (viewId === 'characters') await populatePredefinedCharacters();
            else if (viewId === 'usersCharacters') await populatePublicCharacters();
            else if (viewId === 'myCharacters') await populateMyCharacters();
            else if (viewId === 'settings' && currentUserProfile) await updateSettingsViewFromProfile(); // Made async for translations
            else if (viewId === 'store' || viewId === 'plan') await populateStoreAndPlanViews();
            if (viewId === 'characterDetail' && params.characterData) populateCharacterDetailView(params.characterData);
            if (viewId === 'editCharacter' && params.charId) await loadCharacterForEditing(params.charId);
             if (viewId === 'createCharacter') updateCharacterCreationCostDisplay();


        } catch (error) { console.error(`Error populating view ${viewId}:`, error); }
        finally {
            tg.MainButton.hideProgress();
            await applyTranslations(currentSelectedLanguage); // Apply translations after view logic potentially changes content
        }
    }

    function updateStickyHeaderAndNav(viewId, params = {}) { /* (logic largely same, but consider if any part of it depends on translations) */
        updateGemBar(); updateAdminPanelLink(); // Ensure admin link is updated too
        const viewsWithBottomNav = ['characters', 'usersCharacters', 'settings', 'createCharacter'];
        bottomNavBar.style.display = viewsWithBottomNav.includes(viewId) ? 'flex' : 'none';
        if (viewsWithBottomNav.includes(viewId)) {
            document.querySelectorAll('.bottom-nav-item').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view.startsWith(viewId));
            });
        }
        
        currentCharacterDetailData = params || {};
        const paymentBotNameEls = document.querySelectorAll('#payment-item-view .payment-bot-name, #payment-subscription-view .payment-bot-name');
        const botNameToDisplay = translate("payment_bot_name_default"); // Use translated bot name

        if (viewId === 'paymentItem' && params) {
            const pItemAvatar = document.getElementById('payment-item-avatar');
            const pItemTitle = document.getElementById('payment-item-purchase-title');
            const pItemDetails = document.getElementById('payment-item-details');
            const pItemTotal = document.getElementById('payment-item-total-stars');
            
            paymentBotNameEls.forEach(el => el.textContent = botNameToDisplay);

            if (params.type === 'gems') {
                if (pItemTitle) pItemTitle.textContent = translate("payment_item_purchasing_text_gems", { name: params.name || (params.amount + ' Gems')}); // Assuming keys like payment_item_purchasing_text_gems
                if (pItemDetails) pItemDetails.textContent = `${params.amount || params.gems_amount} Gems Pack`;
                if (pItemAvatar) pItemAvatar.src = 'https://placehold.co/80x80/4FC3F7/FFFFFF/png?text=Gems&font=roboto';
            } else if (params.type === 'energy_xtr') {
                if (pItemTitle) pItemTitle.textContent = translate("payment_item_purchasing_text_energy", { name: params.name || (params.amount + ' Energy')}); // Keys like payment_item_purchasing_text_energy
                if (pItemDetails) pItemDetails.textContent = `${params.amount || params.energy_amount} Energy Pack`;
                if (pItemAvatar) pItemAvatar.src = 'https://placehold.co/80x80/FFD700/333333/png?text=⚡&font=roboto';
            }
            if (pItemTotal && params.stars_cost) pItemTotal.innerHTML = `${params.stars_cost} <span class="telegram-star">⭐</span>`;
        } else if (viewId === 'paymentSubscription' && params && params.planDetails) {
            const subTitle = document.getElementById('payment-sub-plan-details');
            const subTotal = document.getElementById('payment-sub-total-stars');
            const paymentDescDiv = document.querySelector('#payment-subscription-view .payment-description > div:first-child');
           
            paymentBotNameEls.forEach(el => el.textContent = botNameToDisplay);

            if(paymentDescDiv) paymentDescDiv.textContent = translate("payment_sub_purchasing_text_specific", { planName: params.planDetails.name }); // key: payment_sub_purchasing_text_specific
            if(subTitle) subTitle.textContent = params.planDetails.name;
            if(subTotal && params.stars_cost) subTotal.innerHTML = `${params.stars_cost} <span class="telegram-star">⭐</span>`;
        }
        // Recharge energy view cost display with translation
        if(viewId === 'rechargeEnergy' && rechargeEnergyStarsText){
            const cost = (storeDataCache && storeDataCache.energy_packs_xtr && storeDataCache.energy_packs_xtr.length > 0) ? storeDataCache.energy_packs_xtr[0].price_xtr : '?';
            rechargeEnergyStarsText.innerHTML = translate("recharge_energy_cost_in_stars", { cost: cost });
        }

    }
    function updateCharacterCreationCostDisplay() { // New dedicated function
        const cost = CHARACTER_CREATION_COST_GEMS_UI; // This might get updated from API in future
        const noteEl = document.getElementById('creation-cost-note-text');
        const btnEl = document.getElementById('save-character-btn');

        if (noteEl) {
            noteEl.dataset.translateVarCost = cost; // Update for data-translate-key-html
            noteEl.innerHTML = translate("char_form_creation_cost_note", {cost: cost});
        }
        if (btnEl) {
             btnEl.dataset.translateVarCost = cost;
             btnEl.innerHTML = translate("char_form_create_character_btn", {cost: cost});
        }
    }


    async function initializeApp() {
        tg.MainButton.setParams({text: 'LOADING...', color: '#7C5CFF', is_visible: true, is_active: false}).showProgress();
        let initialLang = tg.initDataUnsafe?.user?.language_code || 'en';
        // Normalize lang code (e.g., 'ru-RU' to 'ru')
        if (initialLang.includes('-')) initialLang = initialLang.split('-')[0];
        
        await loadTranslations(initialLang); // Load initial translations
        currentSelectedLanguage = initialLang;

        try {
            currentUserProfile = await makeApiRequest('/users/me');
            if (currentUserProfile && currentUserProfile.settings && currentUserProfile.settings.selected_ui_language && currentUserProfile.settings.selected_ui_language !== currentSelectedLanguage) {
                await loadTranslations(currentUserProfile.settings.selected_ui_language); // Reload with user's preference
                currentSelectedLanguage = currentUserProfile.settings.selected_ui_language;
            }
            // Assuming API can provide this value if it's dynamic and set in config.py for CHARACTER_CREATION_COST_GEMS
            // For now, CHARACTER_CREATION_COST_GEMS_UI remains client-side or relies on fixed translations.js var.
            
            await populateStoreDataCache();
            await showView('characters'); // Show default view (this will also trigger applyTranslations)
            
        } catch (error) {
            document.body.innerHTML = `<div style='color:white;padding:20px;text-align:center;'>${translate("fatal_error_init_data_missing_html") || `Initialization Error: ${error.message}. Close & reopen.`}</div>`;
        } finally {
            tg.MainButton.hideProgress().hide();
        }
    }

    async function populateStoreDataCache() { if(!storeDataCache){ try {storeDataCache = await makeApiRequest('/store/items', 'GET', null, false);}catch(e){console.error("Failed to get store items",e)}} }
    
    async function populatePredefinedCharacters() {
        if (!predefinedCharacterGrid) return; 
        try { 
            predefinedCharacters = await makeApiRequest('/characters/predefined','GET',null,false); 
            predefinedCharacterGrid.innerHTML=''; 
            if(!predefinedCharacters||!predefinedCharacters.length){
                predefinedCharacterGrid.innerHTML=`<p class="empty-state-message">${translate("no_public_characters_message")}</p>`; return;
            } 
            predefinedCharacters.forEach(cd => { 
                const card = document.createElement('div'); 
                card.className='character-card'; card.dataset.idToSend=cd.id_to_send; 
                card.innerHTML = `
                    <div class="character-image-container">
                        <img class="character-image" src="${cd.image_url || 'https://placehold.co/300x400/2D2542/E0E0E0/png?text='+encodeURIComponent(cd.display_name.charAt(0))}" alt="${cd.display_name}">
                    </div>
                    <div class="character-info">
                        <h3 class="character-name">${cd.display_name}${cd.icon?'<span class="card-icon">'+cd.icon+'</span>':''}</h3>
                        <p class="character-description">${cd.description}</p>
                    </div>`; 
                card.onclick=()=>{ 
                    const detailData={type:'predefined', id_to_send:cd.id_to_send, name:cd.display_name, description:cd.description, details:cd.system_prompt, image_url:cd.image_url||'https://placehold.co/300x400/2D2542/E0E0E0/png?text='+encodeURIComponent(cd.display_name.charAt(0))}; 
                    showView('characterDetail',false,{characterData:detailData})
                }; 
                predefinedCharacterGrid.appendChild(card); 
            }); 
        } catch(e){ 
            if(predefinedCharacterGrid) predefinedCharacterGrid.innerHTML=`<p class="empty-state-message">${translate("error_loading_characters")}</p>`;
        }
    }

    async function populateMyCharacters() { /* same using makeApiRequest('/characters/user/mine') */
        if(!myCharacterListEl) return; 
        try { 
            userCreatedCharactersCache = await makeApiRequest('/characters/user/mine'); 
            myCharacterListEl.innerHTML = ''; 
            if (!userCreatedCharactersCache || !userCreatedCharactersCache.length) { 
                if(noMyCharsMsg) { 
                    noMyCharsMsg.innerHTML = translate("no_my_characters_message") + ' <a href="#" id="create-first-character-link-dynamic">' + translate("create_first_character_link") + '</a>';
                    myCharacterListEl.appendChild(noMyCharsMsg); 
                    noMyCharsMsg.style.display = 'block';
                    document.getElementById('create-first-character-link-dynamic')?.addEventListener('click', (e) => { e.preventDefault(); showView('createCharacter'); });
                } return; 
            } 
            if(noMyCharsMsg) noMyCharsMsg.style.display = 'none'; 
            userCreatedCharactersCache.forEach(cd => { 
                const card = document.createElement('div'); 
                card.className='my-character-card'; card.dataset.charId=cd.char_id; 
                card.innerHTML=`
                    <img class="character-image-thumb" src="${cd.image_url || 'https://placehold.co/70x90/4B4265/E0E0E0/png?text='+translate('no_image_text')}" alt="${cd.name}">
                    <div class="my-character-details">
                        <span class="my-character-status ${cd.visibility}">${translate('char_form_visibility_'+cd.visibility) || cd.visibility}</span>
                        <h3 class="my-character-name">${cd.name}</h3>
                        <p class="my-character-desc">${cd.description}</p>
                        <div class="my-character-actions">
                            <button class="action-btn toggle-visibility">${cd.visibility === 'public' ? translate('make_private_btn') : translate('make_public_btn')}</button>
                            <button class="action-btn edit">${translate('edit_btn')}</button>
                            <button class="action-btn delete">${translate('delete_btn')}</button>
                        </div>
                    </div>`; 
                card.querySelector('.toggle-visibility').onclick=(e)=>{e.stopPropagation();toggleCharacterVisibility(cd.char_id, cd.visibility)}; 
                card.querySelector('.edit').onclick=(e)=>{e.stopPropagation();showView('editCharacter',false,{charId:cd.char_id})}; 
                card.querySelector('.delete').onclick=(e)=>{e.stopPropagation();deleteCharacter(cd.char_id, cd.name)}; 
                card.onclick=(e)=>{if(e.target.closest('.action-btn'))return;showView('characterDetail',false,{characterData:{type:'user_created',...cd}})}; 
                myCharacterListEl.appendChild(card); 
            }); 
        } catch(e){
            if(myCharacterListEl) myCharacterListEl.innerHTML=`<p class="empty-state-message">${translate("error_loading_your_characters")}</p>`;
        }
    }

    async function toggleCharacterVisibility(charId, currentVisibility) { 
        const newVisibility = currentVisibility==='public'?'private':'public'; 
        try{ 
            await makeApiRequest(`/characters/user/${charId}`,'PATCH',{visibility:newVisibility}); 
            tg.HapticFeedback.impactOccurred('light'); 
            populateMyCharacters(); // Refresh "My Creations"
            publicCharactersData={featured:[],recent:[]}; // Clear public cache so it re-fetches if user goes there
        } catch(e){/*handled by makeApiRequest*/} 
    }
    
    async function deleteCharacter(charId, charName) { 
        tg.showConfirm(translate("delete_char_confirm_title", {name: charName}), async(ok)=>{
            if(ok){
                try{ 
                    await makeApiRequest(`/characters/user/${charId}`,'DELETE'); 
                    tg.HapticFeedback.notificationOccurred('success'); 
                    populateMyCharacters(); 
                    publicCharactersData={featured:[],recent:[]};
                }catch(e){/*handled*/}
            }
        }); 
    }
    
    let publicCharSearchTimeout; 
    const usersCharacterSearchInput = document.getElementById('users-character-search-input');
    const usersCharacterTabs = document.querySelectorAll('#users-characters-view .tab-button');
    let currentPublicCharTab = 'featured';
    let currentPublicCharSearchTerm = '';

    async function populatePublicCharacters() { // Modified for creator username
         if (!publicCharacterGrid) return; 
         try { 
            const params = new URLSearchParams({sort_by: currentPublicCharTab, limit:30}); 
            if(currentPublicCharSearchTerm)params.append('search',currentPublicCharSearchTerm); 
            const chars = await makeApiRequest(`/characters/user/public?${params.toString()}`,'GET',null,true); // Changed to true for auth
            publicCharacterGrid.innerHTML=''; 
            if(!chars || !chars.length){
                if(noPublicCharsMsg){
                    noPublicCharsMsg.textContent = translate("no_public_characters_message");
                    publicCharacterGrid.appendChild(noPublicCharsMsg); 
                    noPublicCharsMsg.style.display='block';
                }
                return;
            } 
            if(noPublicCharsMsg)noPublicCharsMsg.style.display='none'; 
            chars.forEach(cd => {
                const card=document.createElement('div');
                card.className='character-card';
                card.dataset.charId=cd.char_id;
                // Add creator info display
                let creatorUsername = cd.owner_details && cd.owner_details.username ? `@${cd.owner_details.username}` : (cd.owner_details && cd.owner_details.first_name ? cd.owner_details.first_name : `User ${cd.owner_user_id.toString().slice(-4)}`);

                card.innerHTML=`
                    <div class="character-image-container">
                        <img class="character-image" src="${cd.image_url||'https://placehold.co/300x400/4B4265/E0E0E0/png?text='+encodeURIComponent(translate('no_image_text'))}" alt="${cd.name}">
                         ${cd.is_featured ? '<span class="featured-badge">⭐ Featured</span>':''}
                    </div>
                    <div class="character-info">
                        <h3 class="character-name">${cd.name}</h3>
                        <p class="character-description">${cd.description}</p>
                        <p class="character-creator-info">${translate('char_detail_creator_label')} ${creatorUsername}</p>
                    </div>`;
                card.onclick=()=>{showView('characterDetail',false,{characterData:{type:'user_created',...cd}})};
                publicCharacterGrid.appendChild(card);
            });
        } catch(e){
            if(publicCharacterGrid) publicCharacterGrid.innerHTML=`<p class="empty-state-message">${translate("error_loading_characters")}</p>`;
        }
    }
     if (usersCharacterSearchInput) { usersCharacterSearchInput.addEventListener('input', (e) => { currentPublicCharSearchTerm = e.target.value.trim(); clearTimeout(publicCharSearchTimeout); publicCharSearchTimeout = setTimeout(populatePublicCharacters, 400); });}
     usersCharacterTabs.forEach(tab => { tab.addEventListener('click', () => { usersCharacterTabs.forEach(t => t.classList.remove('active')); tab.classList.add('active'); currentPublicCharTab = tab.dataset.tab; usersCharacterSearchInput.value = ''; currentPublicCharSearchTerm = ''; populatePublicCharacters(); });});

    function formatDate(dateString) { // Helper for displaying dates
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(currentSelectedLanguage, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch(e) { return dateString; } // fallback to original if parsing fails
    }

    function populateCharacterDetailView(charData) {
        currentCharacterDetailData = charData;
        if(charDetailImage) charDetailImage.src = charData.image_url || 'https://placehold.co/600x800/333/fff?text='+translate('no_image_text');
        if(charDetailName) charDetailName.textContent = charData.name;
        if(charDetailDesc) charDetailDesc.textContent = charData.description;
        if(charDetailFullDetailsSection && charDetailFullDetails) {
            if (charData.details && charData.details.trim() !== "") { 
                charDetailFullDetails.textContent = charData.details; 
                charDetailFullDetailsSection.style.display = 'block'; 
            } else { charDetailFullDetailsSection.style.display = 'none'; }
        }

        // Populate Creator Info if available
        if (charData.type === 'user_created' && charData.owner_details) {
            if(charDetailCreatorUsername) charDetailCreatorUsername.textContent = charData.owner_details.username ? `@${charData.owner_details.username}` : (charData.owner_details.first_name || `User ${charData.owner_user_id}`);
            if(charDetailCreatorCharCreatedDate) charDetailCreatorCharCreatedDate.textContent = formatDate(charData.created_at);
            
            // If API provides owner_details.user_created_at for "User Joined"
            const userJoinedDate = charData.owner_details.user_created_at; // Assuming this is sent by API for owner_details
            if(charDetailCreatorUserJoinedDate) charDetailCreatorUserJoinedDate.textContent = userJoinedDate ? formatDate(userJoinedDate) : 'N/A';

            if(charDetailCreatorInfoSection) charDetailCreatorInfoSection.style.display = 'block';
        } else {
            if(charDetailCreatorInfoSection) charDetailCreatorInfoSection.style.display = 'none';
        }
    }


    const editingCharField = document.getElementById('editing-char-id');
    const editCharNameInput = document.getElementById('edit-char-name'), editCharDescInput = document.getElementById('edit-char-desc'),
          editCharDetailsInput = document.getElementById('edit-char-details'), editCharImageInput = document.getElementById('edit-char-image'),
          saveEditedCharBtn = document.getElementById('save-edited-character-btn');
    async function loadCharacterForEditing(charId) { 
        try {
            const char=await makeApiRequest(`/characters/user/${charId}`); 
            if(char){
                editingCharField.value=charId; 
                editCharNameInput.value=char.name;
                editCharDescInput.value=char.description;
                editCharDetailsInput.value=char.details||'';
                editCharImageInput.value=char.image_url||'';
                setSegmentedControlValue('edit-char-visibility-segment',char.visibility);
            }else{
                tg.showAlert(translate('character_not_found_alert')); showView('myCharacters',true);
            }
        }catch(e){showView('myCharacters',true);}
    }
    if (saveEditedCharBtn) { 
        saveEditedCharBtn.addEventListener('click', async () => { 
            const charId=editingCharField.value; 
            const data={
                name:editCharNameInput.value.trim(),
                description:editCharDescInput.value.trim(),
                details:editCharDetailsInput.value.trim(),
                image_url:editCharImageInput.value.trim()===""?null:editCharImageInput.value.trim(),
                visibility:getSegmentedControlValue('edit-char-visibility-segment')
            }; 
            if(!data.name||!data.description){tg.showAlert(translate("name_desc_required_alert"));return;} 
            try{
                const saved=await makeApiRequest(`/characters/user/${charId}`,'PATCH',data);
                tg.HapticFeedback.notificationOccurred('success');
                tg.showAlert(translate("char_updated_message", {name: saved.name})); 
                publicCharactersData={featured:[],recent:[]}; // Clear public cache
                showView('myCharacters',true);
            }catch(e){/*handled by makeApiRequest*/}
        }); 
    }

    // --- CREATE CHARACTER BUTTON FIX ---
    if(saveCharBtn){
        saveCharBtn.addEventListener('click', async () => {
            const charData = {
                name: charNameInput.value.trim(),
                description: charDescInput.value.trim(),
                details: charDetailsInput.value.trim(),
                image_url: charImageInput.value.trim() === "" ? null : charImageInput.value.trim(), // Send null if empty
                visibility: getSegmentedControlValue('char-visibility-segment')
            };

            if (!charData.name || !charData.description) {
                tg.showAlert(translate("name_desc_required_alert"));
                return;
            }

            // Gem check (client-side pre-check, server will also validate)
            const creationCost = CHARACTER_CREATION_COST_GEMS_UI; // This might get dynamic later
            if (currentUserProfile && currentUserProfile.gems < creationCost) {
                tg.showAlert(translate("insufficient_gems_alert", {userGems: currentUserProfile.gems, cost: creationCost}));
                return;
            }

            try {
                const createdChar = await makeApiRequest('/characters/user', 'POST', charData);
                tg.HapticFeedback.notificationOccurred('success');
                tg.showAlert(`Character "${createdChar.name}" created successfully!`);
                // Refresh user profile to update gem count
                currentUserProfile = await makeApiRequest('/users/me'); 
                updateGemBar();
                
                // Clear form
                charNameInput.value = ''; charDescInput.value = ''; charDetailsInput.value = ''; charImageInput.value = '';
                setSegmentedControlValue('char-visibility-segment', 'public');
                
                populateMyCharacters(); // Refresh user's character list
                publicCharactersData = { featured: [], recent: [] }; // Clear public cache as new char might be public
                showView('myCharacters', true); // Navigate back to "My Creations"
            } catch (error) {
                // API request errors are handled by makeApiRequest and will show an alert
                console.error("Failed to create character:", error);
            }
        });
    }
    // --- END CREATE CHARACTER FIX ---


    async function requestAndOpenTelegramLink(apiEndpoint, requestBody, successMsgKey, closeAfterOpen = true) { /* same */
        try {
            const response = await makeApiRequest(apiEndpoint, 'POST', requestBody);
            const link = response.telegram_invoice_link || response.telegram_select_character_link;
            if (link) {
                tg.openTelegramLink(link);
                if (closeAfterOpen) { setTimeout(() => tg.close(), 500); } 
            } else { tg.showAlert("Could not generate required link."); }
        } catch (error) { console.error(`LinkGen Error for ${apiEndpoint}:`, error); }
    }
    if (startCharacterBtn) startCharacterBtn.onclick = async () => { if (!currentCharacterDetailData) return; await requestAndOpenTelegramLink('/telegram/generate-select-character-link', { character_id: currentCharacterDetailData.id_to_send || currentCharacterDetailData.char_id, character_type: currentCharacterDetailData.type }, 'char_select', true);};
    
    async function populateStoreAndPlanViews() { /* (Mostly same, ensure texts like button content are translated if static) */
        if (!storeDataCache) await populateStoreDataCache(); 
        if (!storeDataCache) { tg.showAlert(translate("failed_to_get_store_items_alert")); return; }
        
        if (storeGemGridContainer) { 
            storeGemGridContainer.innerHTML = ''; 
            if(storeDataCache.gem_packs && storeDataCache.gem_packs.length > 0){
                storeDataCache.gem_packs.forEach(p => { 
                    const el = document.createElement('div'); el.className = 'store-gem-pack'; 
                    el.innerHTML = `<img src="https://placehold.co/80x80/4FC3F7/FFFFFF/png?text=Gems&font=roboto" alt="${p.name}"><h4>${p.name} (${p.gems_amount}💎)</h4><p>${p.price_xtr}⭐ ${p.bonus_info||''}</p>`; 
                    el.onclick = () => { currentCharacterDetailData={type:'gems',item_id:p.item_id,name:p.name,amount:p.gems_amount,stars_cost:p.price_xtr}; showView('paymentItem', false, currentCharacterDetailData);}; 
                    storeGemGridContainer.appendChild(el);
                });
            } else {
                storeGemGridContainer.innerHTML = `<p class="empty-state-message">${translate("no_gem_packs_available") || "No gem packs available now."}</p>`;
            }
        }
        
        if (planOptionsContainer && planFeaturesListEl && storeDataCache.premium_plans) { 
            planOptionsContainer.innerHTML=''; 
            if(storeDataCache.premium_plans.length > 0){
                storeDataCache.premium_plans.forEach((p,idx)=>{
                    const el=document.createElement('div'); el.className='plan-option'; if(idx===0)el.classList.add('selected'); el.dataset.itemId=p.item_id;el.dataset.starsCost=p.price_xtr;
                    el.innerHTML=`<div><div class="plan-title">${p.name} <span class="plan-gems">+${p.gems_bonus}💎</span></div><div class="plan-price">${p.price_xtr}⭐ <span class="plan-period">/ ${p.duration_days} ${translate('days_abbreviation') || 'days'}</span></div></div><span class="radio-custom ${idx===0?'checked':''}"></span>`; // Assuming days_abbreviation
                    el.onclick=()=>{document.querySelectorAll('#plan-options-container .plan-option').forEach(o=>{o.classList.remove('selected');o.querySelector('.radio-custom').classList.remove('checked')}); el.classList.add('selected');el.querySelector('.radio-custom').classList.add('checked');updatePlanFeaturesDisplay(p);}; 
                    planOptionsContainer.appendChild(el);
                }); 
                updatePlanFeaturesDisplay(storeDataCache.premium_plans[0]);
            } else {
                planOptionsContainer.innerHTML = `<p class="empty-state-message">${translate("no_premium_plans_available") || "No premium plans available now."}</p>`;
                if(planFeaturesListEl) planFeaturesListEl.innerHTML = `<li>${translate("plan_features_loading_text")}</li>`;
            }
        }
        
        const storeRechargeBtn = document.getElementById('recharge-energy-btn'); 
        const storeEnergyInfoH3 = document.querySelector('#store-view .store-energy-info h3');
        const storeEnergyInfoP = document.querySelector('#store-view .store-energy-info p');
        if (storeRechargeBtn && storeEnergyInfoH3 && storeEnergyInfoP && storeDataCache.premium_plans && storeDataCache.premium_plans.length > 0) {
            const p = storeDataCache.premium_plans[0]; 
            storeEnergyInfoH3.textContent = translate("store_unlimited_energy_title_specific", {planName: p.name}); // Example: "Unlimited Energy (with {planName})"
            storeEnergyInfoP.textContent = translate("store_unlimited_energy_desc_specific", {starsCost: p.price_xtr}); // Example: "Upgrade for {starsCost} ⭐ for max daily energy!"
            storeRechargeBtn.textContent = translate("get_premium_btn_text") || "Get Premium";
            storeRechargeBtn.onclick = () => { currentCharacterDetailData={type:'paymentSubscription', planDetails: p, stars_cost: p.price_xtr}; showView('paymentSubscription', false, currentCharacterDetailData);};
        }
    }

    function updatePlanFeaturesDisplay(planData) { /* (ensure texts here like button text are translated) */ 
        if(!planFeaturesListEl) return; 
        planFeaturesListEl.innerHTML='';
        (planData.features || [translate("plan_features_loading_text")]).forEach(f=>{
            const li=document.createElement('li');
            if(f.toLowerCase().includes("enefdf"))li.innerHTML=`⚡ ${f}`;
            else if(f.toLowerCase().includes("gere"))li.innerHTML=`💎 ${f}`;
            else if(f.toLowerCase().includes("audo")||f.toLowerCase().includes("tffts"))li.innerHTML=`🗣️ ${f}`;
            else if(f.toLowerCase().includes("afgd")||f.toLowerCase().includes("mffodel"))li.innerHTML=`🧠 ${f}`; 
            else li.textContent=f;
            planFeaturesListEl.appendChild(li);
        }); 
        const planUpgBtn=document.getElementById('plan-upgrade-btn'); 
        if(planUpgBtn && currentViewId==='plan') {
            planUpgBtn.textContent = translate("upgrade_to_plan_btn_text", {planName: planData.name, starsCost: planData.price_xtr}) || `Upgrade to ${planData.name} (${planData.price_xtr} ⭐)`;
        }
    }

    document.getElementById('plan-upgrade-btn')?.addEventListener('click', ()=>{ const selPlanEl=document.querySelector('#plan-options-container .plan-option.selected'); if(selPlanEl && storeDataCache && storeDataCache.premium_plans){const plan=storeDataCache.premium_plans.find(p=>p.item_id===selPlanEl.dataset.itemId); if(plan){currentCharacterDetailData={type:'paymentSubscription',planDetails:plan, stars_cost:plan.price_xtr};showView('paymentSubscription',false,currentCharacterDetailData);}}});
    document.getElementById('payment-sub-confirm-btn')?.addEventListener('click', async () => { if(currentCharacterDetailData && currentCharacterDetailData.type === 'paymentSubscription' && currentCharacterDetailData.planDetails){ await requestAndOpenTelegramLink('/telegram/generate-invoice-link', { item_type: 'premium', item_id: currentCharacterDetailData.planDetails.item_id }, 'sub_invoice', true); } else {tg.showAlert(translate("plan_not_selected_alert"));}});
    document.getElementById('payment-item-confirm-btn')?.addEventListener('click', async () => { if(currentCharacterDetailData && (currentCharacterDetailData.type === 'gems' || currentCharacterDetailData.type === 'energy_xtr')){ await requestAndOpenTelegramLink('/telegram/generate-invoice-link', { item_type: currentCharacterDetailData.type, item_id: currentCharacterDetailData.item_id }, 'item_invoice', true); } else {tg.showAlert(translate("item_not_selected_alert"));}});
    
    if (rechargeEnergyConfirmBtn && rechargeEnergyViewInput && rechargeEnergyStarsText) { /* (input listener should call updateStickyHeaderAndNav to re-translate cost text if amount changes selection) */
        rechargeEnergyViewInput.addEventListener('input', () => {
            updateStickyHeaderAndNav('rechargeEnergy'); // To re-translate cost text
        });
        rechargeEnergyConfirmBtn.onclick = async () => {
            if (!storeDataCache || !storeDataCache.energy_packs_xtr || storeDataCache.energy_packs_xtr.length === 0) { tg.showAlert(translate("no_energy_packs_alert")); return; }
            const energyPackToBuy = storeDataCache.energy_packs_xtr[0];
            currentCharacterDetailData={ type:'energy_xtr', item_id: energyPackToBuy.item_id, name: energyPackToBuy.name, amount: energyPackToBuy.energy_amount, stars_cost: energyPackToBuy.price_xtr};
            showView('paymentItem', false, currentCharacterDetailData);
        };
    }

    const styleLabels = document.querySelectorAll('.style-label');
    styleLabels.forEach(label => { label.addEventListener('click', async () => { const newStyle = label.classList.contains('realistic') ? 'realistic' : 'anime'; try {await makeApiRequest('/users/me/settings','PATCH',{selected_ui_style:newStyle});if(currentUserProfile)currentUserProfile.settings.selected_ui_style=newStyle;tg.HapticFeedback.impactOccurred('light'); updateSettingsViewFromProfile();}catch(e){/* handled */}}); });
    
    document.querySelectorAll('.language-option').forEach(option => {
        option.addEventListener('click', async () => {
            const newLang = option.dataset.lang;
            if (currentSelectedLanguage === newLang) { showView('settings'); return; } // Already selected
            try {
                await makeApiRequest('/users/me/settings', 'PATCH', { selected_ui_language: newLang });
                // currentUserProfile will be updated with new language by server, no need to set client side
                // The new language will be fetched next time or in the response.
                // For immediate UI update:
                if(currentUserProfile) currentUserProfile.settings.selected_ui_language = newLang;
                currentSelectedLanguage = newLang; // Update global
                await applyTranslations(newLang); // Apply translations for the new language
                tg.HapticFeedback.notificationOccurred('success');
                showView('settings'); // This will call applyTranslations again but that's ok.
            } catch (e) { console.error("Failed to update language:", e); }
        });
    });

    function setupSegmentedControl(containerId) {const cont=document.getElementById(containerId);if(!cont)return;const btns=cont.querySelectorAll('.segment-button');btns.forEach(b=>{b.onclick=()=>{btns.forEach(btn=>btn.classList.remove('active'));b.classList.add('active');}});}
    setupSegmentedControl('char-visibility-segment');setupSegmentedControl('edit-char-visibility-segment');
    function getSegmentedControlValue(containerId){const act=document.querySelector(`#${containerId} .segment-button.active`);return act?act.dataset.value:'public';}
    function setSegmentedControlValue(containerId,value){document.querySelectorAll(`#${containerId} .segment-button`).forEach(b=>{b.classList.toggle('active',b.dataset.value===value);});}
    
    function getMappedViewId(view) { /* (same) */ const viewIdMap={"characters-view":"characters","users-characters-view":"usersCharacters","create-character-view":"createCharacter","settings-view":"settings"}; return viewIdMap[view]||view;}
    document.querySelectorAll('.bottom-nav-item').forEach(item => { item.addEventListener('click', () => { const mappedView=getMappedViewId(item.dataset.view); if(views[mappedView] && currentViewId!==mappedView){viewHistory=[];showView(mappedView);}});});
    document.getElementById('my-characters-btn')?.addEventListener('click', () => showView('myCharacters'));
    document.getElementById('create-first-character-link')?.addEventListener('click', (e)=>{e.preventDefault();showView('createCharacter');});
    document.getElementById('settings-language-btn')?.addEventListener('click', () => { showView('language'); });
    
    initializeApp();
});
