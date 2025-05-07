// Wacht tot de DOM volledig geladen is
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('blackjackCanvas');
    const ctx = canvas.getContext('2d');

    // Globale spelvariabelen
    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let playerScore = 0;
    let dealerScore = 0;

    // Functie om coins uit localStorage te laden
    function loadCoins() {
        const storedCoins = localStorage.getItem('coins');

        const parsedCoins = parseInt(storedCoins, 10);
        // Zorg ervoor dat het een geldig getal is, anders default
        return !isNaN(parsedCoins) ? parsedCoins : 1000;
    }

    // Functie om coins op te slaan in localStorage
    function saveCoins() {
        localStorage.setItem('coins', coins.toString());
    }

    let coins = loadCoins(); // Startkapitaal, geladen uit localStorage
    let currentBet = 0;
    const betAmounts = [10, 25, 50, 100];
    let message = ""; // Voor berichten op het canvas

    // Spel statussen
    const GAME_STATE = {
        BETTING: 'BETTING',
        PLAYER_TURN: 'PLAYER_TURN',
        DEALER_TURN: 'DEALER_TURN',
        GAME_OVER: 'GAME_OVER'
    };
    let currentGameState = GAME_STATE.BETTING;

    const suits = ['♥', '♦', '♣', '♠']; // Gebruik symbolen
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    // Knopdefinities (x, y, width, height worden dynamisch berekend)
    let buttons = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        defineButtonsLayout(); // Herdefinieer knop posities na resize
        drawGame(); // Herteken alles
    }

    function defineButtonsLayout() {
        buttons = [];
        const buttonWidth = canvas.width / 6;
        const buttonHeight = canvas.height / 12;
        const spacing = 20;
        const bottomY = canvas.height - buttonHeight - spacing;

        if (currentGameState === GAME_STATE.BETTING) {
            let totalBetButtonsWidth = betAmounts.length * (buttonWidth + spacing) - spacing;
            let startX = (canvas.width - totalBetButtonsWidth) / 2;
            betAmounts.forEach((amount, index) => {
                buttons.push({
                    id: `bet_${amount}`,
                    text: `Inzet ${amount}`,
                    x: startX + index * (buttonWidth + spacing),
                    y: bottomY - buttonHeight - spacing, // Hoger dan Deal knop
                    width: buttonWidth,
                    height: buttonHeight,
                    action: () => placeBet(amount)
                });
            });
            buttons.push({
                id: 'deal',
                text: 'Delen',
                x: (canvas.width - buttonWidth) / 2,
                y: bottomY,
                width: buttonWidth,
                height: buttonHeight,
                action: startGame
            });
        } else if (currentGameState === GAME_STATE.PLAYER_TURN) {
            buttons.push({
                id: 'hit',
                text: 'Hit',
                x: canvas.width / 2 - buttonWidth - spacing / 2,
                y: bottomY,
                width: buttonWidth,
                height: buttonHeight,
                action: playerHit
            });
            buttons.push({
                id: 'stand',
                text: 'Stand',
                x: canvas.width / 2 + spacing / 2,
                y: bottomY,
                width: buttonWidth,
                height: buttonHeight,
                action: playerStand
            });
        } else if (currentGameState === GAME_STATE.GAME_OVER) {
            buttons.push({
                id: 'new_game',
                text: 'Nieuwe Inzet',
                x: (canvas.width - buttonWidth) / 2,
                y: bottomY,
                width: buttonWidth,
                height: buttonHeight,
                action: resetForNewBet
            });
        }
    }


    // Functie om het deck te maken
    function createDeck() {
        deck = [];
        for (let suit of suits) {
            for (let value of values) {
                deck.push({ suit, value });
            }
        }
    }

    // Functie om het deck te schudden
    function shuffleDeck() {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    // Functie om een kaart te delen
    function dealCard(hand) {
        if (deck.length > 0) {
            const card = deck.pop();
            hand.push(card);
            return card;
        }
        return null;
    }

    // Functie om de waarde van een hand te berekenen (opgeschoonde Aas-logica)
    function getHandValue(hand) {
        let score = 0;
        let aceCountInHand = 0;

        for (let card of hand) {
            if (card.value === 'A') {
                aceCountInHand++;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                score += 10;
            } else {
                score += parseInt(card.value);
            }
        }

        for (let i = 0; i < aceCountInHand; i++) {
            if (score + 11 <= 21) {
                score += 11;
            } else {
                score += 1;
            }
        }
        return score;
    }

    // Hulpfunctie om tekst te tekenen
    function drawText(text, x, y, size, color = 'white', align = 'center', baseline = 'middle') {
        ctx.fillStyle = color;
        ctx.font = `${size}px monospace`; // Gewijzigd van Arial naar monospace
        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        ctx.fillText(text, x, y);
    }

    // Hulpfunctie om een hand (kaarten en score) te tekenen
    function drawHandUI(hand, yPos, title, scoreToDisplay, isDealerHidden) {
        const cardWidth = canvas.width / 12;
        const cardHeight = cardWidth * 1.5;
        const cardSpacing = cardWidth / 5;
        const textSize = canvas.height / 30;

        drawText(title, canvas.width / 2, yPos - cardHeight / 2, textSize);

        let totalCardsWidth = hand.length * (cardWidth + cardSpacing) - cardSpacing;
        if (hand.length === 0) totalCardsWidth = 0;
        let startX = (canvas.width - totalCardsWidth) / 2;

        for (let i = 0; i < hand.length; i++) {
            let card = hand[i];
            if (isDealerHidden && i === 0 && hand.length === 2) {
                drawCard(startX + i * (cardWidth + cardSpacing), yPos, cardWidth, cardHeight, '?', true);
            } else {
                drawCard(startX + i * (cardWidth + cardSpacing), yPos, cardWidth, cardHeight, card);
            }
        }

        if (hand.length > 0) {
            let scoreText = isDealerHidden && hand.length === 2 ? 'Score: ?' : `Score: ${scoreToDisplay}`;
            drawText(scoreText, canvas.width / 2, yPos + cardHeight + textSize, textSize);
        }
    }

    // Functie om het spelbord te tekenen
    function drawGame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Achtergrond
        ctx.fillStyle = 'darkgreen';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const mainTextSize = canvas.height / 30;
        const messageTextSize = canvas.height / 25;

        // Saldo en Inzet
        drawText(`Coins: ${coins}`, canvas.width / 2, canvas.height / 20, mainTextSize);
        if (currentGameState !== GAME_STATE.BETTING || currentBet > 0) {
            drawText(`Inzet: ${currentBet}`, canvas.width / 2, canvas.height / 20 + mainTextSize * 1.2, mainTextSize);
        }

        const dealerCardY = canvas.height / 6;
        const playerCardY = canvas.height / 2;
        const shouldHideDealerCard = currentGameState === GAME_STATE.PLAYER_TURN;

        // Teken dealer hand
        drawHandUI(dealerHand, dealerCardY, 'Dealer Hand:', dealerScore, shouldHideDealerCard);

        // Teken speler hand
        drawHandUI(playerHand, playerCardY, 'Speler Hand:', playerScore, false);

        // Teken berichten
        if (message) {
            drawText(message, canvas.width / 2, canvas.height * 0.80, messageTextSize, 'yellow');
        }

        // Teken knoppen
        defineButtonsLayout();
        buttons.forEach(button => {
            ctx.fillStyle = '#4CAF50'; // Knop achtergrondkleur
            ctx.fillRect(button.x, button.y, button.width, button.height);
            drawText(button.text, button.x + button.width / 2, button.y + button.height / 2, button.height / 2.5, 'white');
        });
    }

    // Functie om een enkele kaart te tekenen
    function drawCard(x, y, width, height, cardData, isHidden = false) {
        const cornerRadius = width / 10;
        ctx.lineJoin = "round";
        ctx.lineWidth = cornerRadius;

        // Kaart achtergrond en rand
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black'; // Randkleur
        ctx.beginPath();
        ctx.moveTo(x + cornerRadius, y);
        ctx.lineTo(x + width - cornerRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
        ctx.lineTo(x + width, y + height - cornerRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
        ctx.lineTo(x + cornerRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
        ctx.lineTo(x, y + cornerRadius);
        ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();


        if (isHidden) {
            // Teken een simpel vraagteken voor de verborgen kaart
            ctx.fillStyle = 'black';
            ctx.font = `${height / 2}px monospace`; // Gewijzigd van Arial naar monospace
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', x + width / 2, y + height / 2);
            return;
        }

        // Bepaal kleur van de tekst/symbolen
        const suitColor = (cardData.suit === '♥' || cardData.suit === '♦') ? 'red' : 'black';
        ctx.fillStyle = suitColor;

        // Tekst (waarde) en symbool
        const value = cardData.value;
        const suit = cardData.suit;

        // Kleine waarde en symbool linksboven
        ctx.font = `${height / 6}px monospace`; // Gewijzigd van Arial naar monospace
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(value, x + width * 0.05, y + height * 0.05);
        ctx.fillText(suit, x + width * 0.05, y + height * 0.05 + height / 6);

        // Kleine waarde en symbool rechtsonder (gespiegeld)
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.font = `${height / 6}px monospace`; // Gewijzigd van Arial naar monospace (ook hier voor consistentie)
        ctx.fillText(value, x + width * 0.95, y + height * 0.95);
        ctx.fillText(suit, x + width * 0.95, y + height * 0.95 - height / 6);


        // Groot symbool in het midden
        ctx.font = `${height / 2.5}px monospace`; // Gewijzigd van Arial naar monospace
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(suit, x + width / 2, y + height / 2);
    }

    function placeBet(amount) {
        if (currentGameState !== GAME_STATE.BETTING) return;
        if (coins >= amount) {
            currentBet += amount;
            // coins -= amount; // Haal pas van saldo af bij dealen, of direct? Nu direct.
            // Beter: pas saldo aan bij start spel, zodat men kan aanpassen.
            // Voor nu, simpel: inzet wordt opgeteld.
            message = `Inzet: ${currentBet}. Klik 'Delen' of verhoog inzet.`;
        } else {
            message = "Onvoldoende coins voor deze inzet.";
        }
        drawGame();
    }


    function startGame() {
        if (currentGameState !== GAME_STATE.BETTING || currentBet === 0) {
            message = "Plaats eerst een inzet.";
            drawGame();
            return;
        }
        if (coins < currentBet) {
            message = "Onvoldoende coins voor de huidige inzet.";
            currentBet = 0; // Reset inzet
            drawGame();
            return;
        }

        coins -= currentBet; // Haal inzet van saldo af
        saveCoins(); // Sla de nieuwe coinstand op

        currentGameState = GAME_STATE.PLAYER_TURN;
        createDeck();
        shuffleDeck();
        playerHand = [];
        dealerHand = [];

        dealCard(playerHand);
        dealCard(dealerHand);
        dealCard(playerHand);
        dealCard(dealerHand);

        playerScore = getHandValue(playerHand);
        dealerScore = getHandValue(dealerHand);

        message = "Jouw beurt. Hit of Stand?";

        if (playerScore === 21) { // Blackjack voor speler
            message = "Blackjack!";
            // Uitbetaling 3:2 voor blackjack
            coins += currentBet + (currentBet * 1.5);
            saveCoins(); // Sla de nieuwe coinstand op
            currentGameState = GAME_STATE.GAME_OVER;
            message += ` Je wint ${currentBet * 1.5} extra coins!`;
        }
        // Check voor dealer blackjack (als speler geen blackjack heeft)
        else if (dealerScore === 21 && dealerHand.length === 2) {
            message = "Dealer heeft Blackjack! Jij verliest.";
            currentGameState = GAME_STATE.GAME_OVER;
        }

        drawGame();
    }

    function playerHit() {
        if (currentGameState !== GAME_STATE.PLAYER_TURN) return;

        dealCard(playerHand);
        playerScore = getHandValue(playerHand);
        drawGame();

        if (playerScore > 21) {
            message = `Bust! Je score is ${playerScore}. Dealer wint.`;
            currentGameState = GAME_STATE.GAME_OVER;
        } else if (playerScore === 21) {
            message = "21! Dealer is aan de beurt.";
            currentGameState = GAME_STATE.DEALER_TURN;
            dealerPlay();
        } else {
            message = "Hit of Stand?";
        }
        drawGame();
    }

    function playerStand() {
        if (currentGameState !== GAME_STATE.PLAYER_TURN) return;
        currentGameState = GAME_STATE.DEALER_TURN;
        message = "Je past. Dealer is aan de beurt.";
        drawGame(); // Toon de verborgen kaart van de dealer
        setTimeout(dealerPlay, 1000); // Geef even tijd om de kaart te zien
    }

    function dealerPlay() {
        if (currentGameState !== GAME_STATE.DEALER_TURN) return;

        // Onthul de verborgen kaart van de dealer (gebeurt al door state change in drawGame)
        drawGame();

        function takeDealerCard() {
            if (dealerScore < 17 && playerScore <= 21) { // Dealer hit op 16 of minder, en als speler niet bust is
                message = "Dealer neemt een kaart...";
                dealCard(dealerHand);
                dealerScore = getHandValue(dealerHand);
                drawGame();
                if (dealerScore > 21) {
                    message = `Dealer is bust (${dealerScore})! Jij wint!`;
                    coins += currentBet * 2; // Win de inzet terug + zelfde bedrag
                    saveCoins(); // Sla de nieuwe coinstand op
                    currentGameState = GAME_STATE.GAME_OVER;
                    drawGame();
                } else {
                    setTimeout(takeDealerCard, 1000); // Volgende kaart na een pauze
                }
            } else {
                determineWinner();
            }
        }
        takeDealerCard();
    }

    function determineWinner() {
        // Deze functie wordt nu aangeroepen nadat de dealer klaar is (of direct als speler bust)
        if (playerScore > 21) { // Speler was al bust
            message = `Je bent bust (${playerScore}). Dealer wint.`;
            // Inzet is al verloren, coins niet veranderd, dus geen saveCoins() nodig tenzij je expliciet verlies wilt loggen
        } else if (dealerScore > 21) {
            message = `Dealer is bust (${dealerScore})! Jij wint!`;
            coins += currentBet * 2;
            saveCoins(); // Sla de nieuwe coinstand op
        } else if (playerScore > dealerScore) {
            message = `Jij wint met ${playerScore} tegen ${dealerScore}!`;
            coins += currentBet * 2;
            saveCoins(); // Sla de nieuwe coinstand op
        } else if (dealerScore > playerScore) {
            message = `Dealer wint met ${dealerScore} tegen ${playerScore}.`;
            // Coins niet veranderd door winst/verlies van speler hier, inzet is al weg
        } else { // Push
            message = `Push (gelijkspel) met ${playerScore}.`;
            coins += currentBet; // Krijg inzet terug
            saveCoins(); // Sla de nieuwe coinstand op
        }
        currentGameState = GAME_STATE.GAME_OVER;
        drawGame();
    }

    function resetForNewBet() {
        currentBet = 0;
        playerHand = [];
        dealerHand = [];
        playerScore = 0;
        dealerScore = 0;
        currentGameState = GAME_STATE.BETTING;
        if (coins <= 0) {
            message = "Game Over! Je hebt geen coins meer. Herlaad om opnieuw te spelen, of we resetten je coins.";
            // Optioneel: knop om saldo te resetten of spel echt te blokkeren
            coins = 1000; // Reset saldo als het op is
            saveCoins(); // Sla de geresette coinstand op
        } else {
            message = "Plaats je inzet voor de volgende ronde.";
        }
        drawGame();
    }

    // Klik event listener voor canvas
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        for (let button of buttons) {
            if (x >= button.x && x <= button.x + button.width &&
                y >= button.y && y <= button.y + button.height) {
                button.action();
                break; // Voer slechts één knopactie per klik uit
            }
        }
    });

    // Event listener voor window resize
    window.addEventListener('resize', resizeCanvas);

    // Initieel
    resizeCanvas(); // Zet canvas grootte en teken initieel scherm
    message = "Welkom! Plaats je inzet.";
    drawGame();
});