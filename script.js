function startGame(gameName) {
    console.log("Start spel: " + gameName);
    let gamePath = "";
    if (gameName === 'plinko') {
        gamePath = 'plinkoball/plinko.html';
    } else if (gameName === 'slots') {
        gamePath = 'slotmachine/slotmachine.html';
    } else if (gameName === 'blackjack') {
        gamePath = 'blackjack/blackjack.html';
    }

    if (gamePath) {
        window.location.href = gamePath;
    } else {
        alert("Spel niet gevonden!");
    }
}

const claimAmount = 1000; // Wordt niet meer direct gebruikt, maar kan blijven voor referentie
const claimInterval = 10 * 60 * 1000; // 10 minuten in milliseconden
let lastClaimTime = 0;
let claimCountdownInterval;

// --- Rad van Fortuin Configuratie ---
const wheelCanvas = document.getElementById('wheelCanvas');
let wheelCtx; // Wordt geïnitialiseerd in initializeClaimFeature
const segments = [ // Voorbeeld segmenten en hun waarden
    { color: '#FFD700', label: '500', value: 500 }, // Goud
    { color: '#C0C0C0', label: '200', value: 200 }, // Zilver
    { color: '#CD7F32', label: '750', value: 750 }, // Brons
    { color: '#8A2BE2', label: '1000', value: 1000 }, // Blauwviolet
    { color: '#32CD32', label: '300', value: 300 }, // Limegroen
    { color: '#FF6347', label: '1500', value: 1500 }, // Tomatenrood
    { color: '#4682B4', label: '400', value: 400 }, // Staalblauw
    { color: '#FF8C00', label: '2000', value: 2000 } // Donkeroranje
];
const numSegments = segments.length;
const anglePerSegment = (2 * Math.PI) / numSegments;
let currentAngle = 0; // Huidige rotatiehoek van het rad
let spinTimeout = null;
let isSpinning = false;
const spinDuration = 4000; // 4 seconden
const spinSpeedDecrease = 0.995; // Factor waarmee snelheid afneemt

// --- Modal/Overlay Functies ---
const wheelOverlay = document.getElementById('wheel-overlay');

function openWheelOverlay() {
    if (wheelOverlay) {
        // Controleer of de speler mag draaien voordat de overlay wordt geopend
        const now = Date.now();
        if (now - lastClaimTime >= claimInterval) {
            wheelOverlay.style.display = 'block';
            drawWheel(); // Zorg dat het rad getekend is als de overlay opent
            // Zorg dat de "Draai Nu!" knop correct is (enabled)
            const spinNowButton = document.getElementById('spin-now-button');
            if (spinNowButton) {
                spinNowButton.disabled = isSpinning;
            }
        } else {
            alert("Je hebt nog geen gratis spin. Wacht op de timer!");
        }
    }
}

function closeWheelOverlay() {
    if (wheelOverlay && !isSpinning) { // Voorkom sluiten tijdens het draaien
        wheelOverlay.style.display = 'none';
    } else if (isSpinning) {
        alert("Wacht tot het rad gestopt is met draaien!");
    }
}

// Pas de event listener voor het sluiten van de modal aan als op de achtergrond wordt geklikt
if (wheelOverlay) {
    window.onclick = function(event) {
        if (event.target == wheelOverlay && !isSpinning) {
            wheelOverlay.style.display = "none";
        }
    }
}


function drawWheel() {
    if (!wheelCtx) return;
    const centerX = wheelCanvas.width / 2;
    const centerY = wheelCanvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10; // -10 voor wat marge

    wheelCtx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);
    wheelCtx.font = 'bold 16px monospace';
    wheelCtx.textBaseline = 'middle';
    wheelCtx.textAlign = 'center';

    for (let i = 0; i < numSegments; i++) {
        const startAngle = currentAngle + i * anglePerSegment;
        const endAngle = startAngle + anglePerSegment;

        wheelCtx.beginPath();
        wheelCtx.moveTo(centerX, centerY);
        wheelCtx.arc(centerX, centerY, radius, startAngle, endAngle);
        wheelCtx.closePath();
        wheelCtx.fillStyle = segments[i].color;
        wheelCtx.fill();
        wheelCtx.strokeStyle = '#333'; // Rand voor segmenten
        wheelCtx.lineWidth = 2;
        wheelCtx.stroke();

        // Tekst in segmenten
        wheelCtx.save();
        wheelCtx.translate(centerX, centerY);
        wheelCtx.rotate(startAngle + anglePerSegment / 2); // Roteer naar het midden van het segment
        wheelCtx.fillStyle = 'black';
        // Pas tekstpositie aan op basis van radius
        wheelCtx.fillText(segments[i].label, radius * 0.65, 0);
        wheelCtx.restore();
    }

    // Pijl/Indicator bovenaan
    wheelCtx.fillStyle = 'black';
    wheelCtx.beginPath();
    wheelCtx.moveTo(centerX - 10, centerY - radius - 15);
    wheelCtx.lineTo(centerX + 10, centerY - radius - 15);
    wheelCtx.lineTo(centerX, centerY - radius + 5);
    wheelCtx.closePath();
    wheelCtx.fill();
}

function animateSpin(startTime, initialSpeed) {
    if (isSpinning) {
        const elapsedTime = Date.now() - startTime;
        let speed = initialSpeed * Math.pow(spinSpeedDecrease, elapsedTime / 10);

        currentAngle += speed;
        drawWheel();

        if (speed > 0.001 && elapsedTime < spinDuration * 1.5) {
            requestAnimationFrame(() => animateSpin(startTime, initialSpeed));
        } else {
            isSpinning = false;
            const finalAngle = currentAngle % (2 * Math.PI);
            let winningSegmentIndex = Math.floor(numSegments - (finalAngle / anglePerSegment)) % numSegments;
            if (winningSegmentIndex < 0) winningSegmentIndex += numSegments;

            const prize = segments[winningSegmentIndex].value;
            alert(`Je hebt ${prize} coins gewonnen!`);

            let currentCoins = parseInt(localStorage.getItem('coins') || '0', 10);
            currentCoins += prize;
            localStorage.setItem('coins', currentCoins.toString());

            // Belangrijk: lastClaimTime wordt nu hier gezet NADAT de spin voltooid is
            lastClaimTime = Date.now();
            localStorage.setItem('lastClaimTime', lastClaimTime.toString());

            initializeAndDisplayCoins();
            updateClaimUI(); // Update de "Open Rad" knop timer

            // Optioneel: sluit de overlay na een korte vertraging
            setTimeout(() => {
                if (wheelOverlay.style.display === 'block') { // Alleen sluiten als nog open
                    closeWheelOverlay();
                }
            }, 1500); // Sluit na 1.5 seconden
        }
    }
}


function handleSpinWheel() { // Wordt aangeroepen door #spin-now-button in de overlay
    if (isSpinning) return;

    // De controle of de speler mag draaien is al gebeurd bij het openen van de overlay.
    // Hier starten we direct de spin.
    isSpinning = true;
    document.getElementById('spin-now-button').disabled = true;
    document.getElementById('spin-now-button').textContent = 'Draaien...';


    const randomSpinStrength = Math.random() * 0.2 + 0.15;
    const startTime = Date.now();
    animateSpin(startTime, randomSpinStrength);
}


function initializeClaimFeature() {
    if (wheelCanvas) {
        wheelCtx = wheelCanvas.getContext('2d');
        // drawWheel(); // Teken het rad initieel - beter om dit te doen als overlay opent
    }

    const storedLastClaimTime = localStorage.getItem('lastClaimTime');
    if (storedLastClaimTime) {
        lastClaimTime = parseInt(storedLastClaimTime, 10);
    }
    updateClaimUI(); // Update de UI voor de #open-wheel-button
    if (claimCountdownInterval) clearInterval(claimCountdownInterval);
    claimCountdownInterval = setInterval(updateClaimUI, 1000);
}

function updateClaimUI() {
    // Deze functie beheert nu de #open-wheel-button en zijn timer
    const openWheelButton = document.getElementById('open-wheel-button');
    const countdownElement = document.getElementById('open-wheel-countdown'); // Nieuwe countdown ID
    const timerTextElement = document.getElementById('open-wheel-timer'); // Nieuwe timer tekst ID
    const spinNowButton = document.getElementById('spin-now-button');


    if (!openWheelButton || !countdownElement || !timerTextElement) {
        if (claimCountdownInterval) clearInterval(claimCountdownInterval);
        return;
    }

    const now = Date.now();
    const timeSinceLastClaim = now - lastClaimTime;
    const timeRemaining = claimInterval - timeSinceLastClaim;

    if (timeRemaining <= 0) {
        openWheelButton.disabled = false;
        openWheelButton.textContent = 'Claim Gratis Spin!';
        timerTextElement.innerHTML = `Je kunt nu een gratis spin claimen! <span id="open-wheel-countdown"></span>`;
        if (document.getElementById('open-wheel-countdown')) document.getElementById('open-wheel-countdown').textContent = "";

        if (spinNowButton && wheelOverlay.style.display === 'block') { // Als overlay open is
            spinNowButton.disabled = isSpinning; // Afhankelijk van of het al draait
            spinNowButton.textContent = isSpinning ? 'Draaien...' : 'Draai Nu!';
        }

    } else {
        openWheelButton.disabled = true;
        openWheelButton.textContent = 'Gratis Spin Cooldown';
        const minutes = Math.floor((timeRemaining / (1000 * 60)) % 60);
        const seconds = Math.floor((timeRemaining / 1000) % 60);

        if (!timerTextElement.textContent.startsWith("Volgende spin beschikbaar over:")) {
            timerTextElement.innerHTML = `Volgende spin beschikbaar over: <span id="open-wheel-countdown">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</span>`;
        } else {
            countdownElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (spinNowButton) { // De knop in de overlay moet altijd disabled zijn als de hoofdknop op cooldown is
            spinNowButton.disabled = true;
        }
    }
}

// Functie om coins te initialiseren en weer te geven
function initializeAndDisplayCoins() {
    console.log("initializeAndDisplayCoins functie gestart");
    let coins = localStorage.getItem('coins');
    console.log("Coins uit local storage gehaald:", coins);

    if (coins === null) {
        console.log("Geen coins gevonden in local storage, instellen op 1000.");
        localStorage.setItem('coins', '1000');
        coins = '1000'; // Werk de lokale variabele bij
    } else {
        console.log("Coins gevonden in local storage:", coins);
    }

    const coinDisplayElement = document.getElementById('coin-display');
    if (coinDisplayElement) {
        console.log("Element 'coin-display' gevonden. Coins worden bijgewerkt.");
        coinDisplayElement.textContent = `Coins: ${coins}`;
    } else {
        console.warn("Element met ID 'coin-display' niet gevonden om coins weer te geven.");
    }
    console.log("initializeAndDisplayCoins functie voltooid");
}


// Roep de functie aan wanneer de DOM volledig geladen en geparsed is
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOMContentLoaded event getriggerd.");
    initializeAndDisplayCoins();
    initializeClaimFeature(); // Initialiseer de claim/rad feature
});