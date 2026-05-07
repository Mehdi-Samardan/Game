'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

// ── Themes ───────────────────────────────────────────────
const THEMES = {
  CYBER: {
    bg:'#040c12', grid:'rgba(0,255,136,0.032)',
    player:'#00ff88', playerGlow:'rgba(0,255,136,0.4)',
    bullet:'#ffffcc', bulletGlow:'#ffee44',
    accent:'#00ff88', accentDim:'rgba(0,255,136,0.55)',
    panelBg:'rgba(2,8,14,0.95)', border:'rgba(0,255,136,0.38)',
    hudVal:'#e8fff4', scoreColor:'#ffffff',
    powerupColors:{ RAPID:'#ff9900', SHIELD:'#00ccff', SLOW:'#cc44ff' },
    enemies:[
      { minR:36,maxR:50, color:'#ff2244', glow:'rgba(255,0,34,0.5)'  },
      { minR:22,maxR:35, color:'#ff7700', glow:'rgba(255,68,0,0.45)' },
      { minR:11,maxR:21, color:'#ffdd00', glow:'rgba(255,170,0,0.4)' },
    ],
  },
  INFERNO: {
    bg:'#0d0200', grid:'rgba(255,80,20,0.03)',
    player:'#ff6622', playerGlow:'rgba(255,80,20,0.38)',
    bullet:'#ffd9aa', bulletGlow:'#ff8844',
    accent:'#ff5522', accentDim:'rgba(255,85,34,0.6)',
    panelBg:'rgba(13,2,0,0.96)', border:'rgba(255,70,20,0.38)',
    hudVal:'#ffe8dd', scoreColor:'#ffffff',
    powerupColors:{ RAPID:'#ffcc00', SHIELD:'#ff44aa', SLOW:'#aa44ff' },
    enemies:[
      { minR:36,maxR:50, color:'#cc1100', glow:'rgba(200,0,0,0.5)'   },
      { minR:22,maxR:35, color:'#ff4400', glow:'rgba(255,60,0,0.45)' },
      { minR:11,maxR:21, color:'#ffaa00', glow:'rgba(255,160,0,0.4)' },
    ],
  },
  FROST: {
    bg:'#010810', grid:'rgba(80,180,255,0.03)',
    player:'#44aaff', playerGlow:'rgba(60,150,255,0.38)',
    bullet:'#cceeff', bulletGlow:'#44aaff',
    accent:'#44aaff', accentDim:'rgba(80,160,255,0.6)',
    panelBg:'rgba(1,8,16,0.96)', border:'rgba(60,150,255,0.38)',
    hudVal:'#ddeeff', scoreColor:'#ffffff',
    powerupColors:{ RAPID:'#ffcc44', SHIELD:'#44ffcc', SLOW:'#ff88cc' },
    enemies:[
      { minR:36,maxR:50, color:'#aa44ff', glow:'rgba(160,50,255,0.5)'  },
      { minR:22,maxR:35, color:'#4477ff', glow:'rgba(50,100,255,0.45)' },
      { minR:11,maxR:21, color:'#44ddff', glow:'rgba(40,200,255,0.4)'  },
    ],
  },
  VOID: {
    bg:'#060009', grid:'rgba(180,80,255,0.03)',
    player:'#cc55ff', playerGlow:'rgba(180,60,255,0.38)',
    bullet:'#eeccff', bulletGlow:'#cc55ff',
    accent:'#cc55ff', accentDim:'rgba(180,80,255,0.6)',
    panelBg:'rgba(6,0,9,0.96)', border:'rgba(160,60,255,0.38)',
    hudVal:'#f0ddff', scoreColor:'#ffffff',
    powerupColors:{ RAPID:'#ffaa00', SHIELD:'#44ffaa', SLOW:'#44ccff' },
    enemies:[
      { minR:36,maxR:50, color:'#ff2277', glow:'rgba(255,20,100,0.5)'  },
      { minR:22,maxR:35, color:'#ff44aa', glow:'rgba(255,40,150,0.45)' },
      { minR:11,maxR:21, color:'#ff88cc', glow:'rgba(255,120,180,0.4)' },
    ],
  },
  MONO: {
    bg:'#000000', grid:'rgba(255,255,255,0.04)',
    player:'#ffffff', playerGlow:'rgba(255,255,255,0.3)',
    bullet:'#ffffff', bulletGlow:'rgba(255,255,255,0.6)',
    accent:'#ffffff', accentDim:'rgba(255,255,255,0.5)',
    panelBg:'rgba(0,0,0,0.96)', border:'rgba(255,255,255,0.25)',
    hudVal:'#ffffff', scoreColor:'#ffffff',
    powerupColors:{ RAPID:'#dddddd', SHIELD:'#aaaaaa', SLOW:'#bbbbbb' },
    enemies:[
      { minR:36,maxR:50, color:'#cccccc', glow:'rgba(255,255,255,0.35)' },
      { minR:22,maxR:35, color:'#888888', glow:'rgba(255,255,255,0.25)' },
      { minR:11,maxR:21, color:'#555555', glow:'rgba(255,255,255,0.2)'  },
    ],
  },
};

let activeTheme = localStorage.getItem('pewpew_theme') || 'CYBER';
let T = THEMES[activeTheme];

function applyThemeCSS() {
  const r = document.documentElement.style;
  r.setProperty('--accent',     T.accent);
  r.setProperty('--accent-dim', T.accentDim);
  r.setProperty('--panel-bg',   T.panelBg);
  r.setProperty('--border',     T.border);
  r.setProperty('--hud-val',    T.hudVal);
}

window.setTheme = function(name) {
  activeTheme = name;
  T = THEMES[name];
  applyThemeCSS();
  localStorage.setItem('pewpew_theme', name);
  document.querySelectorAll('.theme-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.theme === name));
};

// ── Power-up definitions ─────────────────────────────────
const POWERUP_DEFS = {
  RAPID:  { label:'RAPID FIRE', icon:'🔥', duration:30000 },
  SHIELD: { label:'SHIELD',     icon:'🛡', duration:8000  },
  SLOW:   { label:'SLOW-MO',    icon:'⏱', duration:10000 },
};
const POWERUP_TYPES = Object.keys(POWERUP_DEFS);

// ── State ────────────────────────────────────────────────
let state = 'start';
let score, kills, lives, level, maxEnemy, speedMult, diffTick;
let combo, comboTimer;
let angle = 0, lastMX = 0, lastMY = 0;
let mouseDown = false, autoFireTimer = 0;
let shakeFrames = 0, shakeX = 0, shakeY = 0, flashAlpha = 0;
let highScore = +localStorage.getItem('pewpew_hs') || 0;
let lastTime = 0;
let bullets = [], enemies = [], particles = [], scorePopups = [], powerups = [];
let player = null, animId = null, gridOffset = 0, helpOpen = false;

// Active power-up timers (ms remaining, 0 = inactive)
let activePU = { RAPID:0, SHIELD:0, SLOW:0 };

const MAX_BULLETS   = 120;
const MAX_PARTICLES = 500;
const PLAYER_SPEED  = 3.8;
const COMBO_WINDOW  = 2500; // ms to chain kills

const DIFF = {
  startEnemies: 5,
  startSpeed:   1.3,
  speedPerLevel:0.22,
  ticksPerLevel:480,
  invincibleMs: 1600,
  autoFireMs:   120,
  enemySpeedBase:0.75,
  powerupDropChance:0.22, // 22% per kill
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
}, { passive:false });
canvas.addEventListener('touchstart', e => {
  const t = e.touches[0]; lastMX = t.clientX; lastMY = t.clientY;
  if (state !== 'playing') return; mouseDown = true; fireBullet();
}, { passive:false });
canvas.addEventListener('touchend', () => mouseDown = false);

function toggleHelp() { helpOpen ? closeHelp() : openHelp(); }
function openHelp()  { helpOpen = true;  document.getElementById('help-panel').classList.remove('hidden'); }
function closeHelp() { helpOpen = false; document.getElementById('help-panel').classList.add('hidden'); }
window.toggleHelp = toggleHelp;
window.closeHelp  = closeHelp;

// ── Player ───────────────────────────────────────────────
class Player {
  constructor() {
    this.x = W/2; this.y = H/2; this.r = 18;
    this.invincible = false; this.invTimer = 0; this.blinkTimer = 0;
  }
  update(dt) {
    let mx = (keys.d?1:0)-(keys.a?1:0);
    let my = (keys.s?1:0)-(keys.w?1:0);
    if (mx && my) { mx*=0.707; my*=0.707; }
    const spd = PLAYER_SPEED + speedMult * 0.4;
    this.x = Math.max(this.r, Math.min(W-this.r, this.x + mx*spd));
    this.y = Math.max(this.r, Math.min(H-this.r, this.y + my*spd));

    // Collect power-ups
    for (let i = powerups.length-1; i >= 0; i--) {
      const p = powerups[i];
      if ((this.x-p.x)**2+(this.y-p.y)**2 < (this.r+p.r)**2) {
        activatePowerup(p.type);
        spawnParticles(p.x, p.y, T.powerupColors[p.type], 20);
        scorePopups.push(new ScorePopup(p.x, p.y-30, POWERUP_DEFS[p.type].icon+' '+POWERUP_DEFS[p.type].label, T.powerupColors[p.type]));
        powerups.splice(i,1);
      }
    }

    if (this.invincible) {
      this.invTimer -= dt; this.blinkTimer += dt;
      if (this.invTimer <= 0) this.invincible = false;
    }
  }
  draw() {
    const shieldActive = activePU.SHIELD > 0;
    if (!shieldActive && this.invincible && Math.floor(this.blinkTimer/80)%2===0) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle * Math.PI/180);

    if (shieldActive) {
      const pulse = Math.sin(Date.now()/200)*0.3+0.7;
      ctx.strokeStyle = `rgba(0,200,255,${pulse})`; ctx.lineWidth = 3;
      ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(0, 0, this.r*2.4, 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = T.playerGlow; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, this.r*1.85, 0, Math.PI*2); ctx.stroke();
    ctx.shadowColor = T.player; ctx.shadowBlur = 10;
    ctx.fillStyle = T.player;
    ctx.beginPath(); ctx.arc(0, 0, this.r*1.4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(0, -this.r*0.35, this.r*2.6, this.r*0.7, 3); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(-1, -1, this.r*0.5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
  hit() {
    if (this.invincible || activePU.SHIELD > 0) return false;
    lives--; shakeFrames=22; flashAlpha=0.35;
    if (lives<=0) return true;
    this.invincible=true; this.invTimer=DIFF.invincibleMs; this.blinkTimer=0;
    return false;
  }
}

// ── Power-up orb ─────────────────────────────────────────
class PowerUp {
  constructor(x, y, type) {
    this.x=x; this.y=y; this.type=type; this.r=14;
    this.pulseT=Math.random()*Math.PI*2; this.dead=false;
    this.life=600; // frames before despawn
  }
  update() {
    this.pulseT+=0.06;
    if(--this.life<=0) this.dead=true;
  }
  draw() {
    const c = T.powerupColors[this.type];
    const pulse = Math.sin(this.pulseT)*3;
    const alpha = Math.min(1, this.life/40);
    ctx.save();
    ctx.globalAlpha = alpha;
    // Outer ring
    ctx.strokeStyle = c; ctx.lineWidth = 1.5;
    ctx.shadowColor = c; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r+4+pulse, 0, Math.PI*2); ctx.stroke();
    // Body
    ctx.fillStyle = c+'33';
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.r-4, 0, Math.PI*2); ctx.fill();
    // Icon
    ctx.shadowBlur=0; ctx.fillStyle='#000';
    ctx.font=`bold 11px "Courier New",monospace`;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(this.type==='RAPID'?'R':this.type==='SHIELD'?'S':'T', this.x, this.y);
    ctx.restore();
  }
}

function activatePowerup(type) {
  activePU[type] = POWERUP_DEFS[type].duration;
}

// ── Bullet ───────────────────────────────────────────────
class Bullet {
  constructor(x, y, tx, ty) {
    this.x=x; this.y=y; this.dead=false; this.r=3.5;
    const d=Math.hypot(tx-x,ty-y)||1;
    this.vx=(tx-x)/d*10; this.vy=(ty-y)/d*10;
    this.trail=[{x,y},{x,y},{x,y}];
  }
  update() {
    this.trail.unshift({x:this.x,y:this.y});
    if(this.trail.length>6) this.trail.pop();
    this.x+=this.vx; this.y+=this.vy;
    if(this.x<-30||this.x>W+30||this.y<-30||this.y>H+30) this.dead=true;
  }
  draw() {
    for(let i=1;i<this.trail.length;i++){
      ctx.save(); ctx.globalAlpha=(1-i/this.trail.length)*0.3;
      ctx.fillStyle=T.bullet;
      ctx.beginPath(); ctx.arc(this.trail[i].x,this.trail[i].y,this.r*(1-i/this.trail.length),0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.save(); ctx.shadowColor=T.bulletGlow; ctx.shadowBlur=7;
    ctx.fillStyle=T.bullet;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── Enemy ────────────────────────────────────────────────
class Enemy {
  constructor() {
    this.dead=false;
    const tier=T.enemies[Math.floor(Math.random()*T.enemies.length)];
    this.r=Math.random()*(tier.maxR-tier.minR)+tier.minR;
    this.color=tier.color; this.glow=tier.glow;
    this.baseSpeed=(DIFF.enemySpeedBase+Math.random()*0.7)*(28/(this.r+14));
    this.pulseT=Math.random()*Math.PI*2;
    const side=Math.floor(Math.random()*4);
    if(side===0)      { this.x=-this.r-5;   this.y=Math.random()*H; }
    else if(side===1) { this.x=W+this.r+5;  this.y=Math.random()*H; }
    else if(side===2) { this.x=Math.random()*W; this.y=-this.r-5; }
    else              { this.x=Math.random()*W; this.y=H+this.r+5; }
  }
  update() {
    this.pulseT+=0.04;
    if(!player) return;
    const dx=player.x-this.x, dy=player.y-this.y;
    const d=Math.hypot(dx,dy)||1;
    const slow = activePU.SLOW>0 ? 0.45 : 1;
    this.x+=dx/d*this.baseSpeed*speedMult*slow;
    this.y+=dy/d*this.baseSpeed*speedMult*slow;
    if(this.x<-130||this.x>W+130||this.y<-130||this.y>H+130) this.dead=true;
  }
  draw() {
    const pulse=Math.sin(this.pulseT)*1.6;
    ctx.save();
    ctx.shadowColor=this.glow; ctx.shadowBlur=8;
    ctx.fillStyle=this.color;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r+pulse*0.2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle=this.glow; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(this.x,this.y,this.r+pulse*0.2,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.arc(this.x-this.r*0.28,this.y-this.r*0.28,this.r*0.35,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ── Particle ─────────────────────────────────────────────
class Particle {
  constructor(x,y,color,vx,vy,r,life) {
    this.x=x;this.y=y;this.color=color;this.vx=vx;this.vy=vy;
    this.r=r;this.life=life;this.maxLife=life;this.dead=false;
  }
  update() {
    this.x+=this.vx;this.y+=this.vy;
    this.vy+=0.07;this.vx*=0.97;
    if(--this.life<=0) this.dead=true;
  }
  draw() {
    ctx.save();ctx.globalAlpha=this.life/this.maxLife;
    ctx.fillStyle=this.color;
    ctx.beginPath();ctx.arc(this.x,this.y,Math.max(0.5,this.r*(this.life/this.maxLife)),0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}

class ScorePopup {
  constructor(x,y,text,color='#ffff00') {
    this.x=x;this.y=y;this.text=text;this.color=color;
    this.life=58;this.dead=false;
  }
  update() { this.y-=1.4; if(--this.life<=0) this.dead=true; }
  draw() {
    ctx.save();ctx.globalAlpha=Math.min(1,this.life/16);
    ctx.fillStyle=this.color;ctx.font='bold 15px "Courier New",monospace';
    ctx.textAlign='center';ctx.fillText(this.text,this.x,this.y);
    ctx.restore();
  }
}

// ── Helpers ──────────────────────────────────────────────
function spawnParticles(x,y,color,count) {
  if(particles.length>MAX_PARTICLES-count) return;
  for(let i=0;i<count;i++) {
    const spd=Math.random()*5+0.8, a=Math.random()*Math.PI*2;
    particles.push(new Particle(x,y,color,Math.cos(a)*spd,Math.sin(a)*spd,Math.random()*3.5+1.5,Math.floor(Math.random()*25+15)));
  }
}
function fireBullet() {
  if(!player||bullets.length>=MAX_BULLETS) return;
  bullets.push(new Bullet(player.x,player.y,lastMX,lastMY));
}
function spawnEnemies() {
  while(enemies.length<maxEnemy) enemies.push(new Enemy());
}
function tryDropPowerup(x,y) {
  if(Math.random()<DIFF.powerupDropChance) {
    const type=POWERUP_TYPES[Math.floor(Math.random()*POWERUP_TYPES.length)];
    powerups.push(new PowerUp(x,y,type));
  }
}
function registerKill(ex,ey) {
  kills++;
  combo++;
  comboTimer=COMBO_WINDOW;
  if(kills%5===0) maxEnemy=Math.min(maxEnemy+1,32);
  tryDropPowerup(ex,ey);
  return combo;
}

// ── Background ───────────────────────────────────────────
function drawGrid() {
  const sp=65; gridOffset=(gridOffset+0.18)%sp;
  ctx.save();ctx.strokeStyle=T.grid;ctx.lineWidth=1;
  for(let x=-sp+gridOffset;x<W+sp;x+=sp){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=-sp+gridOffset;y<H+sp;y+=sp){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.restore();
}

// ── HUD (top right) ──────────────────────────────────────
function drawHUD() {
  const pad = 16, panelW = 230;
  const px = W - panelW - 14, py = 14;

  // ── stats rows ──────────────────────────────────────────
  const stats = [
    { label:'SCORE', value:String(score).padStart(7,'0'), color:T.scoreColor },
    { label:'BEST',  value:String(Math.max(score,highScore)).padStart(7,'0'), color:T.accent },
    { label:'KILLS', value:String(kills).padStart(5,'0'), color:'#ffcc44' },
    { label:'LEVEL', value:String(level), color:'#44ccff' },
    { label:'LIVES', value:'♥'.repeat(lives)+'♡'.repeat(Math.max(0,3-lives)), color:'#ff4466' },
  ];

  const activePUs = POWERUP_TYPES.filter(t => activePU[t] > 0);
  const STAT_H   = 38;
  const PU_H     = 42;
  const SEC_H    = 24;
  const statsH   = stats.length * STAT_H;
  const puH      = activePUs.length > 0 ? SEC_H + activePUs.length * PU_H + 8 : 0;
  const panelH   = pad + statsH + puH + pad;

  ctx.save();

  // Panel bg + border
  ctx.fillStyle = 'rgba(4,8,18,0.88)';
  ctx.strokeStyle = T.border; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 8); ctx.fill(); ctx.stroke();

  // Top accent bar
  ctx.fillStyle = T.accent;
  ctx.beginPath(); ctx.roundRect(px+8, py, panelW-16, 2, 1); ctx.fill();

  // ── Draw each stat row ───────────────────────────────────
  stats.forEach((item, i) => {
    const rowY = py + pad + i * STAT_H;

    // Row bg on hover (alternate)
    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.018)';
      ctx.beginPath(); ctx.roundRect(px+4, rowY-2, panelW-8, STAT_H-4, 4); ctx.fill();
    }

    // Label (left, small, bright)
    ctx.font = '700 11px "Courier New",monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, px+pad, rowY + 14);

    // Value (right, bold, colored, glowing)
    ctx.font = '700 20px "Courier New",monospace';
    ctx.fillStyle = item.color;
    ctx.shadowColor = item.color; ctx.shadowBlur = 6;
    ctx.textAlign = 'right';
    ctx.fillText(item.value, px+panelW-pad, rowY + 27);
    ctx.shadowBlur = 0;

    // Separator line
    if (i < stats.length - 1 || activePUs.length > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.055)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px+8, rowY+STAT_H-2);
      ctx.lineTo(px+panelW-8, rowY+STAT_H-2);
      ctx.stroke();
    }
  });

  // ── Power-up section ─────────────────────────────────────
  if (activePUs.length > 0) {
    const secY = py + pad + stats.length * STAT_H + 6;

    // Section header
    ctx.font = '700 9px "Courier New",monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.textAlign = 'left';
    ctx.fillText('⚡ ACTIVE POWER-UPS', px+pad, secY + 10);

    activePUs.forEach((type, i) => {
      const rowY = secY + SEC_H + i * PU_H;
      const c = T.powerupColors[type];
      const frac = activePU[type] / POWERUP_DEFS[type].duration;
      const secs = Math.ceil(activePU[type] / 1000);
      const barX = px + pad;
      const barW = panelW - pad * 2;

      // Row bg
      ctx.fillStyle = c + '18';
      ctx.beginPath(); ctx.roundRect(px+4, rowY-2, panelW-8, PU_H-4, 4); ctx.fill();

      // Icon + label
      ctx.font = '700 12px "Courier New",monospace';
      ctx.fillStyle = c; ctx.textAlign = 'left';
      ctx.fillText(POWERUP_DEFS[type].icon + '  ' + POWERUP_DEFS[type].label, barX, rowY + 14);

      // Timer
      ctx.font = '700 12px "Courier New",monospace';
      ctx.fillStyle = c; ctx.textAlign = 'right';
      ctx.fillText(secs + 's', px+panelW-pad, rowY + 14);

      // Bar track
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.roundRect(barX, rowY+20, barW, 5, 2); ctx.fill();

      // Bar fill
      ctx.shadowColor = c; ctx.shadowBlur = 6;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.roundRect(barX, rowY+20, barW * frac, 5, 2); ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // ── Combo (below panel) ───────────────────────────────────
  if (combo > 1 && comboTimer > 0) {
    const comboFade = Math.min(1, comboTimer / 600);
    const comboY = py + panelH + 14;
    ctx.save();
    ctx.globalAlpha = comboFade;
    ctx.font = '900 20px "Courier New",monospace';
    ctx.fillStyle = T.accent; ctx.shadowColor = T.accent; ctx.shadowBlur = 14;
    ctx.textAlign = 'right';
    ctx.fillText('x' + combo + ' COMBO', px + panelW, comboY);
    ctx.restore();
  }

  ctx.restore();
}

// ── Speed bar (bottom center) ─────────────────────────────
function drawSpeedBar() {
  const bw=180, bh=7, bx=W/2-bw/2, by=H-26;
  const fill=Math.min((speedMult-DIFF.startSpeed)/4,1);
  const hue=120-fill*130;
  ctx.save();
  ctx.fillStyle='rgba(2,5,10,0.75)';
  ctx.beginPath();ctx.roundRect(bx-10,by-16,bw+20,bh+24,5);ctx.fill();
  ctx.font='700 10px "Courier New",monospace';
  ctx.fillStyle=T.accentDim;ctx.textAlign='center';
  ctx.fillText('SPEED',W/2,by-3);
  ctx.fillStyle='rgba(255,255,255,0.07)';
  ctx.beginPath();ctx.roundRect(bx,by,bw,bh,3);ctx.fill();
  if(fill>0){
    ctx.fillStyle=`hsl(${hue},80%,52%)`;
    ctx.beginPath();ctx.roundRect(bx,by,bw*fill,bh,3);ctx.fill();
  }
  ctx.restore();
}

// ── Slow-mo overlay ───────────────────────────────────────
function drawSlowMoOverlay() {
  if(activePU.SLOW<=0) return;
  const c=T.powerupColors.SLOW;
  ctx.save();
  ctx.strokeStyle=c+'44'; ctx.lineWidth=4;
  ctx.shadowColor=c; ctx.shadowBlur=12;
  ctx.strokeRect(2,2,W-4,H-4);
  ctx.shadowBlur=0;
  ctx.restore();
}

// ── Game loop ─────────────────────────────────────────────
function gameLoop(ts) {
  if(state!=='playing') return;
  animId=requestAnimationFrame(gameLoop);
  const dt=Math.min(ts-lastTime,50);
  lastTime=ts;

  // Tick power-up timers
  for(const t of POWERUP_TYPES) if(activePU[t]>0) activePU[t]=Math.max(0,activePU[t]-dt);

  // Combo timeout
  if(comboTimer>0) { comboTimer-=dt; if(comboTimer<=0) combo=0; }

  diffTick++;
  if(diffTick%DIFF.ticksPerLevel===0){ level++; speedMult+=DIFF.speedPerLevel; maxEnemy=Math.min(maxEnemy+1,32); }

  // Fire: click = single shot. RAPID active = auto-fire on hold
  if(mouseDown && activePU.RAPID>0) {
    autoFireTimer+=dt;
    if(autoFireTimer>=DIFF.autoFireMs){ fireBullet(); autoFireTimer=0; }
  } else {
    autoFireTimer=0;
  }

  if(shakeFrames>0){ shakeX=(Math.random()-0.5)*11; shakeY=(Math.random()-0.5)*11; shakeFrames--; }
  else shakeX=shakeY=0;

  ctx.fillStyle=T.bg; ctx.fillRect(0,0,W,H);
  drawGrid();
  ctx.save(); ctx.translate(shakeX,shakeY);

  if(flashAlpha>0){ ctx.fillStyle=`rgba(255,0,0,${flashAlpha})`; ctx.fillRect(0,0,W,H); flashAlpha=Math.max(0,flashAlpha-0.018); }

  for(let i=particles.length-1;i>=0;i--){ particles[i].update();particles[i].draw();if(particles[i].dead)particles.splice(i,1); }
  for(let i=scorePopups.length-1;i>=0;i--){ scorePopups[i].update();scorePopups[i].draw();if(scorePopups[i].dead)scorePopups.splice(i,1); }

  // Power-up orbs
  for(let i=powerups.length-1;i>=0;i--){ powerups[i].update();powerups[i].draw();if(powerups[i].dead)powerups.splice(i,1); }

  spawnEnemies();
  for(let i=enemies.length-1;i>=0;i--) {
    const e=enemies[i];
    e.update();
    if(e.dead){ enemies.splice(i,1); continue; }
    let killed=false;
    for(let b=bullets.length-1;b>=0;b--) {
      const bl=bullets[b];
      if((e.x-bl.x)**2+(e.y-bl.y)**2<(e.r+bl.r)**2) {
        bl.dead=true;
        spawnParticles(e.x,e.y,e.color,8);
        if(e.r<=14) {
          spawnParticles(e.x,e.y,'#ffffff',12);
          const c=registerKill(e.x,e.y);
          const pts=20*(combo>3?3:combo>1?2:1);
          score+=pts;
          scorePopups.push(new ScorePopup(e.x,e.y-e.r-8,'+'+pts+(combo>1?' x'+combo:''),T.accent));
          enemies.splice(i,1); killed=true; break;
        } else {
          e.r-=5; score+=5;
          scorePopups.push(new ScorePopup(e.x,e.y-e.r-4,'+5','#ffaa44'));
        }
      }
    }
    if(!killed) {
      if(player&&(e.x-player.x)**2+(e.y-player.y)**2<(e.r+player.r)**2) {
        if(player.hit()){ endGame(); return; }
      }
      e.draw();
    }
  }

  for(let i=bullets.length-1;i>=0;i--){ bullets[i].update();bullets[i].draw();if(bullets[i].dead)bullets.splice(i,1); }
  if(player){ player.update(dt);player.draw(); }

  ctx.restore();
  drawSlowMoOverlay();
  drawHUD();
  drawSpeedBar();
  if(score>highScore) highScore=score;
}

function endGame() {
  state='gameover';
  cancelAnimationFrame(animId);
  if(score>highScore){ highScore=score; localStorage.setItem('pewpew_hs',highScore); }
  document.getElementById('final-score').textContent=`Score: ${String(score).padStart(7,'0')}   Kills: ${kills}`;
  document.getElementById('high-score-display').textContent=`Best: ${String(highScore).padStart(7,'0')}`;
  document.getElementById('gameover').classList.remove('hidden');
}

window.init = function() {
  T=THEMES[activeTheme]; applyThemeCSS();
  state='playing'; score=0; kills=0; lives=3; level=1;
  maxEnemy=DIFF.startEnemies; speedMult=DIFF.startSpeed; diffTick=0;
  combo=0; comboTimer=0;
  angle=0; shakeFrames=0; flashAlpha=0; autoFireTimer=0; mouseDown=false;
  activePU={RAPID:0,SHIELD:0,SLOW:0};
  keys.w=keys.a=keys.s=keys.d=false;
  bullets=[];enemies=[];particles=[];scorePopups=[];powerups=[];
  player=new Player(); helpOpen=false;
  ['start','gameover','help-panel'].forEach(id=>document.getElementById(id).classList.add('hidden'));
  lastTime=performance.now();
  requestAnimationFrame(ts=>{ lastTime=ts; gameLoop(ts); });
};

// Init theme on load
applyThemeCSS();
document.querySelectorAll('.theme-btn').forEach(b=>b.classList.toggle('active',b.dataset.theme===activeTheme));
