// Full vertical scrolling slot machine
const canvas = document.getElementById('slotMachine');
const ctx = canvas.getContext('2d');

const symbols = ['🍒', '🍋', '🍉', '7️⃣', '🍇', '⭐', '🍀', '🔔'];
const cols = 5;
const rows = 5;
const symbolBufferSize = 10; // More symbols in buffer for smooth animation
const spinSpeed = 5; // Speed of the scrolling
const delayBetweenStops = 300; // Delay between stopping each column

let coins = 100;
let winMessage = "";

// Sounds
const spinSound = document.getElementById('spinSound');
const winSound = document.getElementById('winSound');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    setupColumns();
    draw();
});

const button = {
    x: 0,
    y: 0,
    width: 200,
    height: 60,
    text: "SPIN"
};

class Column {
    constructor(x, y, cellSize) {
        this.x = x;
        this.y = y;
        this.cellSize = cellSize;
        this.symbols = [];
        this.offset = 0;
        this.spinning = false;
        this.finalSymbols = [];
        this.reset();
    }

    reset() {
        this.symbols = [];
        for (let i = 0; i < symbolBufferSize; i++) {
            this.symbols.push(this.getRandomSymbol());
        }
        this.offset = 0;
        this.spinning = true;
    }

    getRandomSymbol() {
        return symbols[Math.floor(Math.random() * symbols.length)];
    }

    update() {
        if (!this.spinning) return;
        this.offset += spinSpeed;
        if (this.offset >= this.cellSize) {
            this.offset -= this.cellSize;
            this.symbols.pop();
            this.symbols.unshift(this.getRandomSymbol());
        }
    }

    stop(finalSymbols) {
        this.spinning = false;
        this.finalSymbols = finalSymbols;
    }

    draw(ctx) {
        // Draw column box (without animation)
        ctx.fillStyle = '#111';
        ctx.fillRect(this.x + 4, this.y + 4, this.cellSize - 8, this.cellSize * rows - 8);

        // Draw symbols (animate only the symbols)
        for (let i = 0; i < rows + 1; i++) {
            const symbol = this.symbols[i];
            const yPos = this.y + (i - 1) * this.cellSize + this.offset;

            // Only draw visible rows
            if (yPos < this.y - this.cellSize || yPos > this.y + rows * this.cellSize) continue;

            ctx.fillStyle = '#fff';
            ctx.font = `${this.cellSize * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symbol, this.x + this.cellSize / 2, yPos + this.cellSize / 2);
        }
    }

    finalize() {
        this.symbols = [...this.finalSymbols];
        this.offset = 0;
    }

    getFinalSymbols() {
        return this.finalSymbols;
    }
}

let columns = [];
let spinning = false;

function setupColumns() {
    const gridWidth = canvas.width * 0.8;
    const gridHeight = canvas.height * 0.6;
    const baseCell = Math.min(gridWidth / cols, gridHeight / rows);
    const gridX = (canvas.width - baseCell * cols) / 2;
    const gridY = (canvas.height - baseCell * rows) / 2;

    columns = [];
    for (let i = 0; i < cols; i++) {
        columns.push(new Column(gridX + i * baseCell, gridY, baseCell));
    }
}

function spin() {
    if (spinning || coins < 10) return;
    coins -= 10;
    winMessage = "";
    spinning = true;
    spinSound.currentTime = 0;
    spinSound.play();

    setupColumns();
    for (const col of columns) col.reset();

    const finalGrid = [];
    for (let r = 0; r < rows; r++) {
        finalGrid.push([]);
        for (let c = 0; c < cols; c++) {
            finalGrid[r][c] = symbols[Math.floor(Math.random() * symbols.length)];
        }
    }

    // Spin logic, but no immediate replacement of symbols
    columns.forEach((col, idx) => {
        setTimeout(() => {
            const colFinal = [];
            for (let r = 0; r < rows; r++) {
                colFinal.push(finalGrid[r][idx]);
            }
            col.stop(colFinal); // Set the final symbols without resetting
        }, delayBetweenStops * idx);
    });

    setTimeout(() => {
        // Finalize symbols after stopping
        for (const col of columns) {
            col.finalize();
        }
        spinning = false;
        checkWin(finalGrid);
    }, delayBetweenStops * cols + 800);
}

function checkWin(grid) {
    let win = false;
    for (let r = 0; r < rows; r++) {
        if (grid[r].every(s => s === grid[r][0])) {
            win = true;
            break;
        }
    }

    if (win) {
        coins += 50;
        winMessage = "🎉 You Won 50 Coins!";
        winSound.play();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = "#fff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Slot Machine", canvas.width / 2, 60);

    // Coins
    ctx.font = "28px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`💰 Coins: ${coins}`, 40, 100);

    // Draw the columns and their current symbols
    for (const col of columns) {
        col.update();
        col.draw(ctx);
    }

    // Spin button
    button.x = canvas.width / 2 - button.width / 2;
    button.y = canvas.height - 100;

    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(button.x, button.y, button.width, button.height);
    ctx.fillStyle = "#fff";
    ctx.font = "28px Arial";
    ctx.textAlign = "center";
    ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);

    // Display win message if available
    if (winMessage) {
        ctx.font = "32px Arial";
        ctx.fillStyle = "#ff0";
        ctx.fillText(winMessage, canvas.width / 2, button.y - 40);
    }

    requestAnimationFrame(draw);
}

canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (
        mx >= button.x &&
        mx <= button.x + button.width &&
        my >= button.y &&
        my <= button.y + button.height
    ) {
        spin();
    }
});

// Init
setupColumns();
draw();
