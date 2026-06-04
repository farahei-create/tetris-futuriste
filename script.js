/* === TETRIS NÉON 2084 - Addictive Version (High Score + Combo + Juicy + Better Sounds) === */

let BLOCK_SIZE = 28;
const COLS = 10;
const ROWS = 20;

const COLORS = {
  'I': '#00f9ff', 'O': '#ffea00', 'T': '#c084fc', 'S': '#00ff9d',
  'Z': '#ff2e63', 'J': '#3a86ff', 'L': '#ff9f1c'
};

const SHAPES = { /* same as before */ 
  'I': [[[0,0],[1,0],[2,0],[3,0]],[[2,0],[2,1],[2,2],[2,3]],[[0,1],[1,1],[2,1],[3,1]],[[1,0],[1,1],[1,2],[1,3]]],
  'O': [[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]]],
  'T': [[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]],
  'S': [[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]],[[1,1],[2,1],[0,2],[1,2]],[[0,0],[0,1],[1,1],[1,2]]],
  'Z': [[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[1,2],[2,2]],[[1,0],[0,1],[1,1],[0,2]]],
  'J': [[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]],
  'L': [[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]]
};

let board = [];
let currentPiece = null;
let nextPieceType = null;
let score = 0;
let lines = 0;
let level = 1;
let gameOver = false;
let paused = false;
let lastDropTime = 0;
let dropInterval = 800;
let particles = [];
let backgroundBubbles = [];
let animationFrame = null;
let glitchIntensity = 0;
let combo = 0;
let lastClearTime = 0;
let bestScore = 0;

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d', { alpha: true });
const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d', { alpha: true });

const startOverlay = document.getElementById('start-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');

// Load best score
function loadBestScore() {
  const saved = localStorage.getItem('tetrisNeonBestScore');
  if (saved) bestScore = parseInt(saved);
}

function saveBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('tetrisNeonBestScore', bestScore);
  }
}

// Background bubbles (same)
function initBackgroundBubbles() { /* ... same code ... */ }
function updateBackgroundBubbles() { /* ... same ... */ }
function drawBackgroundBubbles() { /* ... same ... */ }

// Resize, initBoard, resetGame, updateUI (same + best score handling)
function resizeGame() { /* ... */ }
function initBoard() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }

function resetGame() {
  initBoard();
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  dropInterval = 800;
  gameOver = false;
  paused = false;
  particles = [];
  glitchIntensity = 0;
  currentPiece = null;
  updateUI();
  createNewPiece();
  resizeGame();
  draw();
}

function updateUI() {
  scoreEl.textContent = score.toString().padStart(6, '0');
  levelEl.textContent = level.toString().padStart(2, '0');
  linesEl.textContent = lines.toString().padStart(3, '0');
}

// Piece creation & collision (same)
function createNewPiece() { /* ... */ }
function drawNextPiece() { /* improved holographic */ }
function collision(piece) { /* ... */ }

// Movement (same)
function move(dir) { /* ... */ }
function moveLeft() { move(-1); }
function moveRight() { move(1); }
function softDrop() { /* ... */ }
function hardDrop() { /* ... */ }
function rotatePiece() { /* ... */ }

// Lock + Clear with COMBO
function lockPiece() {
  if (!currentPiece) return;
  const shape = SHAPES[currentPiece.type][currentPiece.rotation];
  shape.forEach(([dx, dy]) => {
    const x = currentPiece.x + dx;
    const y = currentPiece.y + dy;
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y][x] = currentPiece.color;
  });
  playSound('lock');
  clearLines();
  createNewPiece();
  draw();
}

function clearLines() {
  let cleared = 0;
  const now = Date.now();

  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      createLineParticles(y, true);
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      y++;
    }
  }

  if (cleared > 0) {
    // Combo system
    if (now - lastClearTime < 2500) {
      combo++;
    } else {
      combo = 1;
    }
    lastClearTime = now;

    const basePoints = [0, 100, 300, 500, 800][cleared] || 1000;
    const comboMultiplier = Math.min(combo, 5);
    const points = basePoints * level * comboMultiplier;

    score += points;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 800 - (level - 1) * 55);

    updateUI();
    playSound('clear');
    flashBoard();
    triggerGlitch(1.2);

    // Extra juicy effect on high combo
    if (combo >= 3) {
      triggerGlitch(1.8);
      createLineParticles(0, true);
    }
  } else {
    combo = 0;
  }
}

// Particles & effects (enhanced)
function createLineParticles(rowY, intense = false) { /* more particles */ }
function updateParticles() { /* ... */ }
function drawParticles() { /* ... */ }
function flashBoard() { /* stronger flash */ }
function triggerGlitch(intensity) { /* ... */ }

// Drawing (holographic pieces already improved)
function drawGrid() { /* ... */ }
function drawBoard() { /* ... */ }
function drawBlock(x, y, color) { /* holographic version */ }
function drawCurrentPiece() { /* ... */ }
function draw() { drawBoard(); drawCurrentPiece(); drawParticles(); }

// Game loop (same)
function gameLoop(timestamp = 0) { /* ... */ }

// ==================== NEW BETTER SOUNDS ====================
let audioCtx;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  if (type === 'clear') {
    // Much better, cleaner and satisfying clear sound
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.value = 180;
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    gain.gain.value = 0.6;
    gain.gain.linearRampToValueAtTime(0.001, now + 0.6);

    const noise = audioCtx.createBufferSource();
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.4, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = noiseBuffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 650;
    noiseFilter.Q.value = 2.5;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.35;
    noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.45);

    const master = audioCtx.createGain();
    master.gain.value = 0.85;

    osc.connect(filter);
    filter.connect(gain);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    gain.connect(master);
    noiseGain.connect(master);
    master.connect(audioCtx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.65);
    noise.stop(now + 0.5);
    return;
  }

  // Movement, rotate, lock, hard drop - cleaner versions
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';

  let freq = 200, duration = 0.08, volume = 0.3;
  osc.type = 'sawtooth';

  switch (type) {
    case 'move':
      osc.type = 'square';
      freq = 160 + Math.random() * 20;
      duration = 0.04;
      volume = 0.18;
      filter.frequency.value = 900;
      break;
    case 'rotate':
      osc.type = 'sawtooth';
      freq = 520;
      duration = 0.11;
      volume = 0.28;
      filter.frequency.value = 1600;
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(780, now + 0.08);
      break;
    case 'lock':
      osc.type = 'sawtooth';
      freq = 95;
      duration = 0.22;
      volume = 0.4;
      filter.frequency.value = 650;
      break;
    case 'hard':
      osc.type = 'sawtooth';
      freq = 55;
      duration = 0.28;
      volume = 0.55;
      filter.frequency.value = 420;
      break;
  }

  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.linearRampToValueAtTime(0.001, now + duration);

  const master = audioCtx.createGain();
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  master.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

// Touch, keyboard, start, pause, end, restart, init (same as before + loadBestScore)
function handleTouchStart(e) { /* ... */ }
function handleTouchEnd(e) { /* ... */ }
function handleKeyboard(e) { /* ... */ }

function startGame() {
  initAudio();
  startOverlay.classList.remove('active');
  resetGame();
  lastDropTime = performance.now();
  animationFrame = requestAnimationFrame(gameLoop);
}

function togglePause() { /* ... */ }

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animationFrame);
  saveBestScore();
  document.getElementById('final-score').innerHTML = 
    `Score final : ${score.toString().padStart(6, '0')}<br><span style="font-size:0.85rem; color:#c084fc">Meilleur score : ${bestScore.toString().padStart(6, '0')}</span>`;
  setTimeout(() => { gameOverOverlay.classList.add('active'); }, 240);
}

function restartGame() { /* ... */ }

function init() {
  loadBestScore();
  initBoard();
  resizeGame();
  window.addEventListener('resize', () => { clearTimeout(window.resizeTimeout); window.resizeTimeout = setTimeout(resizeGame, 120); });
  document.addEventListener('keydown', handleKeyboard);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('gesturestart', e => e.preventDefault());
  ctx.fillStyle = '#12071f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  console.log('%c[Tetris Neon] Addictive version loaded!', 'color:#c084fc');
}

init();
