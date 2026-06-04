/* === TETRIS NÉON FUTURISTE - Script complet === */

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 32;

// Couleurs néon cyberpunk
const COLORS = {
  'I': '#00f9ff',
  'O': '#ffea00',
  'T': '#9d4edd',
  'S': '#00ff9d',
  'Z': '#ff2e63',
  'J': '#3a86ff',
  'L': '#ff9f1c'
};

// Formes des tétrominos (rotations)
const SHAPES = {
  'I': [
    [[0,0], [1,0], [2,0], [3,0]],
    [[2,0], [2,1], [2,2], [2,3]],
    [[0,1], [1,1], [2,1], [3,1]],
    [[1,0], [1,1], [1,2], [1,3]]
  ],
  'O': [
    [[1,0], [2,0], [1,1], [2,1]],
    [[1,0], [2,0], [1,1], [2,1]],
    [[1,0], [2,0], [1,1], [2,1]],
    [[1,0], [2,0], [1,1], [2,1]]
  ],
  'T': [
    [[1,0], [0,1], [1,1], [2,1]],
    [[1,0], [1,1], [2,1], [1,2]],
    [[0,1], [1,1], [2,1], [1,2]],
    [[1,0], [0,1], [1,1], [1,2]]
  ],
  'S': [
    [[1,0], [2,0], [0,1], [1,1]],
    [[1,0], [1,1], [2,1], [2,2]],
    [[1,1], [2,1], [0,2], [1,2]],
    [[0,0], [0,1], [1,1], [1,2]]
  ],
  'Z': [
    [[0,0], [1,0], [1,1], [2,1]],
    [[2,0], [1,1], [2,1], [1,2]],
    [[0,1], [1,1], [1,2], [2,2]],
    [[1,0], [0,1], [1,1], [0,2]]
  ],
  'J': [
    [[0,0], [0,1], [1,1], [2,1]],
    [[1,0], [2,0], [1,1], [1,2]],
    [[0,1], [1,1], [2,1], [2,2]],
    [[1,0], [1,1], [0,2], [1,2]]
  ],
  'L': [
    [[2,0], [0,1], [1,1], [2,1]],
    [[1,0], [1,1], [1,2], [2,2]],
    [[0,1], [1,1], [2,1], [0,2]],
    [[0,0], [1,0], [1,1], [1,2]]
  ]
};

// Variables globales du jeu
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
let animationFrame = null;

// Canvas
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d', { alpha: true });

const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d', { alpha: true });

// Overlays
const startOverlay = document.getElementById('start-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');

// UI elements
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');

// === INITIALISATION ===
function initBoard() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function resetGame() {
  initBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 800;
  gameOver = false;
  paused = false;
  particles = [];
  currentPiece = null;
  updateUI();
  createNewPiece();
  draw();
}

function updateUI() {
  scoreEl.textContent = score.toString().padStart(6, '0');
  levelEl.textContent = level.toString().padStart(2, '0');
  linesEl.textContent = lines.toString().padStart(3, '0');
}

// === CRÉATION DES PIÈCES ===
function createNewPiece() {
  if (!nextPieceType) {
    const types = Object.keys(SHAPES);
    nextPieceType = types[Math.floor(Math.random() * types.length)];
  }

  const type = nextPieceType;
  currentPiece = {
    type: type,
    rotation: 0,
    x: Math.floor(COLS / 2) - 1,
    y: 0,
    color: COLORS[type]
  };

  // Préparer la suivante
  const types = Object.keys(SHAPES);
  nextPieceType = types[Math.floor(Math.random() * types.length)];

  drawNextPiece();

  // Vérifier game over immédiat
  if (collision(currentPiece)) {
    endGame();
  }
}

function drawNextPiece() {
  nextCtx.fillStyle = '#0a0a1a';
  nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

  if (!nextPieceType) return;

  const shape = SHAPES[nextPieceType][0];
  const color = COLORS[nextPieceType];
  const size = 24;
  const offsetX = 30;
  const offsetY = 20;

  nextCtx.shadowBlur = 15;
  nextCtx.shadowColor = color;

  shape.forEach(([dx, dy]) => {
    nextCtx.fillStyle = color;
    nextCtx.fillRect(
      offsetX + dx * size,
      offsetY + dy * size,
      size - 2,
      size - 2
    );
    nextCtx.strokeStyle = '#ffffff';
    nextCtx.lineWidth = 2;
    nextCtx.strokeRect(
      offsetX + dx * size,
      offsetY + dy * size,
      size - 2,
      size - 2
    );
  });

  nextCtx.shadowBlur = 0;
}

// === COLLISION ===
function collision(piece) {
  const shape = SHAPES[piece.type][piece.rotation];
  for (let i = 0; i < shape.length; i++) {
    const [dx, dy] = shape[i];
    const newX = piece.x + dx;
    const newY = piece.y + dy;

    if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
    if (newY >= 0 && board[newY][newX] !== 0) return true;
  }
  return false;
}

// === MOUVEMENTS ===
function move(dir) {
  if (!currentPiece || gameOver || paused) return;

  const oldX = currentPiece.x;
  currentPiece.x += dir;

  if (collision(currentPiece)) {
    currentPiece.x = oldX;
  } else {
    playSound('move');
    draw();
  }
}

function moveLeft() { move(-1); }

function moveRight() { move(1); }

function softDrop() {
  if (!currentPiece || gameOver || paused) return;
  const oldY = currentPiece.y;
  currentPiece.y++;

  if (collision(currentPiece)) {
    currentPiece.y = oldY;
    lockPiece();
  } else {
    score += 1; // petit bonus soft drop
    updateUI();
    draw();
  }
}

function hardDrop() {
  if (!currentPiece || gameOver || paused) return;

  let dropDistance = 0;
  while (!collision(currentPiece)) {
    currentPiece.y++;
    dropDistance++;
  }
  currentPiece.y--; // revenir à la dernière position valide

  score += dropDistance * 2;
  updateUI();
  lockPiece();
  playSound('hard');
}

function rotatePiece() {
  if (!currentPiece || gameOver || paused) return;

  const oldRotation = currentPiece.rotation;
  currentPiece.rotation = (currentPiece.rotation + 1) % 4;

  // Wall kick simple
  if (collision(currentPiece)) {
    // Essayer de décaler à gauche/droite
    currentPiece.x--;
    if (collision(currentPiece)) {
      currentPiece.x += 2;
      if (collision(currentPiece)) {
        currentPiece.x--;
        currentPiece.rotation = oldRotation;
      }
    }
  }

  if (currentPiece.rotation !== oldRotation) {
    playSound('rotate');
    draw();
  }
}

// === VERROUILLAGE DE LA PIÈCE ===
function lockPiece() {
  if (!currentPiece) return;

  const shape = SHAPES[currentPiece.type][currentPiece.rotation];
  shape.forEach(([dx, dy]) => {
    const x = currentPiece.x + dx;
    const y = currentPiece.y + dy;
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
      board[y][x] = currentPiece.color;
    }
  });

  playSound('lock');
  clearLines();
  createNewPiece();
  draw();
}

// === SUPPRESSION DES LIGNES + PARTICULES ===
function clearLines() {
  let cleared = 0;

  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      // Créer des particules pour l'effet futuriste
      createLineParticles(y);

      // Supprimer la ligne
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      cleared++;
      y++; // rester sur la même ligne après splice
    }
  }

  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800][cleared] || 1000;
    score += points * level;
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 800 - (level - 1) * 60);

    updateUI();
    playSound('clear');

    // Flash visuel sur le canvas
    flashBoard();
  }
}

function createLineParticles(rowY) {
  for (let i = 0; i < 25; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: rowY * BLOCK_SIZE + BLOCK_SIZE / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 4 - 1,
      alpha: 1,
      color: '#00f9ff',
      size: Math.random() * 6 + 3
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15; // gravité légère
    p.alpha -= 0.03;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  ctx.shadowBlur = 8;
  particles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function flashBoard() {
  // Effet flash néon rapide
  const originalFill = ctx.fillStyle;
  ctx.fillStyle = 'rgba(0, 249, 255, 0.35)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  setTimeout(() => {
    if (!gameOver && !paused) draw();
  }, 80);
}

// === DESSIN ===
function drawGrid() {
  ctx.strokeStyle = 'rgba(0, 249, 255, 0.12)';
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK_SIZE, 0);
    ctx.lineTo(x * BLOCK_SIZE, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK_SIZE);
    ctx.lineTo(canvas.width, y * BLOCK_SIZE);
    ctx.stroke();
  }
}

function drawBoard() {
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  // Dessiner les blocs verrouillés
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] !== 0) {
        drawBlock(x, y, board[y][x]);
      }
    }
  }
}

function drawBlock(x, y, color) {
  const px = x * BLOCK_SIZE;
  const py = y * BLOCK_SIZE;

  // Glow néon principal
  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

  // Bordure blanche brillante
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);

  // Effet intérieur léger
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(px + 4, py + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8);
}

function drawCurrentPiece() {
  if (!currentPiece) return;

  const shape = SHAPES[currentPiece.type][currentPiece.rotation];

  ctx.shadowBlur = 22;
  ctx.shadowColor = currentPiece.color;

  shape.forEach(([dx, dy]) => {
    const x = currentPiece.x + dx;
    const y = currentPiece.y + dy;
    if (y >= 0) {
      drawBlock(x, y, currentPiece.color);
    }
  });

  ctx.shadowBlur = 0;
}

function draw() {
  drawBoard();
  drawCurrentPiece();
  drawParticles();
}

// === BOUCLE DE JEU ===
function gameLoop(timestamp = 0) {
  if (gameOver || paused) return;

  if (!lastDropTime) lastDropTime = timestamp;

  const delta = timestamp - lastDropTime;

  if (delta > dropInterval) {
    // Descente automatique
    const oldY = currentPiece.y;
    currentPiece.y++;

    if (collision(currentPiece)) {
      currentPiece.y = oldY;
      lockPiece();
    }
    lastDropTime = timestamp;
  }

  updateParticles();
  draw();

  animationFrame = requestAnimationFrame(gameLoop);
}

// === SONS SYNTHÉTIQUES FUTURISTES ===
let audioCtx;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  osc.type = 'sawtooth';
  filter.type = 'lowpass';
  filter.frequency.value = 1200;

  let freq = 220;
  let duration = 0.12;
  let volume = 0.25;

  switch (type) {
    case 'move':
      freq = 180;
      duration = 0.06;
      volume = 0.18;
      break;
    case 'rotate':
      freq = 420;
      duration = 0.1;
      volume = 0.22;
      break;
    case 'lock':
      freq = 140;
      duration = 0.18;
      volume = 0.3;
      break;
    case 'clear':
      freq = 680;
      duration = 0.35;
      volume = 0.35;
      osc.type = 'square';
      break;
    case 'hard':
      freq = 90;
      duration = 0.25;
      volume = 0.4;
      break;
  }

  osc.frequency.value = freq;
  gain.gain.value = volume;

  const now = audioCtx.currentTime;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.linearRampToValueAtTime(0.001, now + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.05);
}

// === GESTION CLAVIER ===
function handleKeyboard(e) {
  if (gameOver || paused) {
    if (e.key.toLowerCase() === 'r') restartGame();
    if (e.key.toLowerCase() === 'p' && !gameOver) togglePause();
    return;
  }

  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      moveLeft();
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      moveRight();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      softDrop();
      break;
    case 'ArrowUp':
    case 'x':
    case 'X':
    case 'w':
    case 'W':
      rotatePiece();
      break;
    case ' ':
      e.preventDefault();
      hardDrop();
      break;
    case 'p':
    case 'P':
      togglePause();
      break;
    case 'r':
    case 'R':
      restartGame();
      break;
  }
}

// === FONCTIONS DE CONTROLE ===
function startGame() {
  initAudio();
  startOverlay.classList.remove('active');
  resetGame();
  lastDropTime = performance.now();
  animationFrame = requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (gameOver) return;

  paused = !paused;

  if (paused) {
    cancelAnimationFrame(animationFrame);
    pauseOverlay.classList.add('active');
  } else {
    pauseOverlay.classList.remove('active');
    lastDropTime = performance.now();
    animationFrame = requestAnimationFrame(gameLoop);
  }
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animationFrame);

  document.getElementById('final-score').textContent = 
    `Score final : ${score.toString().padStart(6, '0')}`;

  setTimeout(() => {
    gameOverOverlay.classList.add('active');
  }, 300);
}

function restartGame() {
  gameOverOverlay.classList.remove('active');
  pauseOverlay.classList.remove('active');
  startOverlay.classList.remove('active');

  resetGame();
  lastDropTime = performance.now();
  animationFrame = requestAnimationFrame(gameLoop);
}

// === INITIALISATION GÉNÉRALE ===
function init() {
  initBoard();
  // Afficher l'overlay de départ (déjà active dans le HTML)

  // Clavier
  document.addEventListener('keydown', handleKeyboard);

  // Empêcher le zoom sur mobile
  document.addEventListener('gesturestart', e => e.preventDefault());

  // Premier dessin (grille vide)
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // Message d'accueil dans la console
  console.log('%c[Tetris Neon] Jeu initialisé. Prêt pour 2084 !', 'color:#00f9ff');
}

// Lancement
init();