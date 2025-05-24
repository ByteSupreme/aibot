document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready(); // Inform Telegram Web App is ready

    // IMPORTANT: User must replace these placeholder image URLs with actual, publicly accessible HTTPS URLs
    // for the images corresponding to Jane, Mrs. Grace, Sakura, and Nya as seen in the screenshot.
    // The 'id_to_send' should be an existing persona_id from your bot's personas.py
    const charactersData = [
        {
            id_to_send: "flora", 
            display_name: "Jane",
            description: "Flirtatious traditional girl.",
            image_url: "https://via.placeholder.com/300x400/FFDDCC/000000?Text=Jane" // REPLACE THIS
        },
        {
            id_to_send: "fiza",  
            display_name: "Mrs. Grace",
            description: "Caring and charming MILF.",
            image_url: "https://via.placeholder.com/300x400/DDEEFF/000000?Text=Mrs.Grace" // REPLACE THIS
        },
        {
            id_to_send: "soniya", 
            display_name: "Sakura",
            description: "Japanese secret agent.",
            image_url: "https://via.placeholder.com/300x400/FFEEEE/000000?Text=Sakura", // REPLACE THIS
            icon: "❤️" 
        },
        {
            id_to_send: "anya",  
            display_name: "Nya",
            description: "Playful, mischievous, and affectionate cat girl.",
            image_url: "https://via.placeholder.com/300x400/EEFFEE/000000?Text=Nya", // REPLACE THIS
            selected: true, 
            special_decoration: "paws" 
        }
    ];

    const characterGrid = document.getElementById('character-grid');
    let selectedCharacterCard = null;

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
            ['p1', 'p2'].forEach(pClass => { 
                const paw = document.createElement('span');
                paw.classList.add('paw-print', pClass);
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
            // Send data to the bot
            tg.sendData(JSON.stringify({ selected_persona_id: personaIdToSend }));
            
            // Optional: Close Web App after selection. You can enable this if desired.
            // tg.close(); 
        });

        characterGrid.appendChild(card);
    });

    const closeButton = document.getElementById('close-btn');
    if (closeButton) {
        closeButton.addEventListener('click', function () {
            tg.close();
        });
    }

    const moreOptionsButton = document.getElementById('more-options-btn');
    if (moreOptionsButton) {
        moreOptionsButton.addEventListener('click', function () {
            tg.showAlert("More options feature coming soon!");
        });
    }
    
    tg.expand(); // Expand the Web App to full height

    // Example: If you want a main button to confirm selection:
    // This requires the user to tap the main button instead of auto-sending on card click.
    // Comment out tg.sendData() in card.addEventListener('click',...) if you use this.
    /*
    tg.MainButton.setText("Confirm Character");
    tg.MainButton.show();
    tg.MainButton.onClick(function() {
        if (selectedCharacterCard) {
            const personaIdToSend = selectedCharacterCard.dataset.personaId;
            tg.sendData(JSON.stringify({ selected_persona_id: personaIdToSend }));
            tg.close();
        } else {
            tg.showAlert("Please select a character first.");
        }
    });
    */
});
