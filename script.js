const symbols = ['🍒', '🍋', '🍊', '🔔', '💎', '🎰'];
const symbolWeights = [40, 30, 15, 8, 5, 2];
let spinCost = 5;
let credits = 100;

const reels = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3')
];
const spinButton = document.getElementById('spin-button');
const creditsDisplay = document.getElementById('credits-value');
const winDisplay = document.getElementById('win-value');
const gameOverModal = document.getElementById('game-over-modal');
const restartButton = document.getElementById('restart-button');
const machineBody = document.getElementById('machine-body');
const winHistory = document.getElementById('win-history');
const currentBetDisplay = document.getElementById('current-bet-display');
const betButtons = document.querySelectorAll('.bet-btn');

// --- Sound Logic ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, type = 'sine', duration = 0.1) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playWinSound(amount) {
    const base = 440;
    const notes = [0, 4, 7, 12]; // Major chord
    notes.forEach((n, i) => {
        setTimeout(() => {
            playSound(base * Math.pow(2, n / 12), 'square', 0.2);
        }, i * 100);
    });
}

// --- Confetti Logic ---
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.size = Math.random() * 8 + 4;
        this.speedX = (Math.random() - 0.5) * 15;
        this.speedY = (Math.random() - 0.5) * 15 - 5;
        this.color = `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.gravity = 0.3;
    }
    update() {
        this.speedY += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

function triggerConfetti() {
    particles = [];
    for (let i = 0; i < 100; i++) particles.push(new Particle());
    animateConfetti();
}

function animateConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, idx) => {
        p.update();
        p.draw();
        if (p.y > canvas.height) particles.splice(idx, 1);
    });
    if (particles.length > 0) requestAnimationFrame(animateConfetti);
}

// --- Core Game Logic ---
function initReels() {
    reels.forEach(reel => {
        reel.innerHTML = '';
        const initialSym = symbols[Math.floor(Math.random() * symbols.length)];
        const div = document.createElement('div');
        div.className = 'symbol';
        div.textContent = initialSym;
        reel.appendChild(div);
    });
}

function getRandomSymbol() {
    const totalWeight = symbolWeights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < symbols.length; i++) {
        if (random < symbolWeights[i]) return symbols[i];
        random -= symbolWeights[i];
    }
    return symbols[0];
}

function addHistoryEntry(amount, symbol) {
    const entry = document.createElement('div');
    entry.className = 'history-item';
    entry.innerHTML = `<strong>+${amount} Credits</strong> (3x ${symbol})`;

    if (winHistory.querySelector('.empty-msg')) {
        winHistory.innerHTML = '';
    }

    winHistory.prepend(entry);
    if (winHistory.children.length > 5) {
        winHistory.lastElementChild.remove();
    }
}

function calculateWin(results) {
    const [s1, s2, s3] = results;
    const multiplier = spinCost / 5;

    if (s1 === s2 && s2 === s3) {
        let baseWin = 0;
        switch (s1) {
            case '🎰': baseWin = 1000; break;
            case '💎': baseWin = 500; break;
            case '🔔': baseWin = 200; break;
            case '🍊': baseWin = 100; break;
            case '🍋': baseWin = 50; break;
            case '🍒': baseWin = 30; break;
        }
        const totalWin = baseWin * multiplier;
        addHistoryEntry(totalWin, s1);
        if (baseWin >= 200) triggerConfetti();
        playWinSound(totalWin);
        return totalWin;
    } else if (s1 === s2 || s2 === s3 || s1 === s3) {
        return Math.floor(5 * multiplier);
    }
    return 0;
}

function updateCredits(amount) {
    credits += amount;
    creditsDisplay.textContent = Math.floor(credits);
    if (credits < spinCost) showGameOver();
}

function showGameOver() {
    spinButton.disabled = true;
    setTimeout(() => gameOverModal.classList.remove('hidden'), 500);
}

// Bet Selection
betButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        if (spinButton.disabled) return;
        betButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        spinCost = parseInt(btn.dataset.bet);
        currentBetDisplay.textContent = spinCost;
        playSound(220, 'sine', 0.05);
    });
});

async function spin() {
    if (credits < spinCost) return;

    if (audioCtx.state === 'suspended') audioCtx.resume();

    spinButton.disabled = true;
    updateCredits(-spinCost);
    winDisplay.textContent = '0';
    winDisplay.classList.remove('winning-text');
    machineBody.classList.remove('glow');
    playSound(110, 'triangle', 0.1);

    const results = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];

    reels.forEach((reel, index) => {
        const symbolHeight = 160;
        const totalSymbols = 40 + (index * 10);
        const strip = [];
        for (let i = 0; i < totalSymbols - 1; i++) {
            strip.push(symbols[Math.floor(Math.random() * symbols.length)]);
        }
        strip.push(results[index]);

        reel.innerHTML = '';
        reel.style.transition = 'none';
        reel.style.transform = 'translateY(0)';

        strip.forEach(sym => {
            const div = document.createElement('div');
            div.className = 'symbol';
            div.textContent = sym;
            reel.appendChild(div);
        });

        reel.offsetHeight; // Force reflow

        const duration = 2 + index * 0.7;
        reel.style.transition = `transform ${duration}s cubic-bezier(0.45, 0.05, 0.55, 0.95)`;
        reel.style.transform = `translateY(-${(totalSymbols - 1) * symbolHeight}px)`;

        // Spin sound "tick" simulator (simplified)
        const tickInterval = setInterval(() => {
            playSound(150 + Math.random() * 50, 'sine', 0.02);
        }, 100);
        setTimeout(() => clearInterval(tickInterval), duration * 1000);

        if (index === 2) {
            setTimeout(() => {
                const winAmount = calculateWin(results);
                if (winAmount > 0) {
                    updateCredits(winAmount);
                    winDisplay.textContent = winAmount;
                    winDisplay.classList.add('winning-text');
                    machineBody.classList.add('glow');
                    machineBody.classList.add('shake');
                    setTimeout(() => machineBody.classList.remove('shake'), 500);
                }

                if (credits >= spinCost) {
                    spinButton.disabled = false;
                }
            }, duration * 1000);
        }
    });
}

spinButton.addEventListener('click', spin);

restartButton.addEventListener('click', () => {
    credits = 0;
    updateCredits(50);
    gameOverModal.classList.add('hidden');
    spinButton.disabled = false;
    winDisplay.textContent = '0';
    winHistory.innerHTML = '<div class="empty-msg">No wins yet...</div>';
});

initReels();
