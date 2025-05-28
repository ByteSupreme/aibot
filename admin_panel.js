document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // --- IMPORTANT: Configure API_BASE_URL to match script.js ---
    const API_BASE_URL = 'https://cp7ghdz8-8000.inc1.devtunnels.ms/api/v1'; // From your main script.js
    // --- End Configuration ---

    if (API_BASE_URL === 'YOUR_HOSTED_FASTAPI_BACKEND_URL/api/v1' || API_BASE_URL.includes('YOUR_HOSTED_FASTAPI_BACKEND_URL')) {
        tg.showAlert("Developer Alert: API_BASE_URL is not configured correctly in admin_panel.js. Admin Panel will not function. Please edit admin_panel.js and set your API server's URL.");
        return;
    }

    let TELEGRAM_INIT_DATA = tg.initData;
    if (!TELEGRAM_INIT_DATA) {
        TELEGRAM_INIT_DATA = tg.initDataUnsafe ? tg.initDataUnsafe.hash : null;
         if (!TELEGRAM_INIT_DATA && (!tg.initDataUnsafe || !tg.initDataUnsafe.query_id)) {
            tg.showAlert("Critical Error: Admin authentication data (initData) is missing. Cannot proceed securely. Ensure this panel is opened by an authorized admin via the bot.");
            document.body.innerHTML = "<div style='padding:20px; text-align:center; color: white;'>Fatal Error: Missing authentication data. Access Denied.</div>";
            return;
        }
    }

    const characterListEl = document.getElementById('character-list-admin');
    const searchInput = document.getElementById('search-user-input');
    const loadingCharactersMsg = document.getElementById('admin-loading-characters');
    const noCharactersMsg = document.getElementById('admin-no-characters');
    const actionMessageEl = document.getElementById('admin-action-message');

    let allCharactersCache = []; // Cache for all characters fetched
    let searchDebounceTimeout;

    // API Helper for Admin Panel
    async function makeAdminApiRequest(endpoint, method = 'GET', body = null) {
        const headers = { 'Content-Type': 'application/json' };
        if (!TELEGRAM_INIT_DATA) {
            tg.showAlert("Admin authentication data is missing.");
            throw new Error("Missing Telegram InitData for admin API request.");
        }
        headers['X-Telegram-Init-Data'] = TELEGRAM_INIT_DATA;

        const config = { method, headers };
        if (body && (method === 'POST' || method === 'PATCH' || method === 'DELETE')) {
            config.body = JSON.stringify(body);
        }

        actionMessageEl.style.display = 'none'; // Hide previous messages

        try {
            // tg.MainButton.showProgress(); // No main button in admin, show specific loading
            if(loadingCharactersMsg) loadingCharactersMsg.style.display = 'block';

            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            if (!response.ok) {
                let errorData, errorDetailMessage = `Request Failed: ${response.status} ${response.statusText}`;
                try {
                    errorData = await response.json();
                    if (errorData && errorData.detail) {
                        errorDetailMessage = Array.isArray(errorData.detail) ? errorData.detail.map(err => `${err.loc ? err.loc.join('.')+": " : ''}${err.msg}`).join('; ') : errorData.detail;
                    }
                } catch (e) { /* Use default */ }
                console.error(`Admin API Error (${response.status}) for ${method} ${endpoint}:`, errorDetailMessage, errorData);
                showActionMessage(errorDetailMessage, 'error');
                tg.HapticFeedback.notificationOccurred('error');
                throw new Error(errorDetailMessage);
            }
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            console.error(`Network or other error (Admin Panel) to ${method} ${endpoint}:`, error);
            if (!error.message.startsWith("Request Failed:")) {
                 showActionMessage(`Network error: ${error.message}. Please check connection.`, 'error');
            }
            throw error;
        } finally {
             // tg.MainButton.hideProgress();
            if(loadingCharactersMsg) loadingCharactersMsg.style.display = 'none';
        }
    }

    function showActionMessage(message, type = 'success') {
        if (!actionMessageEl) return;
        actionMessageEl.textContent = message;
        actionMessageEl.className = `admin-message ${type}`;
        actionMessageEl.style.display = 'block';
        tg.HapticFeedback.notificationOccurred(type);
        setTimeout(() => { actionMessageEl.style.display = 'none'; }, 5000);
    }

    function renderCharacterList(characters) {
        if (!characterListEl) return;
        characterListEl.innerHTML = '';

        if (!characters || characters.length === 0) {
            if(noCharactersMsg) noCharactersMsg.style.display = 'block';
            return;
        }
        if(noCharactersMsg) noCharactersMsg.style.display = 'none';

        characters.forEach(char => {
            const li = document.createElement('li');
            li.className = 'character-item-admin';
            li.dataset.charId = char.char_id;

            let ownerInfo = '';
            if (char.owner_details) { // Assuming owner_details is now populated
                ownerInfo = `by ${char.owner_details.username || char.owner_details.first_name || char.owner_user_id}`;
            }


            li.innerHTML = `
                <div class="info">
                    <span class="name">${char.name} <small class="id">(ID: ${char.char_id.substring(0,8)}...)</small></span>
                    <small class="creator-info">${ownerInfo}</small>
                </div>
                <span class="status ${char.is_featured ? 'featured' : 'not-featured'}">${char.is_featured ? 'Featured' : 'Not Featured'}</span>
                <div class="actions">
                    <button class="admin-button feature-btn">${char.is_featured ? 'Unfeature' : 'Feature'}</button>
                    <button class="admin-button delete-button delete-char-btn">Delete</button>
                </div>
            `;

            li.querySelector('.feature-btn').addEventListener('click', async () => {
                try {
                    await makeAdminApiRequest(`/admin/characters/${char.char_id}/feature`, 'PATCH', {
                        is_featured: !char.is_featured
                    });
                    showActionMessage(`Character "${char.name}" ${!char.is_featured ? 'featured' : 'unfeatured'} successfully.`, 'success');
                    fetchAllCharacters(); // Refresh list
                } catch (error) {
                    // Error already shown by makeAdminApiRequest
                }
            });

            li.querySelector('.delete-char-btn').addEventListener('click', () => {
                tg.showConfirm(`Are you sure you want to delete character "${char.name}" (ID: ${char.char_id})? This action cannot be undone.`, async (ok) => {
                    if (ok) {
                        try {
                            await makeAdminApiRequest(`/admin/characters/${char.char_id}`, 'DELETE');
                            showActionMessage(`Character "${char.name}" deleted successfully.`, 'success');
                            fetchAllCharacters(); // Refresh list
                        } catch (error) {
                           // Error handled by makeAdminApiRequest
                        }
                    }
                });
            });
            characterListEl.appendChild(li);
        });
    }

    async function fetchAllCharacters() {
        try {
            // Admin endpoint fetches all characters, or public ones with a flag for admin all=true
            // Assuming a new endpoint like /admin/characters for simplicity or use existing /characters/user/public with admin flag
            allCharactersCache = await makeAdminApiRequest('/admin/characters'); // Endpoint to be created in FastAPI
            filterAndRenderCharacters();
        } catch (error) {
            if(noCharactersMsg && characterListEl) {
                characterListEl.innerHTML = '';
                noCharactersMsg.textContent = "Error loading characters for admin panel.";
                noCharactersMsg.style.display = 'block';
            }
        }
    }
    
    function filterAndRenderCharacters() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!allCharactersCache) {
            renderCharacterList([]);
            return;
        }
        if (!searchTerm) {
            renderCharacterList(allCharactersCache);
            return;
        }
        const filtered = allCharactersCache.filter(char =>
            char.name.toLowerCase().includes(searchTerm) ||
            char.description.toLowerCase().includes(searchTerm) ||
            char.char_id.toLowerCase().includes(searchTerm) ||
            (char.owner_details && char.owner_details.username && char.owner_details.username.toLowerCase().includes(searchTerm))
        );
        renderCharacterList(filtered);
    }


    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimeout);
            searchDebounceTimeout = setTimeout(filterAndRenderCharacters, 300);
        });
    }
    
    // Check if user is admin before fetching data
    async function verifyAdminAndInitialize() {
        try {
            // A simple request to an admin-only-accessible part of /users/me,
            // or a dedicated /admin/verify endpoint.
            // For now, assuming successful load of any data means authorized context,
            // real authorization check should happen server-side based on initData
            const userProfile = await makeAdminApiRequest('/users/me'); // Basic check, admin logic is in FastAPI
            if (userProfile && (userProfile.is_sudo || userProfile.is_owner)) { // Assuming 'is_admin' might not be standard in profile
                 console.log("Admin access verified (Sudo or Owner). Loading panel content.");
                 fetchAllCharacters();
            } else {
                tg.showAlert("Access Denied. You are not authorized to view this panel.");
                document.body.innerHTML = "<div style='padding:20px; text-align:center; color: white;'>Access Denied. Admin rights required.</div>";
                 setTimeout(() => tg.close(), 3000);
            }

        } catch (error) {
            console.error("Failed admin verification or initial load:", error);
             tg.showAlert(`Failed to initialize admin panel: ${error.message}. Please ensure you have admin rights and try again.`);
             document.body.innerHTML = `<div style='padding:20px; text-align:center; color: white;'>Error initializing admin panel: ${error.message}</div>`;
             setTimeout(() => tg.close(), 4000);
        }
    }


    // Initialization
    verifyAdminAndInitialize();

    // Back button for SPA feel if needed, or let user use Telegram's back button
    tg.BackButton.onClick(() => {
        // If admin panel becomes multi-view, handle navigation here.
        // For single view, tg.close() might be an option if opened specifically.
        // For now, standard TG back might close the WebApp if it was a direct link.
    });
    // For single view admin panel, we don't strictly need to show the back button often.
    // If this was loaded as part of a larger webapp, it would be useful.
    // For a standalone admin.html, tg.close() can be triggered differently if desired.
    // tg.BackButton.show(); // Or hide depending on context

    const backToMainAppLink = document.getElementById('admin-back-to-main-app');
    if (backToMainAppLink) {
        // Assuming main app (index.html) is in the same directory level or accessible via relative path
        // No special JS needed if it's just a plain hyperlink navigation and index.html initializes itself
    }

});
