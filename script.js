/* === TETRIS NÉON FUTURISTE - Version élégante avec bulles flottantes (violet foncé) === */

let BLOCK_SIZE = 28;
const COLS = 10;
const ROWS = 20;

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

// === CRÉATION DES BULLES FLOTTANTES ÉLÉGANTES (violet foncé) ===
function initBackgroundBubbles() {
  backgroundBubbles = [];
  for (let i = 0; i < 32; i++) {
    backgroundBubbles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 7 + 4,
      speed: Math.random() * 0.35 + 0.12,
      drift: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.35 + 0.15,
      hue: 270 + Math.random() * 25   // violet / indigo
    });
  }
}

function updateBackgroundBubbles() {
  for (let i = 0; i < backgroundBubbles.length; i++) {
    const b = backgroundBubbles[i];
    b.y -= b.speed;
    b.x += b.drift;

    // Remonter en haut quand on sort en bas
    if (b.y + b.size < 0) {
      b.y = canvas.height + b.size;
      b.x = Math.random() * canvas.width;
    }
    // Léger drift horizontal
    if (b.x < 0) b.x = canvas.width;
    if (b.x > canvas.width) b.x = 0;
  }
}

function drawBackgroundBubbles() {
  for (let i = 0; i < backgroundBubbles.length; i++) {
    const b = backgroundBubbles[i];
    ctx.save();
    ctx.globalAlpha = b.alpha;

    // Glow doux violet
    ctx.shadowBlur = 12;
    ctx.shadowColor = `hsla(${b.hue}, 85%, 75%, 0.6)`;

    ctx.fillStyle = `hsla(${b.hue}, 80%, 72%, ${b.alpha})`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();

    // Reflet sur la bulle (effet élégant)
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(b.x - b.size * 0.3, b.y - b.size * 0.3, b.size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
  ctx.shadowBlur = 0;
}

// === REDIMENSIONNEMENT ===
function resizeGame() {
  const availableWidth = Math.min(window.innerWidth * 0.92, 380);
  const availableHeight = Math.min(window.innerHeight * 0.52, 520);
  const sizeByWidth = Math.floor(availableWidth / COLS);
  const sizeByHeight = Math.floor(availableHeight / ROWS);
  BLOCK_SIZE = Math.min(sizeByWidth, sizeByHeight);
  if (BLOCK_SIZE > 32) BLOCK_SIZE = 32;
  if (BLOCK_SIZE < 22) BLOCK_SIZE = 22;

  canvas.width = COLS * BLOCK_SIZE;
  canvas.height = ROWS * BLOCK_SIZE;

  const nextSize = Math.min(105, BLOCK_SIZE * 4 + 8);
  nextCanvas.width = nextSize;
  nextCanvas.height = nextSize;

  initBackgroundBubbles(); // recréer les bulles à la bonne taille

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
  const block = Math.floor(size / 4.5); const offsetX = Math.floor((size - block * 4) / 2); const offsetY = Math.floor((size - block * 3) / 2);
  nextCtx.shadowBlur = 10; nextCtx.shadowColor = color;
  shape.forEach(([dx, dy]) => {
    nextCtx.fillStyle = color; nextCtx.fillRect(offsetX + dx * block, offsetY + dy * block, block - 2, block - 2);
    nextCtx.strokeStyle = '#ffffff'; nextCtx.lineWidth = 2; nextCtx.strokeRect(offsetX + dx * block, offsetY + dy * block, block - 2, block - 2);
  }); nextCtx.shadowBlur = 0;
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
    updateUI(); playSound('clear'); flashBoard(); triggerGlitch(0.75);
  }
}

function createLineParticles(rowY, intense = false) {
  const count = intense ? 36 : 20;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width, y: rowY * BLOCK_SIZE + BLOCK_SIZE / 2,
      vx: (Math.random() - 0.5) * (intense ? 7.5 : 5), vy: (Math.random() - 0.5) * (intense ? 4.5 : 3) - 1,
      alpha: 1, color: intense ? '#c084fc' : '#00f9ff', size: Math.random() * 5.5 + 3
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.11; p.alpha -= 0.026;
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  ctx.shadowBlur = 5; particles.forEach(p => { ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });
  ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

function flashBoard() {
  ctx.fillStyle = 'rgba(192, 132, 252, 0.32)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  setTimeout(() => { if (!gameOver && !paused) draw(); }, 55);
}

function triggerGlitch(intensity) {
  glitchIntensity = intensity;
  setTimeout(() => { glitchIntensity = 0; }, 160);
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(157, 78, 221, 0.09)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * BLOCK_SIZE, 0); ctx.lineTo(x * BLOCK_SIZE, canvas.height); ctx.stroke(); }
  for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * BLOCK_SIZE); ctx.lineTo(canvas.width, y * BLOCK_SIZE); ctx.stroke(); }
}

function drawBoard() {
  // Fond dégradé violet foncé élégant
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#12071f');
  grad.addColorStop(0.5, '#1a0a2e');
  grad.addColorStop(1, '#0f0618');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Bulles flottantes en arrière-plan
  drawBackgroundBubbles();

  // Grille subtile
  drawGrid();

  // Pièces verrouillées
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x] !== 0) drawBlock(x, y, board[y][x]);
    }
  }

  // Effet glitch anarchique
  if (glitchIntensity > 0) {
    ctx.fillStyle = `rgba(255,255,255,${glitchIntensity * 0.22})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (Math.random() > 0.55) {
      ctx.fillStyle = 'rgba(157, 78, 221, 0.35)';
      ctx.fillRect(Math.random() * canvas.width * 0.9, 0, 6, canvas.height);
    }
  }
}

function drawBlock(x, y, color) {
  const px = x * BLOCK_SIZE; const py = y * BLOCK_SIZE;
  ctx.shadowBlur = 13; ctx.shadowColor = color; ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
  ctx.shadowBlur = 0; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.strokeRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(px + 4, py + 4, BLOCK_SIZE - 8, BLOCK_SIZE - 8);
}

function drawCurrentPiece() {
  if (!currentPiece) return;
  const shape = SHAPES[currentPiece.type][currentPiece.rotation];
  ctx.shadowBlur = 17; ctx.shadowColor = currentPiece.color;
  shape.forEach(([dx, dy]) => { const x = currentPiece.x + dx; const y = currentPiece.y + dy; if (y >= 0) drawBlock(x, y, currentPiece.color); });
  ctx.shadowBlur = 0;
}

function draw() {
  drawBoard();
  drawCurrentPiece();
  drawParticles();
}

function gameLoop(timestamp = 0) {
  if (gameOver || paused) return;
  if (!lastDropTime) lastDropTime = timestamp;
  const delta = timestamp - lastDropTime;
  if (delta > dropInterval) { const oldY = currentPiece.y; currentPiece.y++; if (collision(currentPiece)) { currentPiece.y = oldY; lockPiece(); } lastDropTime = timestamp; }

  updateBackgroundBubbles();
  updateParticles();
  draw();
  animationFrame = requestAnimationFrame(gameLoop);
}

// === SYSTÈME SONORE (conservé) ===
let audioCtx;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function playSound(type) {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  if (type === 'clear') {
    const noise = audioCtx.createBufferSource();
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.55, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = noiseBuffer;

    const noiseFilter = audioCtx.createBiquadFilter(); noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 780; noiseFilter.Q.value = 1.6;
    const noiseGain = audioCtx.createGain(); noiseGain.gain.value = 0.55;
    const noiseEnv = audioCtx.createGain();

    const osc = audioCtx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 165;
    const oscFilter = audioCtx.createBiquadFilter(); oscFilter.type = 'lowpass'; oscFilter.frequency.value = 1100;
    const oscGain = audioCtx.createGain(); oscGain.gain.value = 0.4;

    const masterGain = audioCtx.createGain();
    noiseEnv.gain.setValueAtTime(0.65, now); noiseEnv.gain.linearRampToValueAtTime(0.001, now + 0.5);
    oscGain.gain.setValueAtTime(0.4, now); oscGain.gain.linearRampToValueAtTime(0.001, now + 0.38);
    masterGain.gain.value = 0.8;

    noise.connect(noiseFilter); noiseFilter.connect(noiseEnv); noiseEnv.connect(masterGain);
    osc.connect(oscFilter); oscFilter.connect(oscGain); oscGain.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    noise.start(now); osc.start(now);
    noise.stop(now + 0.55); osc.stop(now + 0.42);
    return;
  }

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';

  let freq = 220, duration = 0.12, volume = 0.26;
  osc.type = 'sawtooth';

  switch (type) {
    case 'move': osc.type = 'square'; freq = 155 + Math.random()*35; duration = 0.04; volume = 0.16; filter.frequency.value = 850; break;
    case 'rotate': osc.type = 'sawtooth'; freq = 490; duration = 0.1; volume = 0.24; filter.frequency.value = 1500; osc.frequency.setValueAtTime(490, now); osc.frequency.linearRampToValueAtTime(720, now + 0.08); break;
    case 'lock': osc.type = 'sawtooth'; freq = 88; duration = 0.2; volume = 0.35; filter.frequency.value = 620; break;
    case 'hard': osc.type = 'sawtooth'; freq = 65; duration = 0.26; volume = 0.5; filter.frequency.value = 420;
      const osc2 = audioCtx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 52;
      const g2 = audioCtx.createGain(); g2.gain.value = 0.32;
      osc2.connect(g2); g2.connect(audioCtx.destination); osc2.start(now); osc2.stop(now + 0.32); break;
  }

  osc.frequency.value = freq; gain.gain.value = volume;
  const master = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, now); gain.gain.linearRampToValueAtTime(0.001, now + duration);
  osc.connect(filter); filter.connect(gain); gain.connect(master); master.connect(audioCtx.destination);
  osc.start(now); osc.stop(now + duration + 0.04);
}

// === GESTES TACTILES ===
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

  if (duration < 210 && absX < 22 && absY < 22) { rotatePiece(); return; }
  if (absX > absY && absX > 32) { if (deltaX > 0) moveRight(); else moveLeft(); return; }
  if (deltaY > 38) { if (duration < 170 && deltaY > 85) hardDrop(); else softDrop(); }
}

// === CLAVIER ===
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
  setTimeout(() => { gameOverOverlay.classList.add('active'); }, 260);
}

function restartGame() {
  gameOverOverlay.classList.remove('active'); pauseOverlay.classList.remove('active'); startOverlay.classList.remove('active');
  resetGame(); lastDropTime = performance.now(); animationFrame = requestAnimationFrame(gameLoop);
}

function init() {
  initBoard();
  resizeGame();
  window.addEventListener('resize', () => { clearTimeout(window.resizeTimeout); window.resizeTimeout = setTimeout(resizeGame, 130); });
  document.addEventListener('keydown', handleKeyboard);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('gesturestart', e => e.preventDefault());

  ctx.fillStyle = '#12071f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  console.log('%c[Tetris Neon] Version élégante avec bulles flottantes violet foncé activée !', 'color:#c084fc');
}

init();