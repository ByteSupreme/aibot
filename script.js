document.addEventListener('DOMContentLoaded', function () {
    const tg = window.Telegram.WebApp;
    tg.ready(); // Inform Telegram Web App is ready
    tg.expand(); // Expand the Web App to full height

    // Placeholder images from placehold.co (you can customize text/colors)
    // The 'id_to_send' should match an existing persona_id from your bot's personas.py
    const charactersData = [
        {
            id_to_send: "flora", // Replace with actual persona_id for Jane if different
            display_name: "Jane",
            description: "Flirtatious traditional girl.",
            image_url: "https://placehold.co/300x400/332E45/E0E0E0/png?text=Jane&font=roboto" 
        },
        {
            id_to_send: "fiza",  // Replace with actual persona_id for Mrs. Grace if different
            display_name: "Mrs. Grace",
            description: "Caring and charming MILF.",
            image_url: "https://placehold.co/300x400/2A203C/E0E0E0/png?text=Mrs.+Grace&font=roboto" 
        },
        {
            id_to_send: "soniya", // Replace with actual persona_id for Sakura if different
            display_name: "Sakura",
            description: "Japanese secret agent.",
            image_url: "https://placehold.co/300x400/3A2F4B/E0E0E0/png?text=Sakura&font=roboto", 
            icon: "❤️" // Or use your framework's heart icon class if applicable
        },
        {
            id_to_send: "anya",  // Replace with actual persona_id for Nya if different
            display_name: "Nya",
            description: "Playful, mischievous, and affectionate cat girl.",
            image_url: "https://placehold.co/300x400/2D2542/E0E0E0/png?text=Nya&font=roboto", 
            selected: true, // Nya is selected by default as in the screenshot
            special_decoration: "paws" 
        }
    ];

    const characterGrid = document.getElementById('character-grid');
    let selectedCharacterCard = null;

    charactersData.forEach(charData => {
        const card = document.createElement('div');
        // Add utility classes from your framework if they define card structure/appearance
        // For now, relying on custom .character-card styles
        card.classList.add('character-card'); 
        card.dataset.personaId = charData.id_to_send; 
        card.dataset.displayName = charData.display_name; // For CSS targeting if needed

        const imageContainer = document.createElement('div');
        imageContainer.classList.add('character-image-container');
        
        const img = document.createElement('img');
        img.classList.add('character-image');
        img.src = charData.image_url;
        img.alt = charData.display_name;
        imageContainer.appendChild(img);

        // Paw print logic remains the same
        if (charData.special_decoration === "paws") {
            const pawOverlay = document.createElement('div');
            pawOverlay.classList.add('paw-print-overlay');
            // Create multiple paw prints at different positions for Nya
            const pawPositions = [
                { top: '8%', left: '10%', transform: 'rotate(-20deg)', class: 'p1' },
                { top: '15%', right: '8%', transform: 'rotate(25deg)', class: 'p2' },
                { top: '60%', left: '15%', transform: 'rotate(10deg)', class: 'p3' }, // Added for more paws like screenshot
                { top: '70%', right: '20%', transform: 'rotate(-10deg)', class: 'p4' } // Added
            ];

            pawPositions.forEach(pos => {
                const paw = document.createElement('span');
                paw.classList.add('paw-print', pos.class); // Add individual classes if needed for styling
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
            iconSpan.classList.add('card-icon'); // Utility or custom class
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
            card.classList.add('selected'); // Your custom .selected class for glow
            selectedCharacterCard = card;
        }

        card.addEventListener('click', function () {
            if (selectedCharacterCard) {
                selectedCharacterCard.classList.remove('selected');
            }
            this.classList.add('selected');
            selectedCharacterCard = this;

            const personaIdToSend = this.dataset.personaId;
            tg.sendData(JSON.stringify({ selected_persona_id: personaIdToSend }));
            
            // Optional: Close Web App after selection. User may prefer it to stay open.
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
            // Potentially use tg.showPopup or open another web app view
            tg.showAlert("More options for Lucid Dreams (18+) will be available soon!");
        });
    }

    const plusButton = document.querySelector('.gem-bar .plus-btn');
    if(plusButton) {
        plusButton.addEventListener('click', function() {
            tg.showAlert("Feature to add gems/energy coming soon!");
        });
    }
    
});
