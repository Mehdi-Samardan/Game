'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

// ── Themes ──────────────────────────────────────────────
const THEMES = {
  CYBER: {
    bg: '#040c12', grid: 'rgba(0,255,136,0.032)',
    player: '#00ff88', playerGlow: 'rgba(0,255,136,0.5)',
    bullet: '#ffffcc', bulletGlow: '#ffee44',
    hud: 'rgba(0,255,136,0.55)', hudVal: '#ffffff', hudBorder: 'rgba(0,255,136,0.38)',
    accent: '#00ff88', panelBg: 'rgba(2,8,14,0.92)',
    enemies: [
      { minR:36, maxR:50, color:'#ff2244', glow:'rgba(255,0,34,0.6)' },
      { minR:22, maxR:35, color:'#ff7700', glow:'rgba(255,68,0,0.5)' },
      { minR:11, maxR:21, color:'#ffdd00', glow:'rgba(255,170,0,0.5)' },
    ],
  },
  INFERNO: {
    bg: '#0e0301', grid: 'rgba(255,80,20,0.03)',
    player: '#ff6622', playerGlow: 'rgba(255,80,20,0.45)',
    bullet: '#ffddaa', bulletGlow: '#ff8844',
    hud: 'rgba(255,100,40,0.6)', hudVal: '#ffddcc', hudBorder: 'rgba(255,80,20,0.38)',
    accent: '#ff5522', panelBg: 'rgba(14,3,1,0.94)',
    enemies: [
      { minR:36, maxR:50, color:'#cc1100', glow:'rgba(200,0,0,0.55)' },
      { minR:22, maxR:35, color:'#ff4400', glow:'rgba(255,60,0,0.5)' },
      { minR:11, maxR:21, color:'#ffaa00', glow:'rgba(255,160,0,0.5)' },
    ],
  },
  FROST: {
    bg: '#01080f', grid: 'rgba(80,180,255,0.03)',
    player: '#44aaff', playerGlow: 'rgba(60,150,255,0.45)',
    bullet: '#cceeff', bulletGlow: '#44aaff',
    hud: 'rgba(80,160,255,0.6)', hudVal: '#ddeeff', hudBorder: 'rgba(60,150,255,0.38)',
    accent: '#44aaff', panelBg: 'rgba(1,8,15,0.94)',
    enemies: [
      { minR:36, maxR:50, color:'#aa44ff', glow:'rgba(160,50,255,0.55)' },
      { minR:22, maxR:35, color:'#4477ff', glow:'rgba(50,100,255,0.5)' },
      { minR:11, maxR:21, color:'#44ddff', glow:'rgba(40,200,255,0.5)' },
    ],
  },
  VOID: {
    bg: '#060108', grid: 'rgba(180,80,255,0.03)',
    player: '#cc55ff', playerGlow: 'rgba(180,60,255,0.45)',
    bullet: '#eeccff', bulletGlow: '#cc55ff',
    hud: 'rgba(180,80,255,0.6)', hudVal: '#eeccff', hudBorder: 'rgba(160,60,255,0.38)',
    accent: '#cc55ff', panelBg: 'rgba(6,1,8,0.94)',
    enemies: [
      { minR:36, maxR:50, color:'#ff2277', glow:'rgba(255,20,100,0.55)' },
      { minR:22, maxR:35, color:'#ff44aa', glow:'rgba(255,40,150,0.5)' },
      { minR:11, maxR:21, color:'#ff88cc', glow:'rgba(255,120,180,0.45)' },
    ],
  },
};

let activeTheme = 'CYBER';
let T = THEMES[activeTheme];

window.setTheme = function(name) {
  activeTheme = name;
  T = THEMES[name];
  // Update panel styles
  document.querySelectorAll('.panel, .help-panel').forEach(el => {
    el.style.borderColor = T.hudBorder;
    el.style.background = T.panelBg;
  });
  document.querySelectorAll('.panel h2, .help-title').forEach(el => el.style.color = T.accent);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === name);
  });
  localStorage.setItem('pewpew_theme', name);
};

// ── State ────────────────────────────────────────────────
let state = 'start';
let score, kills, lives, level, maxEnemy, speedMult, diffTick;
let angle = 0, lastMX = 0, lastMY = 0;
let mouseDown = false, autoFireTimer = 0;
let shakeFrames = 0, shakeX = 0, shakeY = 0, flashAlpha = 0;
let highScore = +localStorage.getItem('pewpew_hs') || 0;
let lastTime = 0;
let bullets = [], enemies = [], particles = [], scorePopups = [];
let player = null, animId = null, gridOffset = 0, helpOpen = false;

const MAX_BULLETS = 120;
const MAX_PARTICLES = 500;
const PLAYER_SPEED = 3.8;

// ── Difficulty config ─────────────────────────────────────
const DIFF = {
  startEnemies: 5,       // was 3
  startSpeed: 1.3,       // was 1.0
  speedPerLevel: 0.22,   // was 0.18
  ticksPerLevel: 480,    // ~8s at 60fps, was 600
  invincibleMs: 1600,    // was 2500
  autoFireMs: 120,       // fire rate (ms)
  enemySpeedBase: 0.75,  // was 0.6
};

// ── Input ────────────────────────────────────────────────
const keys = { w:false, a:false, s:false, d:false };
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k in keys) { keys[k] = true; e.preventDefault(); }
  if (k === 'h') toggleHelp();
  if (k === 'escape' && helpOpen) closeHelp();
});
window.addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (k in keys) keys[k] = false; });

canvas.addEventListener('mousemove', e => {
  lastMX = e.clientX; lastMY = e.clientY;
  if (state === 'playing' && player)
    angle = Math.atan2(e.clientY - player.y, e.clientX - player.x) * 180 / Math.PI;
});
canvas.addEventListener('mousedown', e => {
  if (e.target !== canvas || state !== 'playing') return;
  mouseDown = true; fireBullet();
});
canvas.addEventListener('mouseup', () => mouseDown = false);
canvas.addEventListener('mouseleave', () => mouseDown = false);
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0]; lastMX = t.clientX; lastMY = t.clientY;
  if (state === 'playing' && player)
    angle = Math.atan2(t.clientY - player.y, t.clientX - player.x) * 180 / Math.PI;
}, { passive: false });
canvas.addEventListener('touchstart', e => {
  const t = e.touches[0]; lastMX = t.clientX; lastMY = t.clientY;
  if (state !== 'playing') return; mouseDown = true; fireBullet();
}, { passive: false });
canvas.addEventListener('touchend', () => mouseDown = false);

function toggleHelp() { helpOpen ? closeHelp() : openHelp(); }
function openHelp() { helpOpen = true; document.getElementById('help-panel').classList.remove('hidden'); }
function closeHelp() { helpOpen = false; document.getElementById('help-panel').classList.add('hidden'); }
window.toggleHelp = toggleHelp;
window.closeHelp = closeHelp;

// ── Player ───────────────────────────────────────────────
class Player {
  constructor() {
    this.x = W / 2; this.y = H / 2; this.r = 18;
    this.invincible = false; this.invTimer = 0; this.blinkTimer = 0;
  }
  update(dt) {
    let mx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    let my = (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
    if (mx && my) { mx *= 0.707; my *= 0.707; }
    const spd = PLAYER_SPEED + speedMult * 0.4;
    this.x = Math.max(this.r, Math.min(W - this.r, this.x + mx * spd));
    this.y = Math.max(this.r, Math.min(H - this.r, this.y + my * spd));
    if (this.invincible) {
      this.invTimer -= dt; this.blinkTimer += dt;
      if (this.invTimer <= 0) this.invincible = false;
    }
  }
  draw() {
    if (this.invincible && Math.floor(this.blinkTimer / 80) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle * Math.PI / 180);
    // Subtle outer ring — no heavy glow
    ctx.strokeStyle = T.playerGlow; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, this.r * 1.85, 0, Math.PI * 2); ctx.stroke();
    // Body
    ctx.shadowColor = T.player; ctx.shadowBlur = 10;
    ctx.fillStyle = T.player;
    ctx.beginPath(); ctx.arc(0, 0, this.r * 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(0, -this.r * 0.35, this.r * 2.6, this.r * 0.7, 3); ctx.fill();
    // Cockpit — no glow
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(-1, -1, this.r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  hit() {
    if (this.invincible) return false;
    lives--; shakeFrames = 22; flashAlpha = 0.35;
    if (lives <= 0) return true;
    this.invincible = true;
    this.invTimer = DIFF.invincibleMs;
    this.blinkTimer = 0;
    return false;
  }
}

// ── Bullet ───────────────────────────────────────────────
class Bullet {
  constructor(x, y, tx, ty) {
    this.x = x; this.y = y; this.dead = false; this.r = 3.5;
    const d = Math.hypot(tx - x, ty - y) || 1;
    this.vx = (tx - x) / d * 10; this.vy = (ty - y) / d * 10;
    this.trail = [{ x, y }, { x, y }, { x, y }];
  }
  update() {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.pop();
    this.x += this.vx; this.y += this.vy;
    if (this.x < -30 || this.x > W + 30 || this.y < -30 || this.y > H + 30) this.dead = true;
  }
  draw() {
    for (let i = 1; i < this.trail.length; i++) {
      ctx.save(); ctx.globalAlpha = (1 - i / this.trail.length) * 0.35;
      ctx.fillStyle = T.bullet;
      ctx.beginPath(); ctx.arc(this.trail[i].x, this.trail[i].y, this.r * (1 - i / this.trail.length), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Minimal glow on bullet tip only
    ctx.save(); ctx.shadowColor = T.bulletGlow; ctx.shadowBlur = 7;
    ctx.fillStyle = T.bullet;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ── Enemy ────────────────────────────────────────────────
class Enemy {
  constructor() {
    this.dead = false;
    const tiers = T.enemies;
    const tier = tiers[Math.floor(Math.random() * tiers.length)];
    this.r = Math.random() * (tier.maxR - tier.minR) + tier.minR;
    this.color = tier.color; this.glow = tier.glow;
    this.baseSpeed = (DIFF.enemySpeedBase + Math.random() * 0.7) * (28 / (this.r + 14));
    this.pulseT = Math.random() * Math.PI * 2;
    const side = Math.floor(Math.random() * 4);
    if (side === 0)      { this.x = -this.r - 5;  this.y = Math.random() * H; }
    else if (side === 1) { this.x = W + this.r + 5; this.y = Math.random() * H; }
    else if (side === 2) { this.x = Math.random() * W; this.y = -this.r - 5; }
    else                 { this.x = Math.random() * W; this.y = H + this.r + 5; }
  }
  update() {
    this.pulseT += 0.04;
    if (!player) return;
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.x += dx / d * this.baseSpeed * speedMult;
    this.y += dy / d * this.baseSpeed * speedMult;
    if (this.x < -130 || this.x > W + 130 || this.y < -130 || this.y > H + 130) this.dead = true;
  }
  draw() {
    const pulse = Math.sin(this.pulseT) * 1.8; // reduced pulse
    ctx.save();
    // Subtle glow — no big shadowBlur
    ctx.shadowColor = this.glow; ctx.shadowBlur = 8;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r + pulse * 0.2, 0, Math.PI * 2); ctx.fill();
    // Rim stroke instead of heavy glow
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r + pulse * 0.2, 0, Math.PI * 2); ctx.stroke();
    // Specular
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(this.x - this.r * 0.28, this.y - this.r * 0.28, this.r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// ── Particle ─────────────────────────────────────────────
class Particle {
  constructor(x, y, color, vx, vy, r, life) {
    this.x = x; this.y = y; this.color = color;
    this.vx = vx; this.vy = vy; this.r = r;
    this.life = life; this.maxLife = life; this.dead = false;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.vy += 0.07; this.vx *= 0.97;
    if (--this.life <= 0) this.dead = true;
  }
  draw() {
    ctx.save(); ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.5, this.r * (this.life / this.maxLife)), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

class ScorePopup {
  constructor(x, y, text, color = '#ffff00') {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.life = 52; this.dead = false;
  }
  update() { this.y -= 1.4; if (--this.life <= 0) this.dead = true; }
  draw() {
    ctx.save(); ctx.globalAlpha = Math.min(1, this.life / 16);
    ctx.fillStyle = this.color; ctx.font = 'bold 15px "Courier New", monospace';
    ctx.textAlign = 'center'; ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// ── Helpers ──────────────────────────────────────────────
function spawnParticles(x, y, color, count) {
  if (particles.length > MAX_PARTICLES - count) return;
  for (let i = 0; i < count; i++) {
    const spd = Math.random() * 5 + 0.8, a = Math.random() * Math.PI * 2;
    particles.push(new Particle(x, y, color, Math.cos(a) * spd, Math.sin(a) * spd, Math.random() * 3.5 + 1.5, Math.floor(Math.random() * 25 + 15)));
  }
}
function fireBullet() {
  if (!player || bullets.length >= MAX_BULLETS) return;
  bullets.push(new Bullet(player.x, player.y, lastMX, lastMY));
}
function spawnEnemies() {
  while (enemies.length < maxEnemy) enemies.push(new Enemy());
}

// ── Background ───────────────────────────────────────────
function drawGrid() {
  const sp = 65;
  gridOffset = (gridOffset + 0.18) % sp;
  ctx.save(); ctx.strokeStyle = T.grid; ctx.lineWidth = 1;
  for (let x = -sp + gridOffset; x < W + sp; x += sp) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = -sp + gridOffset; y < H + sp; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
}

// ── HUD (top right) ──────────────────────────────────────
function drawHUD() {
  const pad = 16, lineH = 34, panelW = 190;
  const items = [
    { label: 'SCORE', value: String(score).padStart(7, '0'), color: '#ffffff' },
    { label: 'BEST',  value: String(Math.max(score, highScore)).padStart(7, '0'), color: T.accent },
    { label: 'KILLS', value: String(kills).padStart(5, '0'), color: '#ffcc44' },
    { label: 'LEVEL', value: String(level), color: '#44ccff' },
    { label: 'LIVES', value: '♥'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives)), color: '#ff4466' },
  ];
  const panelH = items.length * lineH + pad * 1.8;
  const px = W - panelW - pad, py = pad;

  ctx.save();
  ctx.fillStyle = 'rgba(2,5,10,0.8)';
  ctx.strokeStyle = T.hudBorder; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 7); ctx.fill(); ctx.stroke();
  ctx.fillStyle = T.accent; ctx.fillRect(px + 8, py, panelW - 16, 2);

  items.forEach((item, i) => {
    const y = py + pad + i * lineH;
    ctx.font = '700 10px "Courier New",monospace'; ctx.fillStyle = T.hud;
    ctx.textAlign = 'left'; ctx.fillText(item.label, px + pad, y + 13);
    ctx.font = '700 17px "Courier New",monospace'; ctx.fillStyle = item.color;
    ctx.shadowColor = item.color; ctx.shadowBlur = 4;
    ctx.textAlign = 'right'; ctx.fillText(item.value, px + panelW - pad, y + 14);
    ctx.shadowBlur = 0;
    if (i < items.length - 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px + 6, y + 22); ctx.lineTo(px + panelW - 6, y + 22); ctx.stroke();
    }
  });
  ctx.restore();
}

// ── Speed bar (bottom center) ─────────────────────────────
function drawSpeedBar() {
  const bw = 180, bh = 7, bx = W / 2 - bw / 2, by = H - 26;
  const fill = Math.min((speedMult - DIFF.startSpeed) / 4, 1);
  const hue = 120 - fill * 130;
  ctx.save();
  ctx.fillStyle = 'rgba(2,5,10,0.75)';
  ctx.beginPath(); ctx.roundRect(bx - 10, by - 16, bw + 20, bh + 24, 5); ctx.fill();
  ctx.font = '700 10px "Courier New",monospace';
  ctx.fillStyle = T.hud; ctx.textAlign = 'center';
  ctx.fillText('SPEED', W / 2, by - 3);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 3); ctx.fill();
  if (fill > 0) {
    ctx.fillStyle = `hsl(${hue},80%,52%)`;
    ctx.beginPath(); ctx.roundRect(bx, by, bw * fill, bh, 3); ctx.fill();
  }
  ctx.restore();
}

// ── Game loop ─────────────────────────────────────────────
function gameLoop(ts) {
  if (state !== 'playing') return;
  animId = requestAnimationFrame(gameLoop);
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  diffTick++;
  if (diffTick % DIFF.ticksPerLevel === 0) {
    level++;
    speedMult += DIFF.speedPerLevel;
    maxEnemy = Math.min(maxEnemy + 1, 32);
  }

  if (mouseDown) { autoFireTimer += dt; if (autoFireTimer >= DIFF.autoFireMs) { fireBullet(); autoFireTimer = 0; } }

  if (shakeFrames > 0) { shakeX = (Math.random() - 0.5) * 11; shakeY = (Math.random() - 0.5) * 11; shakeFrames--; }
  else shakeX = shakeY = 0;

  ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
  drawGrid();
  ctx.save(); ctx.translate(shakeX, shakeY);

  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,0,0,${flashAlpha})`; ctx.fillRect(0, 0, W, H);
    flashAlpha = Math.max(0, flashAlpha - 0.018);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(); particles[i].draw();
    if (particles[i].dead) particles.splice(i, 1);
  }
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    scorePopups[i].update(); scorePopups[i].draw();
    if (scorePopups[i].dead) scorePopups.splice(i, 1);
  }

  spawnEnemies();
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update();
    if (e.dead) { enemies.splice(i, 1); continue; }
    let killed = false;
    for (let b = bullets.length - 1; b >= 0; b--) {
      const bl = bullets[b];
      if ((e.x - bl.x) ** 2 + (e.y - bl.y) ** 2 < (e.r + bl.r) ** 2) {
        bl.dead = true;
        spawnParticles(e.x, e.y, e.color, 8);
        if (e.r <= 14) {
          spawnParticles(e.x, e.y, '#ffffff', 12);
          scorePopups.push(new ScorePopup(e.x, e.y - e.r - 8, '+20', T.accent));
          score += 20; kills++;
          if (kills % 5 === 0) maxEnemy = Math.min(maxEnemy + 1, 32);
          enemies.splice(i, 1); killed = true; break;
        } else {
          e.r -= 5; score += 5;
          scorePopups.push(new ScorePopup(e.x, e.y - e.r - 4, '+5', '#ffaa44'));
        }
      }
    }
    if (!killed) {
      if (player && (e.x - player.x) ** 2 + (e.y - player.y) ** 2 < (e.r + player.r) ** 2) {
        if (player.hit()) { endGame(); return; }
      }
      e.draw();
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update(); bullets[i].draw();
    if (bullets[i].dead) bullets.splice(i, 1);
  }

  if (player) { player.update(dt); player.draw(); }
  ctx.restore();
  drawHUD();
  drawSpeedBar();
  if (score > highScore) highScore = score;
}

function endGame() {
  state = 'gameover';
  cancelAnimationFrame(animId);
  if (score > highScore) { highScore = score; localStorage.setItem('pewpew_hs', highScore); }
  document.getElementById('final-score').textContent = `Score: ${String(score).padStart(7,'0')}   Kills: ${kills}`;
  document.getElementById('high-score-display').textContent = `Best: ${String(highScore).padStart(7,'0')}`;
  document.getElementById('gameover').classList.remove('hidden');
}

window.init = function () {
  T = THEMES[activeTheme];
  state = 'playing'; score = 0; kills = 0; lives = 3; level = 1;
  maxEnemy = DIFF.startEnemies;
  speedMult = DIFF.startSpeed;
  diffTick = 0; angle = 0; shakeFrames = 0; flashAlpha = 0; autoFireTimer = 0; mouseDown = false;
  keys.w = keys.a = keys.s = keys.d = false;
  bullets = []; enemies = []; particles = []; scorePopups = [];
  player = new Player();
  helpOpen = false;
  document.getElementById('start').classList.add('hidden');
  document.getElementById('gameover').classList.add('hidden');
  document.getElementById('help-panel').classList.add('hidden');
  lastTime = performance.now();
  requestAnimationFrame(ts => { lastTime = ts; gameLoop(ts); });
};

// Restore saved theme on load
const savedTheme = localStorage.getItem('pewpew_theme');
if (savedTheme && THEMES[savedTheme]) setTheme(savedTheme);
