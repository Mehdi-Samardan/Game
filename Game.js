'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

// --- State ---
let state = 'start';
let score, kills, lives, level, maxEnemy, speedMult, diffTick;
let angle = 0, lastMX = 0, lastMY = 0;
let mouseDown = false, autoFireTimer = 0;
let shakeFrames = 0, shakeX = 0, shakeY = 0, flashAlpha = 0;
let highScore = +localStorage.getItem('pewpew_hs') || 0;
let lastTime = 0;
let bullets = [], enemies = [], particles = [], scorePopups = [];
let player = null, animId = null;
let gridOffset = 0;

const MAX_BULLETS = 120;
const MAX_PARTICLES = 600;

// --- Input ---
canvas.addEventListener('mousemove', e => {
  lastMX = e.clientX; lastMY = e.clientY;
  if (state === 'playing' && player)
    angle = Math.atan2(e.clientY - player.y, e.clientX - player.x) * 180 / Math.PI;
});
canvas.addEventListener('mousedown', () => { if (state !== 'playing') return; mouseDown = true; fireBullet(); });
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

// --- Player ---
class Player {
  constructor() {
    this.x = W / 2; this.y = H / 2; this.r = 18;
    this.invincible = false; this.invTimer = 0; this.blinkTimer = 0;
  }
  update(dt) {
    if (!this.invincible) return;
    this.invTimer -= dt; this.blinkTimer += dt;
    if (this.invTimer <= 0) this.invincible = false;
  }
  draw() {
    if (this.invincible && Math.floor(this.blinkTimer / 90) % 2 === 0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle * Math.PI / 180);
    ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#00ff88';
    ctx.beginPath(); ctx.arc(0, 0, this.r * 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(0, -this.r * 0.35, this.r * 2.6, this.r * 0.7, 3); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(200,255,230,0.7)';
    ctx.beginPath(); ctx.arc(-2, -2, this.r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  hit() {
    if (this.invincible) return false;
    lives--; shakeFrames = 28; flashAlpha = 0.45;
    if (lives <= 0) return true;
    this.invincible = true; this.invTimer = 2500; this.blinkTimer = 0;
    return false;
  }
}

// --- Bullet ---
class Bullet {
  constructor(x, y, tx, ty) {
    this.x = x; this.y = y; this.dead = false; this.r = 4;
    const d = Math.hypot(tx - x, ty - y) || 1;
    this.vx = (tx - x) / d * 9; this.vy = (ty - y) / d * 9;
    this.trail = [{ x, y }, { x, y }, { x, y }];
  }
  update() {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 7) this.trail.pop();
    this.x += this.vx; this.y += this.vy;
    if (this.x < -30 || this.x > W + 30 || this.y < -30 || this.y > H + 30) this.dead = true;
  }
  draw() {
    for (let i = 1; i < this.trail.length; i++) {
      ctx.save(); ctx.globalAlpha = (1 - i / this.trail.length) * 0.4;
      ctx.fillStyle = '#ffffaa';
      ctx.beginPath(); ctx.arc(this.trail[i].x, this.trail[i].y, this.r * (1 - i / this.trail.length), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.shadowColor = '#ffee44'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffcc';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// --- Enemy tiers ---
const TIERS = [
  { minR: 36, maxR: 50, color: '#ff2244', glow: '#ff0022', pts: 20 },
  { minR: 22, maxR: 35, color: '#ff7700', glow: '#ff4400', pts: 15 },
  { minR: 11, maxR: 21, color: '#ffdd00', glow: '#ffaa00', pts: 10 },
];

class Enemy {
  constructor() {
    this.dead = false;
    const tier = TIERS[Math.floor(Math.random() * TIERS.length)];
    this.r = Math.random() * (tier.maxR - tier.minR) + tier.minR;
    this.color = tier.color; this.glow = tier.glow; this.pts = tier.pts;
    this.baseSpeed = (0.55 + Math.random() * 0.7) * (28 / (this.r + 14));
    this.pulseT = Math.random() * Math.PI * 2;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { this.x = -this.r - 5; this.y = Math.random() * H; }
    else if (side === 1) { this.x = W + this.r + 5; this.y = Math.random() * H; }
    else if (side === 2) { this.x = Math.random() * W; this.y = -this.r - 5; }
    else { this.x = Math.random() * W; this.y = H + this.r + 5; }
  }
  update() {
    this.pulseT += 0.04;
    if (!player) return;
    const dx = player.x - this.x, dy = player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const spd = this.baseSpeed * speedMult;
    this.x += dx / d * spd; this.y += dy / d * spd;
    if (this.x < -120 || this.x > W + 120 || this.y < -120 || this.y > H + 120) this.dead = true;
  }
  draw() {
    const pulse = Math.sin(this.pulseT) * 2.5;
    ctx.save();
    ctx.shadowColor = this.glow; ctx.shadowBlur = 18 + pulse;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r + pulse * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(this.x - this.r * 0.28, this.y - this.r * 0.28, this.r * 0.38, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// --- Particle ---
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
    ctx.save();
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.beginPath(); ctx.arc(this.x, this.y, Math.max(0.5, this.r * (this.life / this.maxLife)), 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

// --- Score popup ---
class ScorePopup {
  constructor(x, y, text, color = '#ffff00') {
    this.x = x; this.y = y; this.text = text; this.color = color;
    this.life = 55; this.dead = false;
  }
  update() { this.y -= 1.3; if (--this.life <= 0) this.dead = true; }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.life / 20);
    ctx.fillStyle = this.color; ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center'; ctx.shadowColor = this.color; ctx.shadowBlur = 8;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

// --- Helpers ---
function spawnParticles(x, y, color, count) {
  if (particles.length > MAX_PARTICLES - count) return;
  for (let i = 0; i < count; i++) {
    const spd = Math.random() * 5.5 + 0.8, a = Math.random() * Math.PI * 2;
    particles.push(new Particle(x, y, color, Math.cos(a) * spd, Math.sin(a) * spd, Math.random() * 4 + 1.5, Math.floor(Math.random() * 28 + 18)));
  }
}

function fireBullet() {
  if (!player || bullets.length >= MAX_BULLETS) return;
  bullets.push(new Bullet(player.x, player.y, lastMX, lastMY));
}

function spawnEnemies() {
  while (enemies.length < maxEnemy) enemies.push(new Enemy());
}

// --- Background ---
function drawGrid() {
  const sp = 65;
  gridOffset = (gridOffset + 0.18) % sp;
  ctx.save(); ctx.strokeStyle = 'rgba(0,255,136,0.035)'; ctx.lineWidth = 1;
  for (let x = -sp + gridOffset; x < W + sp; x += sp) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = -sp + gridOffset; y < H + sp; y += sp) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
}

// --- HUD ---
function drawHUD() {
  const pad = 14, lineH = 30, panelW = 176;
  const items = [
    { label: 'SCORE', value: String(score).padStart(7, '0'), color: '#ffffff' },
    { label: 'BEST',  value: String(Math.max(score, highScore)).padStart(7, '0'), color: '#aaffcc' },
    { label: 'KILLS', value: String(kills).padStart(5, '0'), color: '#ffcc44' },
    { label: 'LEVEL', value: String(level), color: '#44ccff' },
    { label: 'LIVES', value: '♥'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives)), color: '#ff4466' },
  ];
  const panelH = items.length * lineH + pad * 1.6;
  const px = W - panelW - pad, py = pad;

  ctx.save();
  // bg
  ctx.fillStyle = 'rgba(2,8,14,0.75)';
  ctx.strokeStyle = 'rgba(0,255,136,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 7); ctx.fill(); ctx.stroke();
  // top accent line
  ctx.fillStyle = '#00ff88'; ctx.fillRect(px + 7, py, panelW - 14, 2);

  items.forEach((item, i) => {
    const y = py + pad + i * lineH;
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(0,255,136,0.55)';
    ctx.textAlign = 'left'; ctx.fillText(item.label, px + pad, y + 12);
    ctx.font = 'bold 15px monospace'; ctx.fillStyle = item.color;
    ctx.shadowColor = item.color; ctx.shadowBlur = 5;
    ctx.textAlign = 'right'; ctx.fillText(item.value, px + panelW - pad, y + 13);
    ctx.shadowBlur = 0;
    if (i < items.length - 1) {
      ctx.strokeStyle = 'rgba(0,255,136,0.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px + 6, y + 20); ctx.lineTo(px + panelW - 6, y + 20); ctx.stroke();
    }
  });
  ctx.restore();
}

// --- Game loop ---
function gameLoop(ts) {
  if (state !== 'playing') return;
  animId = requestAnimationFrame(gameLoop);
  const dt = Math.min(ts - lastTime, 50);
  lastTime = ts;

  diffTick++;
  if (diffTick % 900 === 0) { level++; speedMult += 0.12; maxEnemy = Math.min(maxEnemy + 1, 28); }

  if (mouseDown) { autoFireTimer += dt; if (autoFireTimer >= 105) { fireBullet(); autoFireTimer = 0; } }

  if (shakeFrames > 0) { shakeX = (Math.random() - 0.5) * 13; shakeY = (Math.random() - 0.5) * 13; shakeFrames--; }
  else shakeX = shakeY = 0;

  // --- Clear ---
  ctx.fillStyle = '#040c12'; ctx.fillRect(0, 0, W, H);
  drawGrid();

  ctx.save(); ctx.translate(shakeX, shakeY);

  if (flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,0,0,${flashAlpha})`; ctx.fillRect(0, 0, W, H);
    flashAlpha = Math.max(0, flashAlpha - 0.016);
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update(); particles[i].draw();
    if (particles[i].dead) particles.splice(i, 1);
  }
  // Score popups
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    scorePopups[i].update(); scorePopups[i].draw();
    if (scorePopups[i].dead) scorePopups.splice(i, 1);
  }

  // Enemies
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
        spawnParticles(e.x, e.y, e.color, 10);
        if (e.r <= 14) {
          spawnParticles(e.x, e.y, e.glow, 22);
          scorePopups.push(new ScorePopup(e.x, e.y - e.r - 8, '+20'));
          score += 20; kills++;
          if (kills % 5 === 0) maxEnemy = Math.min(maxEnemy + 1, 28);
          enemies.splice(i, 1); killed = true; break;
        } else {
          e.r -= 5; score += 5;
          scorePopups.push(new ScorePopup(e.x, e.y - e.r - 4, '+5', '#ffaa00'));
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

  // Bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update(); bullets[i].draw();
    if (bullets[i].dead) bullets.splice(i, 1);
  }

  if (player) { player.update(dt); player.draw(); }

  ctx.restore();
  drawHUD();
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
  state = 'playing'; score = 0; kills = 0; lives = 3; level = 1;
  maxEnemy = 3; speedMult = 1; diffTick = 0;
  angle = 0; shakeFrames = 0; flashAlpha = 0; autoFireTimer = 0; mouseDown = false;
  bullets = []; enemies = []; particles = []; scorePopups = [];
  player = new Player();
  document.getElementById('start').classList.add('hidden');
  document.getElementById('gameover').classList.add('hidden');
  lastTime = performance.now();
  requestAnimationFrame(ts => { lastTime = ts; gameLoop(ts); });
};
