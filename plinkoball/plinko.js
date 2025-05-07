const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Globale variabelen en constanten eerst
const boardWidth = 600;
let boardStartX; // Wordt berekend in generate/resize
const rows = 15;
const pegRadius = 8;
const spacingY = 50;
const startOffsetY = 80;

// let ball = null; // Verwijderd
const balls = []; // Array om meerdere ballen bij te houden
const ballRadius = 10;
const gravity = 0.2;
const bounce = 0.6;

// let coins = 100; // Verwijderd: 'score' is hernoemd naar 'coins'
let coins; // Declaratie van coins
const dropCost = 10;
// let isBallInPlay = false; // Verwijderd
let lastDropTime = 0; // Tijdstip van de laatste drop
const dropDelay = 1000; // 1 seconde delay in milliseconden

// Geluid voor pin hit
const hitSound = new Audio('hit.mp3'); // Laden van het geluidsbestand
hitSound.volume = 0.1; // Stel de volume in op 50%

// Array declaraties VOOR de functies die ze gebruiken
const pegs = [];
const buckets = [];

const bucketHeight = 60;
const bucketCount = 11;
const bucketWidth = boardWidth / bucketCount;
const multipliers = [16, 5, 2, 0.5, 0.2, 0.2, 0.2, 0.5, 2, 5, 16];

// Lijst met fruit en groenten emoji's (Moved here)
const fruitAndVegEmojis = [
    '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🍍', '🥝', '🍅',
    '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠'
];

// --- Functie Definities ---

// Helper functie om coins bij te werken en op te slaan in localStorage
function setCoins(newAmount) {
    let roundedAmount = Math.round(newAmount * 100) / 100;
    coins = roundedAmount;
    localStorage.setItem("coins", coins.toString());
    // console.log("Coins set and saved to localStorage:", coins); // Optioneel voor debuggen
}

// Initialiseer coins bij het laden van de pagina
function initializeCoins() {
    const storedCoins = localStorage.getItem("coins");

    coins = parseFloat(storedCoins);

}

// Pinnen genereren (Geschrankt Raster patroon)
function generatePegs() {
    pegs.length = 0; // Leeg de array
    boardStartX = (canvas.width - boardWidth) / 2; // Herbereken start X

    const desiredPegSpacingX = 60; // Gewenste horizontale ruimte tussen pinnen
    const desiredPegSpacingY = spacingY; // Gebruik de globale verticale spacing
    const numPegsPerRow = Math.floor(boardWidth / desiredPegSpacingX); // Hoeveel pinnen passen er horizontaal?
    const actualSpacingX = boardWidth / (numPegsPerRow + 1); // Gelijkmatige verdeling binnen boardWidth

    const availableHeight = canvas.height - bucketHeight - startOffsetY - (pegRadius * 2); // Beschikbare hoogte voor pinnen
    const numRows = Math.max(1, Math.floor(availableHeight / desiredPegSpacingY)); // Hoeveel rijen passen er verticaal?

    console.log(`Calculated rows: ${numRows}, pegs per row: ${numPegsPerRow}`);

    for (let i = 0; i < numRows; i++) {
        let currentNumPegs = numPegsPerRow;
        let offsetX = 0;

        // Voeg offset toe voor geschrankte rijen (elke oneven rij)
        if (i % 2 !== 0) {
            offsetX = actualSpacingX / 2;
            // Optioneel: verminder het aantal pinnen op oneven rijen als ze anders te dicht bij de rand komen
            // currentNumPegs -= 1; // Haal dit weg als je wilt dat alle rijen evenveel pinnen hebben
        }

        // Bereken de start X voor deze rij om te centreren
        const rowContentWidth = (currentNumPegs - 1) * actualSpacingX;
        let startXForRow = boardStartX + (boardWidth - rowContentWidth) / 2 + offsetX;


        for (let j = 0; j < currentNumPegs; j++) {
            let x = startXForRow + j * actualSpacingX;
            let y = startOffsetY + i * desiredPegSpacingY;

            // Zorg dat pinnen niet buiten het bord vallen door de offset
            if (x >= boardStartX + pegRadius && x <= boardStartX + boardWidth - pegRadius) {
                pegs.push({ x: x, y: y, radius: pegRadius });
            }
        }
    }
    console.log(`Generated ${pegs.length} pegs in staggered grid layout.`);
}

// Potjes genereren
function generateBuckets() {
    buckets.length = 0; // Nu is 'buckets' gegarandeerd gedefinieerd
    boardStartX = (canvas.width - boardWidth) / 2;
    const bucketsY = canvas.height - bucketHeight;
    for (let i = 0; i < bucketCount; i++) {
        buckets.push({
            x: boardStartX + i * bucketWidth,
            y: bucketsY,
            width: bucketWidth,
            height: bucketHeight,
            multiplier: multipliers[i]
        });
    }
}

// Functie om canvas grootte in te stellen en layout te updaten
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Roep generate functies aan NADAT canvas is geresized
    generatePegs(); // Deze gebruikt nu de nieuwe willekeurige logica
    generateBuckets();
}

// --- Teken Functies ---
function drawPegs() {
    ctx.fillStyle = 'black';
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    });
}

function drawBuckets() {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.font = '14px monospace'; // Gewijzigd van Arial naar monospace
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    buckets.forEach((bucket, index) => {
        // Teken verticale lijnen (scheidingen)
        if (index > 0) { // Sla de eerste linkerlijn over
            ctx.beginPath();
            ctx.moveTo(bucket.x, bucket.y);
            ctx.lineTo(bucket.x, bucket.y + bucket.height);
            ctx.stroke();
        }

        // Teken multiplier tekst
        // Kleur gebaseerd op multiplier waarde
        if (bucket.multiplier < 1) {
            ctx.fillStyle = 'grey';
        } else if (bucket.multiplier < 5) {
            ctx.fillStyle = 'blue';
        } else {
            ctx.fillStyle = 'purple'; // Hoge multipliers
        }
        ctx.fillText(`x${bucket.multiplier}`, bucket.x + bucket.width / 2, bucket.y + bucket.height / 2);
    });
    // Teken de onderste lijn van de buckets (nu gebaseerd op bucket Y)
    ctx.beginPath();
    const firstBucket = buckets[0];
    const lastBucket = buckets[buckets.length - 1];
    ctx.moveTo(firstBucket.x, firstBucket.y + firstBucket.height); // Start links onderaan potjes
    ctx.lineTo(lastBucket.x + lastBucket.width, lastBucket.y + lastBucket.height); // Eindig rechts onderaan potjes
    ctx.stroke();

    // Teken de bovenste lijn van de potjes
    ctx.beginPath();
    ctx.moveTo(firstBucket.x, firstBucket.y);
    ctx.lineTo(lastBucket.x + lastBucket.width, lastBucket.y);
    ctx.stroke();
}

function drawBalls() {
    balls.forEach(currentBall => {
        if (!currentBall) return;

        // --- Gebruik de opgeslagen Emoji ---
        // Haal de vaste emoji op die bij het maken is toegewezen
        const emojiToDraw = currentBall.emoji; // Gebruik de opgeslagen emoji

        // Stel de lettergrootte in
        const emojiSize = ballRadius * 2;
        ctx.font = `${emojiSize}px monospace`; // Gewijzigd van Arial naar monospace
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Teken de vaste emoji van deze bal
        ctx.fillText(emojiToDraw, currentBall.x, currentBall.y);
        // --- Einde aanpassing ---
    });
}

function drawScore() {
    ctx.fillStyle = 'black';
    ctx.font = '24px monospace'; // Gewijzigd van Arial naar monospace
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Coins: ${coins}`, 10, 10); // 'Score' is veranderd naar 'Coins' en 'score' naar 'coins'
}

// --- Update & Logica Functies ---
function updateBalls() { // Hernoemd van updateBall
    const now = Date.now();
    let ballsToRemove = []; // Houd bij welke ballen verwijderd moeten worden

    balls.forEach((currentBall, index) => { // Loop door de balls array
        // Check 1: Is de bal geland en wacht hij?
        if (currentBall.landed) {
            if (now - currentBall.landedTime > 5000) { // 5 seconden wachten
                console.log(`Ball ${currentBall.id} removed after 5 seconds.`);
                ballsToRemove.push(index); // Markeer voor verwijdering
                return; // Ga naar de volgende bal in de forEach
            } else {
                // Lichte horizontale beweging/demping
                currentBall.x += currentBall.vx;
                currentBall.vx *= 0.9;

                // Zorg dat bal binnen het potje blijft
                const bucketIndex = buckets.findIndex(b => currentBall.landedAtX >= b.x && currentBall.landedAtX < b.x + b.width);
                if (bucketIndex !== -1) {
                    const currentBucket = buckets[bucketIndex];
                    if (currentBall.x - currentBall.radius < currentBucket.x) {
                        currentBall.x = currentBucket.x + currentBall.radius;
                        currentBall.vx *= -0.5;
                    } else if (currentBall.x + currentBall.radius > currentBucket.x + currentBucket.width) {
                        currentBall.x = currentBucket.x + currentBucket.width - currentBall.radius;
                        currentBall.vx *= -0.5;
                    }
                    const bucketBottomY = currentBucket.y + currentBucket.height;
                    if (currentBall.y + currentBall.radius > bucketBottomY) {
                        currentBall.y = bucketBottomY - currentBall.radius;
                    }
                } else { // Fallback
                    const boardLeftEdge = boardStartX;
                    const boardRightEdge = boardStartX + boardWidth;
                    if (currentBall.x + currentBall.radius > boardRightEdge || currentBall.x - currentBall.radius < boardLeftEdge) {
                        currentBall.vx *= -0.5;
                        if (currentBall.x + currentBall.radius > boardRightEdge) currentBall.x = boardRightEdge - currentBall.radius;
                        if (currentBall.x - currentBall.radius < boardLeftEdge) currentBall.x = boardLeftEdge + currentBall.radius;
                    }
                }
                return; // Sla de rest van de physics over voor deze gelande bal
            }
        }

        // Check 2: Is de bal nog actief aan het vallen? (Alleen als niet geland)
        // if (!isBallInPlay) return; // Verwijderd

        // Bewaar oude positie
        const oldX = currentBall.x;
        const oldY = currentBall.y;

        // Zwaartekracht toepassen
        currentBall.vy += gravity;
        currentBall.x += currentBall.vx;
        currentBall.y += currentBall.vy;

        // --- Bucket Wall Collision Check ---
        const bucketTopY = canvas.height - bucketHeight;
        const bucketBottomY = canvas.height;
        if (currentBall.y + currentBall.radius > bucketTopY && currentBall.y - currentBall.radius < bucketBottomY) {
            for (let i = 0; i < buckets.length; i++) {
                const bucket = buckets[i];
                const wallX = bucket.x;

                // Check linker buitenmuur
                if (i === 0) {
                    if (currentBall.x - currentBall.radius < wallX && oldX - currentBall.radius >= wallX) {
                        currentBall.x = wallX + currentBall.radius;
                        currentBall.vx *= -bounce;
                    }
                }
                // Check interne muren
                if (i > 0) {
                    const dividerX = bucket.x;
                    if (currentBall.x + currentBall.radius > dividerX && oldX + currentBall.radius <= dividerX) {
                        currentBall.x = dividerX - currentBall.radius;
                        currentBall.vx *= -bounce;
                    } else if (currentBall.x - currentBall.radius < dividerX && oldX - currentBall.radius >= dividerX) {
                        currentBall.x = dividerX + currentBall.radius;
                        currentBall.vx *= -bounce;
                    }
                }
                // Check rechter buitenmuur
                if (i === buckets.length - 1) {
                    const rightWallX = bucket.x + bucket.width;
                    if (currentBall.x + currentBall.radius > rightWallX && oldX + currentBall.radius <= rightWallX) {
                        currentBall.x = rightWallX - currentBall.radius;
                        currentBall.vx *= -bounce;
                    }
                }
            }
        }
        // --- Einde Bucket Wall Collision Check ---


        // Bodem check (potjes) - Landingsdetectie
        for (const bucket of buckets) {
            const currentBucketBottomY = bucket.y + bucket.height;
            if (currentBall.y + currentBall.radius >= currentBucketBottomY && oldY + currentBall.radius < currentBucketBottomY) {
                if (currentBall.x >= bucket.x && currentBall.x <= bucket.x + bucket.width) {
                    const winnings = dropCost * bucket.multiplier;
                    // coins += winnings; // Oud
                    // coins = Math.round(coins * 100) / 100; // Oud
                    setCoins(coins + winnings); // Nieuw: update en sla op
                    console.log(`Ball ${currentBall.id} landed in x${bucket.multiplier}! Won ${winnings}. New coins: ${coins}`);

                    currentBall.landed = true;
                    currentBall.landedTime = now;
                    currentBall.landedAtX = currentBall.x;
                    currentBall.y = currentBucketBottomY - currentBall.radius;
                    currentBall.vy = 0;
                    currentBall.vx *= 0.1;

                    return; // Stop verdere checks voor deze bal in deze frame
                }
            }
        }

        // Als de bal *onder* de potjeslijn komt maar niet landt
        if (currentBall.y - currentBall.radius > canvas.height) {
            console.log(`Ball ${currentBall.id} missed buckets and went off screen.`);
            ballsToRemove.push(index); // Markeer voor verwijdering
            return;
        }


        // Zijkant check (boven de potjes)
        if (currentBall.y + currentBall.radius < bucketTopY) {
            const boardLeftEdge = boardStartX;
            const boardRightEdge = boardStartX + boardWidth;
            if (currentBall.x + currentBall.radius > boardRightEdge || currentBall.x - currentBall.radius < boardLeftEdge) {
                currentBall.vx *= -1;
                if (currentBall.x + currentBall.radius > boardRightEdge) currentBall.x = boardRightEdge - currentBall.radius;
                if (currentBall.x - currentBall.radius < boardLeftEdge) currentBall.x = boardLeftEdge + currentBall.radius;
            }
        }


        // Collision detectie met pinnen
        pegs.forEach(peg => {
            const dx = currentBall.x - peg.x;
            const dy = currentBall.y - peg.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = currentBall.radius + peg.radius;

            if (distance < minDistance) {
                hitSound.currentTime = 0;
                hitSound.play().catch(error => console.log("Audio play failed:", error));

                const angle = Math.atan2(dy, dx);
                const overlap = minDistance - distance;
                const adjustX = Math.cos(angle) * overlap;
                const adjustY = Math.sin(angle) * overlap;

                currentBall.x += adjustX;
                currentBall.y += adjustY;

                const normalX = dx / distance;
                const normalY = dy / distance;
                const dotProduct = currentBall.vx * normalX + currentBall.vy * normalY;

                currentBall.vx = (currentBall.vx - 2 * dotProduct * normalX) * bounce;
                currentBall.vy = (currentBall.vy - 2 * dotProduct * normalY) * bounce;
                currentBall.vx += (Math.random() - 0.5) * 1.0;
            }
        });
    }); // Einde forEach loop

    // Verwijder gemarkeerde ballen (in omgekeerde volgorde om index problemen te voorkomen)
    ballsToRemove.sort((a, b) => b - a); // Sorteer indices van hoog naar laag
    ballsToRemove.forEach(index => {
        balls.splice(index, 1);
    });
}

function dropNewBall(clickX) {
    // Check 1: Is er genoeg tijd verstreken sinds de laatste drop?
    const now = Date.now();
    if (now - lastDropTime < dropDelay) {
        console.log(`Wacht nog ${((dropDelay - (now - lastDropTime)) / 1000).toFixed(1)}s`);
        return;
    }

    // Check 2: Is er genoeg score?
    if (coins < dropCost) {
        console.log("Niet genoeg coins om een bal te laten vallen!");
        return;
    }

    // coins -= dropCost; // Oud
    setCoins(coins - dropCost); // Nieuw: update en sla op
    lastDropTime = now; // Update de tijd van de laatste drop
    console.log(`Dropped ball. Cost: ${dropCost}. Remaining coins: ${coins}`);

    // Aanpassing startpositie om randen te vermijden
    let initialX = clickX;
    const safeMargin = bucketWidth * 1.5;
    const leftSafeZoneStart = boardStartX + safeMargin;
    const rightSafeZoneEnd = boardStartX + boardWidth - safeMargin;

    if (initialX < leftSafeZoneStart) {
        initialX = leftSafeZoneStart;
        console.log("Drop position adjusted from left edge.");
    } else if (initialX > rightSafeZoneEnd) {
        initialX = rightSafeZoneEnd;
        console.log("Drop position adjusted from right edge.");
    }
    initialX = Math.max(boardStartX + ballRadius, Math.min(initialX, boardStartX + boardWidth - ballRadius));

    // --- NIEUW: Kies hier eenmalig een willekeurige emoji ---
    const randomIndex = Math.floor(Math.random() * fruitAndVegEmojis.length);
    const chosenEmoji = fruitAndVegEmojis[randomIndex];
    // --- Einde nieuw ---

    // Maak een nieuw bal object
    const newBall = {
        x: initialX,
        y: 30,
        radius: ballRadius,
        vx: (Math.random() - 0.5) * 2,
        vy: 0,
        landed: false,
        landedTime: null,
        landedAtX: null,
        id: Date.now() + Math.random(), // Unieke ID voor elke bal
        emoji: chosenEmoji // Sla de gekozen emoji op in het bal object
    };

    // Voeg de nieuwe bal toe aan de array
    balls.push(newBall);
    // isBallInPlay = true; // Verwijderd
}

// Game loop
// Game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Tekenen
    drawPegs();
    drawBuckets();
    drawBalls(); // Aangepast
    drawScore();

    // Updaten
    updateBalls(); // Aangepast

    // Volgende frame aanvragen
    requestAnimationFrame(gameLoop);
}

// --- Initialisatie & Event Listeners 

// Initieel canvas grootte instellen & layout genereren
// Deze aanroep komt nu NA alle definities
initializeCoins(); // Roep dit aan voordat de game loop start of andere functies die coins gebruiken
resizeCanvas();

// Event listener voor venster grootte wijzigingen
// Deze komt ook NA de definitie van resizeCanvas
window.addEventListener('resize', resizeCanvas);

// Start de game loop
gameLoop();

// Event listener om een nieuwe bal te laten vallen bij een klik
canvas.addEventListener('click', (event) => {
    dropNewBall(event.clientX);
});