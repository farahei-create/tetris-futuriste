/* === TETRIS NÉON FUTURISTE - Holographic piece rendering === */

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
  const availableWidth = Math.min(window.innerWidth * 0.96, 400);
  const availableHeight = Math.min(window.innerHeight * 0.68, 620);
  const sizeByWidth = Math.floor(availableWidth / COLS);
  const sizeByHeight = Math.floor(availableHeight / ROWS);
  BLOCK_SIZE = Math.min(sizeByWidth, sizeByHeight);
  if (BLOCK_SIZE > 34) BLOCK_SIZE = 34;
  if (BLOCK_SIZE < 24) BLOCK_SIZE = 24;
  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;
  const nextSize = Math.min(100, BLOCK_SIZE * 3.8 + 6);
  nextCanvas.width = nextSize;
  nextCanvas.height = nextSize;
  initBackgroundBubbles();
  if (!gameOver && !paused && currentPiece) { draw(); drawNextPiece(); }
}

function initBoard() { board = Array.from({ length: ROWS }, () => Array(COLS).fill(0)); }

function resetGame() {
  initBoard(); score = 0; lines = 0; level = 1; dropInterval = 800;
  gameOver = false; paused = false; particles = []; glitchIntensity = 0;
  currentPiece = null; updateUI(); createNewPiece(); resizeGame(); draw();
}

function updateUI() {
  scoreEl.textContent = score.toString().padStart(6, '0');
  levelEl.textContent = level.toString().padStart(2, '0');
  linesEl.textContent = lines.toString().padStart(3, '0');
}

function createNewPiece() {
  if (!nextPieceType) { const types = Object.keys(SHAPES); nextPieceType = types[Math.floor(Math.random() * types.length)]; }
  const type = nextPieceType;
  currentPiece = { type, rotation: 0, x: Math.floor(COLS / 2) - 1, y: 0, color: COLORS[type] };
  const types = Object.keys(SHAPES); nextPieceType = types[Math.floor(Math.random() * types.length)];
  drawNextPiece();
  if (collision(currentPiece)) endGame();
}

function drawNextPiece() {
  const size = nextCanvas.width; nextCtx.fillStyle = '#0a0a1a'; nextCtx.fillRect(0, 0, size, size);
  if (!nextPieceType) return;
  const shape = SHAPES[nextPieceType][0]; const color = COLORS[nextPieceType];
  const block = Math.floor(size / 4.2); const offsetX = Math.floor((size - block * 4) / 2); const offsetY = Math.floor((size - block * 3) / 2);
  nextCtx.shadowBlur = 12; nextCtx.shadowColor = color;
  shape.forEach(([dx, dy]) => {
    const px = offsetX + dx * block; const py = offsetY + dy * block;
    nextCtx.fillStyle = 'rgba(10,10,26,0.6)'; nextCtx.fillRect(px + 1, py + 1, block - 2, block - 2);
    nextCtx.strokeStyle = color; nextCtx.lineWidth = 2.5; nextCtx.strokeRect(px + 1, py + 1, block - 2, block - 2);
    nextCtx.strokeStyle = '#ffffff'; nextCtx.lineWidth = 1; nextCtx.strokeRect(px + 3, py + 3, block - 6, block - 6);
  });
  nextCtx.shadowBlur = 0;
}

function collision(piece) {
  const shape = SHAPES[piece.type][piece.rotation];
  for (let i = 0; i < shape.length; i++) {
    const [dx, dy] = shape[i]; const newX = piece.x + dx; const newY = piece.y + dy;
    if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
    if (newY >= 0 && board[newY][newX] !== 0) return true;
  } return false;
}

function move(dir) {
  if (!currentPiece || gameOver || paused) return;
  const oldX = currentPiece.x; currentPiece.x += dir;
  if (collision(currentPiece)) currentPiece.x = oldX; else { playSound('move'); draw(); }
}

function moveLeft() { move(-1); }
function moveRight() { move(1); }

function softDrop() {
  if (!currentPiece || gameOver || paused) return;
  const oldY = currentPiece.y; currentPiece.y++;
  if (collision(currentPiece)) { currentPiece.y = oldY; lockPiece(); } else { score += 1; updateUI(); draw(); }
}

function hardDrop() {
  if (!currentPiece || gameOver || paused) return;
  let dropDistance = 0; while (!collision(currentPiece)) { currentPiece.y++; dropDistance++; }
  currentPiece.y--; score += dropDistance * 2; updateUI(); lockPiece(); playSound('hard');
}

function rotatePiece() {
  if (!currentPiece || gameOver || paused) return;
  const oldRotation = currentPiece.rotation; currentPiece.rotation = (currentPiece.rotation + 1) % 4;
  if (collision(currentPiece)) { currentPiece.x--; if (collision(currentPiece)) { currentPiece.x += 2; if (collision(currentPiece)) { currentPiece.x--; currentPiece.rotation = oldRotation; } } }
  if (currentPiece.rotation !== oldRotation) { playSound('rotate'); draw(); }
}

function lockPiece() {
  if (!currentPiece) return;
  const shape = SHAPES[currentPiece.type][currentPiece.rotation];
  shape.forEach(([dx, dy]) => { const x = currentPiece.x + dx; const y = currentPiece.y + dy; if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y][x] = currentPiece.color; });
  playSound('lock'); clearLines(); createNewPiece(); draw();
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell !== 0)) {
      createLineParticles(y, true); board.splice(y, 1); board.unshift(Array(COLS).fill(0)); cleared++; y++;
    }
  }
  if (cleared > 0) {
    const points = [0, 100, 300, 500, 800][cleared] || 1000;
    score += points * level; lines += cleared; level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 800 - (level - 1) * 60);
    updateUI(); playSound('clear'); flashBoard(); triggerGlitch(0.7);
  }
}

function createLineParticles(rowY, intense = false) {
  const count = intense ? 34 : 18;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: rowY * BLOCK_SIZE + BLOCK_SIZE / 2,
      vx: (Math.random() - 0.5) * (intense ? 7 : 4.8), vy: (Math.random() - 0.5) * (intense ? 4 : 2.8) - 1,
      alpha: 1, color: intense ? '#c084fc' : '#00f9ff', size: Math.random() * 5 + 2.5
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.alpha -= 0.024;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  ctx.shadowBlur = 4; particles.forEach(p => { ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function flashBoard() {
  ctx.fillStyle = 'rgba(192, 132, 252, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  setTimeout(() => { if (!gameOver && !paused) draw(); }, 50);
}

function triggerGlitch(intensity) {
  glitchIntensity = intensity;
  setTimeout(() => { glitchIntensity = 0; }, 140);
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(157, 78, 221, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * BLOCK_SIZE, 0); ctx.lineTo(x * BLOCK_SIZE, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * BLOCK_SIZE); ctx.lineTo(canvas.width, y * BLOCK_SIZE); ctx.stroke(); }
}

function drawBoard() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#12071f'); grad.addColorStop(0.5, '#1a0a2e'); grad.addColorStop(1, '#0f0618');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawBackgroundBubbles();
  drawGrid();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] !== 0) drawBlock(x, y, board[y][x]);
    }
  }
  if (glitchIntensity > 0) {
    ctx.fillStyle = `rgba(255,255,255,${glitchIntensity * 0.2})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (Math.random() > 0.5) {
      ctx.fillStyle = 'rgba(157, 78, 221, 0.32)';
      ctx.fillRect(Math.random() * canvas.width * 0.9, 0, 5, canvas.height);
    }
  }
}

// === HOLOGRAPHIC NEON PIECE RENDERING ===
function drawBlock(x, y, color) {
  const px = x * BLOCK_SIZE;
  const py = y * BLOCK_SIZE;
  const size = BLOCK_SIZE;

  ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

  ctx.shadowBlur = 18;
  ctx.shadowColor = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.strokeRect(px + 2, py + 2, size - 4, size - 4);

  ctx.shadowBlur = 6;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px + 4.5, py + 4.5, size - 9, size - 9);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(px + 5, py + 5, size - 10, size - 10);
}

function drawCurrentPiece() {
  if (!currentPiece) return;
  const shape = SHAPES[currentPiece.type][currentPiece.rotation];
  ctx.shadowBlur = 20;
  ctx.shadowColor = currentPiece.color;
  shape.forEach(([dx, dy]) => {
    const x = currentPiece.x + dx;
    const y = currentPiece.y + dy;
    if (y >= 0) drawBlock(x, y, currentPiece.color);
  });
  ctx.shadowBlur = 0;
}

function draw() { drawBoard(); drawCurrentPiece(); drawParticles(); }

function gameLoop(timestamp = 0) {
  if (gameOver || paused) return;
  if (!lastDropTime) lastDropTime = timestamp;
  const delta = timestamp - lastDropTime;
  if (delta > dropInterval) {
    const oldY = currentPiece.y; currentPiece.y++;
    if (collision(currentPiece)) { currentPiece.y = oldY; lockPiece(); }
    lastDropTime = timestamp;
  }
  updateBackgroundBubbles(); updateParticles(); draw();
  animationFrame = requestAnimationFrame(gameLoop);
}

// Sons
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function playSound(type) {
  if (!audioCtx) initAudio(); if (!audioCtx) return;
  const now = audioCtx.currentTime;

  if (type === 'clear') {
    const noise = audioCtx.createBufferSource();
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.52, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 760; noiseFilter.Q.value = 1.5;
    const noiseGain = audioCtx.createGain(); noiseGain.gain.value = 0.5;
    const noiseEnv = audioCtx.createGain();
    const osc = audioCtx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 155;
    const oscFilter = audioCtx.createBiquadFilter(); oscFilter.type = 'lowpass'; oscFilter.frequency.value = 1050;
    const oscGain = audioCtx.createGain(); oscGain.gain.value = 0.38;
    const masterGain = audioCtx.createGain();
    noiseEnv.gain.setValueAtTime(0.6, now); noiseEnv.gain.linearRampToValueAtTime(0.001, now + 0.48);
    oscGain.gain.setValueAtTime(0.38, now); oscGain.gain.linearRampToValueAtTime(0.001, now + 0.36);
    masterGain.gain.value = 0.78;
    noise.connect(noiseFilter); noiseFilter.connect(noiseEnv); noiseEnv.connect(masterGain);
    osc.connect(oscFilter); oscFilter.connect(oscGain); oscGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);
    noise.start(now); osc.start(now); noise.stop(now + 0.52); osc.stop(now + 0.4); return;
  }

  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass'; let freq = 220, duration = 0.11, volume = 0.24; osc.type = 'sawtooth';
  switch (type) {
    case 'move': osc.type = 'square'; freq = 150 + Math.random()*30; duration = 0.035; volume = 0.15; filter.frequency.value = 820; break;
    case 'rotate': osc.type = 'sawtooth'; freq = 470; duration = 0.09; volume = 0.22; filter.frequency.value = 1450; osc.frequency.setValueAtTime(470, now); osc.frequency.linearRampToValueAtTime(690, now + 0.07); break;
    case 'lock': osc.type = 'sawtooth'; freq = 82; duration = 0.18; volume = 0.32; filter.frequency.value = 600; break;
    case 'hard': osc.type = 'sawtooth'; freq = 60; duration = 0.24; volume = 0.46; filter.frequency.value = 400;
      const osc2 = audioCtx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 48; const g2 = audioCtx.createGain(); g2.gain.value = 0.28;
      osc2.connect(g2); g2.connect(audioCtx.destination); osc2.start(now); osc2.stop(now + 0.3); break;
  }
  osc.frequency.value = freq; gain.gain.value = volume;
  const master = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, now); gain.gain.linearRampToValueAtTime(0.001, now + duration);
  osc.connect(filter); filter.connect(gain); gain.connect(master); master.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + duration + 0.03);
}

// Touch & clavier
function handleTouchStart(e) {
  if (gameOver || paused || !currentPiece) return;
  const rect = canvas.getBoundingClientRect();
  touchStartX = e.touches[0].clientX - rect.left; touchStartY = e.touches[0].clientY - rect.top; touchStartTime = Date.now();
}

function handleTouchEnd(e) {
  if (gameOver || paused || !currentPiece) return;
  const rect = canvas.getBoundingClientRect();
  const endX = e.changedTouches[0].clientX - rect.left; const endY = e.changedTouches[0].clientY - rect.top;
  const deltaX = endX - touchStartX; const deltaY = endY - touchStartY;
  const duration = Date.now() - touchStartTime; const absX = Math.abs(deltaX); const absY = Math.abs(deltaY);
  if (duration < 200 && absX < 20 && absY < 20) { rotatePiece(); return; }
  if (absX > absY && absX > 30) { if (deltaX > 0) moveRight(); else moveLeft(); return; }
  if (deltaY > 35) { if (duration < 160 && deltaY > 80) hardDrop(); else softDrop(); }
}

function handleKeyboard(e) {
  if (gameOver || paused) { if (e.key.toLowerCase() === 'r') restartGame(); if (e.key.toLowerCase() === 'p' && !gameOver) togglePause(); return; }
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

function startGame() { initAudio(); startOverlay.classList.remove('active'); resetGame(); lastDropTime = performance.now(); animationFrame = requestAnimationFrame(gameLoop); }

function togglePause() {
  if (gameOver) return; paused = !paused;
  if (paused) { cancelAnimationFrame(animationFrame); pauseOverlay.classList.add('active'); }
  else { pauseOverlay.classList.remove('active'); lastDropTime = performance.now(); animationFrame = requestAnimationFrame(gameLoop); }
}

function endGame() {
  gameOver = true; cancelAnimationFrame(animationFrame);
  document.getElementById('final-score').textContent = `Score final : ${score.toString().padStart(6, '0')}`;
  setTimeout(() => { gameOverOverlay.classList.add('active'); }, 240);
}

function restartGame() {
  gameOverOverlay.classList.remove('active'); pauseOverlay.classList.remove('active'); startOverlay.classList.remove('active');
  resetGame(); lastDropTime = performance.now(); animationFrame = requestAnimationFrame(gameLoop);
}

function init() {
  initBoard(); resizeGame();
  window.addEventListener('resize', () => { clearTimeout(window.resizeTimeout); window.resizeTimeout = setTimeout(resizeGame, 120); });
  document.addEventListener('keydown', handleKeyboard);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('gesturestart', e => e.preventDefault());
  ctx.fillStyle = '#12071f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  console.log('%c[Tetris Neon] Holographic pieces enabled!', 'color:#c084fc');
}

init();
