/* === TETRIS NÉON FUTURISTE v3.3 - Centered Pause Menu + Title Click to Pause === */

let BLOCK_SIZE = 28;
const COLS = 10;
const ROWS = 20;

const COLORS = {
  'I': '#00f9ff', 'O': '#ffea00', 'T': '#c084fc', 'S': '#00ff9d',
  'Z': '#ff2e63', 'J': '#3a86ff', 'L': '#ff9f1c'
};

const SHAPES = {
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
let heldPiece = null;
let canHold = true;
let score = 0;
let lines = 0;
let level = 1;
let bestScore = 0;
let gameOver = false;
let paused = false;
let lastDropTime = 0;
let dropInterval = 800;
let particles = [];
let backgroundBubbles = [];
let animationFrame = null;
let glitchIntensity = 0;
let isFullscreenMode = false;

// Settings
let soundEnabled = true;
let alwaysShowControls = false;
let view3DEnabled = true;

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

let hideControlsTimer = null;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d', { alpha: true });

const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d', { alpha: true });

const holdCanvas = document.getElementById('hold-piece');
const holdCtx = holdCanvas ? holdCanvas.getContext('2d', { alpha: true }) : null;

const startOverlay = document.getElementById('start-overlay');
const pauseOverlay = document.getElementById('pause-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const settingsOverlay = document.getElementById('settings-overlay');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const bestScoreEl = document.getElementById('best-score');
const controlsOverlay = document.getElementById('controls-overlay');

function loadBestScore() {
  const saved = localStorage.getItem('tetrisNeonBestScore');
  if (saved) {
    bestScore = parseInt(saved, 10);
    if (bestScoreEl) bestScoreEl.textContent = `Record : ${bestScore.toString().padStart(6, '0')}`;
  }
}

function saveBestScore() {
  if (score > bestScore) {
    bestScore = score;
    localStorage.setItem('tetrisNeonBestScore', bestScore);
    if (bestScoreEl) bestScoreEl.textContent = `Record : ${bestScore.toString().padStart(6, '0')}`;
  }
}

function loadSettings() {
  const savedSound = localStorage.getItem('tetrisSoundEnabled');
  if (savedSound !== null) soundEnabled = savedSound === 'true';

  const savedControls = localStorage.getItem('tetrisAlwaysShowControls');
  if (savedControls !== null) alwaysShowControls = savedControls === 'true';

  const saved3D = localStorage.getItem('tetrisView3DEnabled');
  if (saved3D !== null) view3DEnabled = saved3D === 'true';

  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) soundToggle.checked = soundEnabled;

  const controlsToggle = document.getElementById('controls-always-show');
  if (controlsToggle) controlsToggle.checked = alwaysShowControls;

  const view3DToggle = document.getElementById('view-3d-toggle');
  if (view3DToggle) view3DToggle.checked = view3DEnabled;

  applySettings();
}

function saveSettings() {
  localStorage.setItem('tetrisSoundEnabled', soundEnabled);
  localStorage.setItem('tetrisAlwaysShowControls', alwaysShowControls);
  localStorage.setItem('tetrisView3DEnabled', view3DEnabled);
}

function applySettings() {
  const wrapper = document.querySelector('.game-wrapper');

  if (view3DEnabled && isFullscreenMode) {
    wrapper.classList.add('playing-3d');
  } else {
    wrapper.classList.remove('playing-3d');
  }

  if (alwaysShowControls && !paused && !gameOver) {
    showControls();
    clearTimeout(hideControlsTimer);
  }
}

function showSettings() {
  pauseOverlay.classList.remove('active');
  settingsOverlay.classList.add('active');
}

function hideSettings() {
  settingsOverlay.classList.remove('active');
  pauseOverlay.classList.add('active');
}

function updateSetting(setting, value) {
  if (setting === 'sound') {
    soundEnabled = value;
  } else if (setting === 'controls') {
    alwaysShowControls = value;
  } else if (setting === 'view3d') {
    view3DEnabled = value;
    const wrapper = document.querySelector('.game-wrapper');
    if (value && isFullscreenMode) {
      wrapper.classList.add('playing-3d');
    } else {
      wrapper.classList.remove('playing-3d');
    }
  }
  saveSettings();
  applySettings();
}

function pauseFromHeader() {
  if (!startOverlay.classList.contains('active') && !gameOver && !paused) {
    togglePause();
  }
}

function showControls() {
  if (!controlsOverlay) return;
  clearTimeout(hideControlsTimer);
  controlsOverlay.style.transition = 'opacity 0.25s ease';
  controlsOverlay.style.opacity = '0.92';
  controlsOverlay.style.pointerEvents = 'auto';
}

function hideControls() {
  if (!controlsOverlay || alwaysShowControls) return;
  controlsOverlay.style.transition = 'opacity 0.7s ease';
  controlsOverlay.style.opacity = '0.12';
  controlsOverlay.style.pointerEvents = 'none';
}

function scheduleHideControls() {
  if (alwaysShowControls) return;
  clearTimeout(hideControlsTimer);
  hideControlsTimer = setTimeout(hideControls, 2400);
}

function initBackgroundBubbles() {
  backgroundBubbles = [];
  for (let i = 0; i < 30; i++) {
    backgroundBubbles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      size: Math.random() * 6.5 + 3.5, speed: Math.random() * 0.32 + 0.11,
      drift: (Math.random() - 0.5) * 0.22, alpha: Math.random() * 0.32 + 0.14,
      hue: 268 + Math.random() * 28
    });
  }
}

function updateBackgroundBubbles() {
  for (let i = 0; i < backgroundBubbles.length; i++) {
    const b = backgroundBubbles[i];
    b.y -= b.speed; b.x += b.drift;
    if (b.y + b.size < 0) { b.y = canvas.height + b.size; b.x = Math.random() * canvas.width; }
    if (b.x < 0) b.x = canvas.width; if (b.x > canvas.width) b.x = 0;
  }
}

function drawBackgroundBubbles() {
  for (let i = 0; i < backgroundBubbles.length; i++) {
    const b = backgroundBubbles[i];
    ctx.save(); ctx.globalAlpha = b.alpha;
    ctx.shadowBlur = 10; ctx.shadowColor = `hsla(${b.hue}, 85%, 75%, 0.55)`;
    ctx.fillStyle = `hsla(${b.hue}, 80%, 72%, ${b.alpha})`;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath(); ctx.arc(b.x - b.size * 0.28, b.y - b.size * 0.28, b.size * 0.32, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

function resizeGame() {
  let availableWidth = Math.min(window.innerWidth * 0.96, 400);
  let availableHeight = Math.min(window.innerHeight * 0.68, 620);

  if (isFullscreenMode) {
    availableWidth = window.innerWidth * 0.98;
    availableHeight = window.innerHeight * 0.94;
  }

  const sizeByWidth = Math.floor(availableWidth / COLS);
  const sizeByHeight = Math.floor(availableHeight / ROWS);
  BLOCK_SIZE = Math.min(sizeByWidth, sizeByHeight);
  if (BLOCK_SIZE > 44) BLOCK_SIZE = 44;
  if (BLOCK_SIZE < 24) BLOCK_SIZE = 24;

  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;

  const nextSize = Math.min(115, BLOCK_SIZE * 3.8 + 6);
  if (nextCanvas) {
    nextCanvas.width = nextSize;
    nextCanvas.height = nextSize;
  }
  if (holdCanvas) {
    holdCanvas.width = nextSize;
    holdCanvas.height = nextSize;
  }

  initBackgroundBubbles();
  if (!gameOver && !paused && currentPiece) {
    draw();
    drawNextPiece();
    drawHoldPiece();
  }
}

function initBoard() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }

function resetGame() {
  initBoard();
  score = 0;
  lines = 0;
  level = 1;
  dropInterval = 800;
  gameOver = false;
  paused = false;
  particles = [];
  glitchIntensity = 0;
  currentPiece = null;
  heldPiece = null;
  canHold = true;
  updateUI();
  createNewPiece();
  drawHoldPiece();
  resizeGame();
  draw();
  showControls();
  scheduleHideControls();
}

function updateUI() {
  scoreEl.textContent = score.toString().padStart(6, '0');
  levelEl.textContent = level.toString().padStart(2, '0');
  linesEl.textContent = lines.toString().padStart(3, '0');
}

function createNewPiece() {
  if (!nextPieceType) {
    const types = Object.keys(SHAPES);
    nextPieceType = types[Math.floor(Math.random() * types.length)];
  }
  const type = nextPieceType;
  currentPiece = { type, rotation: 0, x: Math.floor(COLS / 2) - 1, y: 0, color: COLORS[type] };
  const types = Object.keys(SHAPES);
  nextPieceType = types[Math.floor(Math.random() * types.length)];
  canHold = true;
  drawNextPiece();
  if (collision(currentPiece)) endGame();
}

function drawNextPiece() {
  if (!nextCtx || !nextPieceType) return;
  const size = nextCanvas.width;
  nextCtx.fillStyle = '#05050f';
  nextCtx.fillRect(0, 0, size, size);

  const shape = SHAPES[nextPieceType][0];
  const color = COLORS[nextPieceType];
  const block = Math.floor(size / 4.2);
  const offsetX = Math.floor((size - block * 4) / 2);
  const offsetY = Math.floor((size - block * 3) / 2);

  nextCtx.shadowBlur = 14;
  nextCtx.shadowColor = color;
  shape.forEach(([dx, dy]) => {
    const px = offsetX + dx * block;
    const py = offsetY + dy * block;
    nextCtx.fillStyle = 'rgba(5,5,15,0.7)';
    nextCtx.fillRect(px + 1, py + 1, block - 2, block - 2);
    nextCtx.strokeStyle = color;
    nextCtx.lineWidth = 2.8;
    nextCtx.strokeRect(px + 1, py + 1, block - 2, block - 2);
    nextCtx.strokeStyle = '#ffffff';
    nextCtx.lineWidth = 1.2;
    nextCtx.strokeRect(px + 3, py + 3, block - 7, block - 7);
  });
  nextCtx.shadowBlur = 0;
}

function drawHoldPiece() {
  if (!holdCtx || !holdCanvas) return;
  const size = holdCanvas.width;
  holdCtx.fillStyle = '#05050f';
  holdCtx.fillRect(0, 0, size, size);

  if (!heldPiece) return;

  const shape = SHAPES[heldPiece.type][heldPiece.rotation];
  const color = COLORS[heldPiece.type];
  const block = Math.floor(size / 4.2);
  const offsetX = Math.floor((size - block * 4) / 2);
  const offsetY = Math.floor((size - block * 3) / 2);

  holdCtx.shadowBlur = 12;
  holdCtx.shadowColor = color;
  shape.forEach(([dx, dy]) => {
    const px = offsetX + dx * block;
    const py = offsetY + dy * block;
    holdCtx.fillStyle = 'rgba(5,5,15,0.7)';
    holdCtx.fillRect(px + 1, py + 1, block - 2, block - 2);
    holdCtx.strokeStyle = color;
    holdCtx.lineWidth = 2.5;
    holdCtx.strokeRect(px + 1, py + 1, block - 2, block - 2);
    holdCtx.strokeStyle = '#ffffff';
    holdCtx.lineWidth = 1.2;
    holdCtx.strokeRect(px + 3, py + 3, block - 7, block - 7);
  });
  holdCtx.shadowBlur = 0;
}

function getGhostY() {
  if (!currentPiece) return 0;
  let y = currentPiece.y;
  while (!collision({ type: currentPiece.type, rotation: currentPiece.rotation, x: currentPiece.x, y: y + 1 })) {
    y++;
  }
  return y;
}

function drawGhostPiece() {
  if (!currentPiece || gameOver || paused) return;
  const ghostY = getGhostY();
  if (ghostY <= currentPiece.y) return;

  const shape = SHAPES[currentPiece.type][currentPiece.rotation];
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.shadowBlur = 8;
  ctx.shadowColor = currentPiece.color;
  ctx.strokeStyle = currentPiece.color;
  ctx.lineWidth = 2.2;

  shape.forEach(([dx, dy]) => {
    const x = currentPiece.x + dx;
    const y = ghostY + dy;
    if (y >= 0 && y < ROWS) {
      const px = x * BLOCK_SIZE;
      const py = y * BLOCK_SIZE;
      ctx.strokeRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
    }
  });
  ctx.restore();
}

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

function move(dir) {
  if (!currentPiece || gameOver || paused) return;
  const oldX = currentPiece.x;
  currentPiece.x += dir;
  if (collision(currentPiece)) currentPiece.x = oldX;
  else { playSound('move'); draw(); }
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
    score += 1;
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
  currentPiece.y--;
  score += dropDistance * 2;
  updateUI();
  lockPiece();
  playSound('hard');
}

function rotatePiece() {
  if (!currentPiece || gameOver || paused) return;
  const oldRotation = currentPiece.rotation;
  currentPiece.rotation = (currentPiece.rotation + 1) % 4;
  if (collision(currentPiece)) {
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

function holdPiece() {
  if (!currentPiece || gameOver || paused || !canHold) return;

  if (heldPiece === null) {
    heldPiece = { type: currentPiece.type, rotation: 0 };
    createNewPiece();
  } else {
    const tempType = currentPiece.type;
    currentPiece.type = heldPiece.type;
    currentPiece.rotation = 0;
    heldPiece.type = tempType;
  }
  canHold = false;
  drawHoldPiece();
  draw();
  playSound('rotate');
}

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
  canHold = true;
  drawHoldPiece();
  draw();
}

function clearLines() {
  let cleared = 0;
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
    const points = [0, 100, 300, 500, 800][cleared] || 1000;
    score += points * level;
    lines += cleared;
    const newLevel = Math.floor(lines / 10) + 1;
    if (newLevel > level) {
      level = newLevel;
      dropInterval = Math.max(100, 800 - (level - 1) * 55);
      flashBoard();
      triggerGlitch(0.65);
      playSound('clear');
    } else {
      dropInterval = Math.max(100, 800 - (level - 1) * 55);
      playSound('clear');
    }
    updateUI();
  }
}

function createLineParticles(rowY, intense = false) {
  const count = intense ? 42 : 22;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: rowY * BLOCK_SIZE + BLOCK_SIZE / 2,
      vx: (Math.random() - 0.5) * (intense ? 8 : 5.2),
      vy: (Math.random() - 0.5) * (intense ? 4.5 : 3.2) - 1.3,
      alpha: 1,
      color: intense ? '#c084fc' : '#00f9ff',
      size: Math.random() * 6 + 3
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.13;
    p.alpha -= 0.028;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  ctx.shadowBlur = 6;
  particles.forEach(p => {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function flashBoard() {
  ctx.fillStyle = 'rgba(192, 132, 252, 0.4)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  setTimeout(() => { if (!gameOver && !paused) draw(); }, 60);
}

function triggerGlitch(intensity) {
  glitchIntensity = intensity;
  setTimeout(() => { glitchIntensity = 0; }, 180);
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(157, 78, 221, 0.11)';
  ctx.lineWidth = 1.2;
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
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#0a0618');
  grad.addColorStop(0.45, '#12071f');
  grad.addColorStop(1, '#05050f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawBackgroundBubbles();
  drawGrid();

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] !== 0) drawBlock(x, y, board[y][x]);
    }
  }

  if (glitchIntensity > 0) {
    ctx.fillStyle = `rgba(255,255,255,${glitchIntensity * 0.25})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (Math.random() > 0.45) {
      ctx.fillStyle = 'rgba(157, 78, 221, 0.4)';
      ctx.fillRect(Math.random() * canvas.width * 0.92, 0, 6, canvas.height);
    }
  }
}

// HOLOGRAPHIC

function drawBlock(x, y, color) {
  const px = x * BLOCK_SIZE;
  const py = y * BLOCK_SIZE;
  const size = BLOCK_SIZE;

  ctx.fillStyle = 'rgba(5, 5, 15, 0.88)';
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

  ctx.shadowBlur = 22;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.strokeRect(px + 2, py + 2, size - 4, size - 4);

  ctx.shadowBlur = 8;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(px + 5, py + 5, size - 10, size - 10);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(px + 6, py + 6, size - 12, size - 12);
}

function drawCurrentPiece() {
  if (!currentPiece) return;
  const shape = SHAPES[currentPiece.type][currentPiece.rotation];
  ctx.shadowBlur = 26;
  ctx.shadowColor = currentPiece.color;
  shape.forEach(([dx, dy]) => {
    const x = currentPiece.x + dx;
    const y = currentPiece.y + dy;
    if (y >= 0) drawBlock(x, y, currentPiece.color);
  });
  ctx.shadowBlur = 0;
}

function draw() {
  drawBoard();
  drawGhostPiece();
  drawCurrentPiece();
  drawParticles();
}

function gameLoop(timestamp = 0) {
  if (gameOver || paused) return;
  if (!lastDropTime) lastDropTime = timestamp;
  const delta = timestamp - lastDropTime;
  if (delta > dropInterval) {
    const oldY = currentPiece.y;
    currentPiece.y++;
    if (collision(currentPiece)) {
      currentPiece.y = oldY;
      lockPiece();
    }
    lastDropTime = timestamp;
  }
  updateBackgroundBubbles();
  updateParticles();
  draw();
  animationFrame = requestAnimationFrame(gameLoop);
}

// SOUNDS
let audioCtx;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
  if (!soundEnabled || !audioCtx) {
    if (!audioCtx) initAudio();
    if (!audioCtx || !soundEnabled) return;
  }
  const now = audioCtx.currentTime;

  if (type === 'clear') {
    const noise = audioCtx.createBufferSource();
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.55, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = noiseBuffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 780;
    noiseFilter.Q.value = 1.6;

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.55;
    const noiseEnv = audioCtx.createGain();

    const osc = audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 158;
    const oscFilter = audioCtx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.value = 1080;
    const oscGain = audioCtx.createGain();
    oscGain.gain.value = 0.4;

    const masterGain = audioCtx.createGain();
    noiseEnv.gain.setValueAtTime(0.65, now);
    noiseEnv.gain.linearRampToValueAtTime(0.001, now + 0.52);
    oscGain.gain.setValueAtTime(0.4, now);
    oscGain.gain.linearRampToValueAtTime(0.001, now + 0.4);
    masterGain.gain.value = 0.82;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnv);
    noiseEnv.connect(masterGain);
    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    noise.start(now);
    osc.start(now);
    noise.stop(now + 0.55);
    osc.stop(now + 0.42);
    return;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  let freq = 225, duration = 0.115, volume = 0.26;
  osc.type = 'sawtooth';

  switch (type) {
    case 'move':
      osc.type = 'square';
      freq = 152 + Math.random() * 32;
      duration = 0.038;
      volume = 0.16;
      filter.frequency.value = 840;
      break;
    case 'rotate':
      osc.type = 'sawtooth';
      freq = 475;
      duration = 0.095;
      volume = 0.24;
      filter.frequency.value = 1480;
      osc.frequency.setValueAtTime(475, now);
      osc.frequency.linearRampToValueAtTime(695, now + 0.075);
      break;
    case 'lock':
      osc.type = 'sawtooth';
      freq = 84;
      duration = 0.19;
      volume = 0.34;
      filter.frequency.value = 620;
      break;
    case 'hard':
      osc.type = 'sawtooth';
      freq = 62;
      duration = 0.26;
      volume = 0.48;
      filter.frequency.value = 410;
      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = 49;
      const g2 = audioCtx.createGain();
      g2.gain.value = 0.3;
      osc2.connect(g2);
      g2.connect(audioCtx.destination);
      osc2.start(now);
      osc2.stop(now + 0.32);
      break;
  }

  osc.frequency.value = freq;
  gain.gain.value = volume;
  const master = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.linearRampToValueAtTime(0.001, now + duration);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  master.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.035);
}

// Touch & Keyboard
function handleTouchStart(e) {
  if (gameOver || paused || !currentPiece) return;
  const rect = canvas.getBoundingClientRect();
  touchStartX = e.touches[0].clientX - rect.left;
  touchStartY = e.touches[0].clientY - rect.top;
  touchStartTime = Date.now();

  showControls();
  scheduleHideControls();
}

function handleTouchEnd(e) {
  if (gameOver || paused || !currentPiece) return;
  const rect = canvas.getBoundingClientRect();
  const endX = e.changedTouches[0].clientX - rect.left;
  const endY = e.changedTouches[0].clientY - rect.top;
  const deltaX = endX - touchStartX;
  const deltaY = endY - touchStartY;
  const duration = Date.now() - touchStartTime;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (duration < 200 && absX < 20 && absY < 20) {
    rotatePiece();
    showControls();
    scheduleHideControls();
    return;
  }
  if (absX > absY && absX > 32) {
    if (deltaX > 0) moveRight();
    else moveLeft();
    showControls();
    scheduleHideControls();
    return;
  }
  if (deltaY > 36) {
    if (duration < 165 && deltaY > 82) {
      hardDrop();
    } else {
      softDrop();
    }
    showControls();
    scheduleHideControls();
  }
}

function handleKeyboard(e) {
  if (gameOver || paused) {
    if (e.key.toLowerCase() === 'r') restartGame();
    if (e.key.toLowerCase() === 'p' && !gameOver) togglePause();
    return;
  }
  showControls();
  scheduleHideControls();

  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A': moveLeft(); break;
    case 'ArrowRight': case 'd': case 'D': moveRight(); break;
    case 'ArrowDown': case 's': case 'S': softDrop(); break;
    case 'ArrowUp': case 'x': case 'X': case 'w': case 'W': rotatePiece(); break;
    case ' ': e.preventDefault(); hardDrop(); break;
    case 'p': case 'P': togglePause(); break;
    case 'r': case 'R': restartGame(); break;
  }
}

function startGame() {
  initAudio();
  const wrapper = document.querySelector('.game-wrapper');
  startOverlay.classList.remove('active');

  wrapper.classList.add('launching');

  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else if (wrapper.requestFullscreen) {
    wrapper.requestFullscreen().catch(() => {});
  }

  const finalizeLaunch = () => {
    wrapper.classList.remove('launching');
    wrapper.removeEventListener('transitionend', finalizeLaunch);
    isFullscreenMode = true;
    resetGame();
    lastDropTime = performance.now();
    animationFrame = requestAnimationFrame(gameLoop);
    showControls();
    scheduleHideControls();
    setTimeout(resizeGame, 80);

    if (view3DEnabled) {
      wrapper.classList.add('playing-3d');
    }
  };
  wrapper.addEventListener('transitionend', finalizeLaunch, { once: true });
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    cancelAnimationFrame(animationFrame);
    pauseOverlay.classList.add('active');
    settingsOverlay.classList.remove('active');
  } else {
    pauseOverlay.classList.remove('active');
    settingsOverlay.classList.remove('active');
    lastDropTime = performance.now();
    animationFrame = requestAnimationFrame(gameLoop);
    showControls();
    scheduleHideControls();
  }
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animationFrame);
  saveBestScore();
  document.getElementById('final-score').textContent = `Score final : ${score.toString().padStart(6, '0')}`;
  setTimeout(() => {
    gameOverOverlay.classList.add('active');
  }, 280);
}

function restartGame() {
  gameOverOverlay.classList.remove('active');
  pauseOverlay.classList.remove('active');
  settingsOverlay.classList.remove('active');
  startOverlay.classList.remove('active');
  isFullscreenMode = false;
  const wrapper = document.querySelector('.game-wrapper');
  wrapper.classList.remove('playing-3d');
  resetGame();
  lastDropTime = performance.now();
  animationFrame = requestAnimationFrame(gameLoop);
}

function init() {
  initBoard();
  resizeGame();
  loadBestScore();
  loadSettings();

  const soundToggle = document.getElementById('sound-toggle');
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => updateSetting('sound', e.target.checked));
  }

  const controlsToggle = document.getElementById('controls-always-show');
  if (controlsToggle) {
    controlsToggle.addEventListener('change', (e) => updateSetting('controls', e.target.checked));
  }

  const view3DToggle = document.getElementById('view-3d-toggle');
  if (view3DToggle) {
    view3DToggle.addEventListener('change', (e) => updateSetting('view3d', e.target.checked));
  }

  if (controlsOverlay) {
    controlsOverlay.style.opacity = '0.12';
    controlsOverlay.style.pointerEvents = 'none';
  }

  window.addEventListener('resize', () => {
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(resizeGame, 130);
  });

  document.addEventListener('keydown', handleKeyboard);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('gesturestart', e => e.preventDefault());

  document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showControls();
      scheduleHideControls();
    });
  });

  ctx.fillStyle = '#05050f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  setTimeout(() => {
    if (!gameOver && !paused && controlsOverlay) hideControls();
  }, 1900);

  console.log('%c[Tetris Neon v3.3] Centered Pause Menu + Title Click Pause activés !', 'color:#00f9ff');
}

init();
