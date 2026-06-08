import './styles.css';
import { LANES, clamp, laneFromX, rectsOverlap, scoreTick, grade, playerYForHeight } from './engine.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="game-shell">
    <canvas id="game" aria-label="صقر الطريق"></canvas>
    <div class="hud">
      <div><b id="score">0</b><span>نقطة</span></div>
      <div><b id="coins">0</b><span>عملة</span></div>
      <div><b id="combo">x1</b><span>كومبو</span></div>
    </div>
    <div class="top-ad">إعلان لاحقاً</div>
    <div class="control-hint">حرّك سيارتك: اسحب أو اضغط الأزرار</div>
    <div class="touch-controls" aria-label="أزرار التحكم">
      <button id="leftBtn" aria-label="يسار">‹</button>
      <button id="midBtn" aria-label="الوسط">●</button>
      <button id="rightBtn" aria-label="يمين">›</button>
    </div>
    <section id="start" class="overlay show">
      <div class="logo">🏎️</div>
      <h1>صقر الطريق</h1>
      <p>هذه نسخة مصححة: الشاشة ثابتة، سيارة اللاعب واضحة أسفل الطريق، والتحكم مباشر بزر يمين/يسار أو بالسحب.</p>
      <div class="cards"><span>👆 تحكم واضح</span><span>🚧 عقبات</span><span>⚡ بوست</span></div>
      <button id="play">ابدأ اللعب</button>
      <small>لا تحتاج تمرير الصفحة — اللعبة كلها داخل الشاشة</small>
    </section>
    <section id="gameover" class="overlay">
      <h2>انتهى التحدي</h2>
      <p id="final"></p>
      <button id="again">العب مرة ثانية</button>
      <button id="share">شارك نتيجتك</button>
    </section>
  </div>`;

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const coinsEl = document.querySelector('#coins');
const comboEl = document.querySelector('#combo');
const start = document.querySelector('#start');
const over = document.querySelector('#gameover');
const final = document.querySelector('#final');

let W = 0, H = 0, DPR = 1, last = 0, running = false, raf = 0, shake = 0;
let state;
let touchStartX = null;
const colors = ['#ef4444', '#f97316', '#0ea5e9', '#a855f7'];

function viewportSize() {
  const vv = window.visualViewport;
  return {
    w: Math.floor(vv?.width || window.innerWidth),
    h: Math.floor(vv?.height || window.innerHeight),
  };
}

function resize() {
  const size = viewportSize();
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = size.w;
  H = size.h;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (state) state.playerY = playerYForHeight(H);
}
addEventListener('resize', resize);
visualViewport?.addEventListener('resize', resize);
resize();

function reset() {
  state = {
    lane: 1,
    targetLane: 1,
    playerY: playerYForHeight(H),
    speed: 330,
    distance: 0,
    score: 0,
    coins: 0,
    combo: 1,
    boost: 0,
    alive: true,
    obstacles: [],
    pickups: [],
    particles: [],
    nextObstacle: 0.55,
    nextPickup: 1.1,
    roadOffset: 0,
    best: Number(localStorage.getItem('falcon-best') || 0),
  };
}

function spawnObstacle() {
  const occupied = state.obstacles.filter(o => o.y < 160).map(o => o.lane);
  let lane = Math.floor(Math.random() * 3);
  if (occupied.includes(lane)) lane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
  state.obstacles.push({ lane, y: -92, w: 52, h: 76, color: colors[Math.floor(Math.random() * colors.length)], passed: false });
}
function spawnPickup() {
  const lane = Math.floor(Math.random() * 3);
  const kind = Math.random() < 0.8 ? 'coin' : 'boost';
  state.pickups.push({ lane, y: -70, kind, r: kind === 'coin' ? 17 : 21, spin: 0 });
}
function laneX(lane) { return W * LANES[lane]; }
function playerRect() { return { x: laneX(state.lane) - 28, y: state.playerY - 41, w: 56, h: 82 }; }
function objectRect(o) { return { x: laneX(o.lane) - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h }; }

function burst(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) state.particles.push({ x, y, vx: (Math.random() - .5) * 180, vy: (Math.random() - .8) * 180, life: 0.36, color });
}

function setLane(next) {
  state.targetLane = clamp(next, 0, 2);
  if (navigator.vibrate) navigator.vibrate(14);
}

function update(dt) {
  if (!state.alive) return;
  const boostMul = state.boost > 0 ? 1.32 : 1;
  state.boost = Math.max(0, state.boost - dt);
  scoreTick(state, dt * boostMul);
  state.roadOffset += state.speed * dt * boostMul;
  state.nextObstacle -= dt;
  state.nextPickup -= dt;
  if (state.nextObstacle <= 0) { spawnObstacle(); state.nextObstacle = Math.max(.58, 1.28 - state.speed / 1200) + Math.random() * .2; }
  if (state.nextPickup <= 0) { spawnPickup(); state.nextPickup = 1.05 + Math.random() * 1.1; }
  state.lane += (state.targetLane - state.lane) * Math.min(1, dt * 15);
  const fall = state.speed * dt * boostMul;
  for (const o of state.obstacles) {
    o.y += fall;
    if (!o.passed && o.y > state.playerY + 56) {
      o.passed = true;
      state.combo = Math.min(10, state.combo + 1);
      state.score += 45 * state.combo;
    }
    if (rectsOverlap(playerRect(), objectRect(o))) {
      state.alive = false;
      shake = 14;
      burst(laneX(Math.round(state.lane)), state.playerY, '#f97316', 22);
      if (navigator.vibrate) navigator.vibrate([50, 30, 80]);
      gameOver();
    }
  }
  state.obstacles = state.obstacles.filter(o => o.y < H + 120);
  for (const p of state.pickups) {
    p.y += fall;
    p.spin += dt * 8;
    const dx = laneX(p.lane) - laneX(Math.round(state.lane));
    const dy = p.y - state.playerY;
    if (Math.abs(dx) < 50 && Math.abs(dy) < 62) {
      p.collected = true;
      if (p.kind === 'coin') { state.coins++; state.score += 130 * state.combo; burst(laneX(p.lane), p.y, '#facc15', 12); }
      else { state.boost = 2.4; state.score += 270; burst(laneX(p.lane), p.y, '#38bdf8', 16); }
    }
  }
  state.pickups = state.pickups.filter(p => !p.collected && p.y < H + 100);
  for (const pa of state.particles) { pa.life -= dt; pa.x += pa.vx * dt; pa.y += pa.vy * dt; pa.vy += 430 * dt; }
  state.particles = state.particles.filter(p => p.life > 0);
  scoreEl.textContent = state.score.toLocaleString('ar-SA');
  coinsEl.textContent = state.coins.toLocaleString('ar-SA');
  comboEl.textContent = 'x' + state.combo;
}

function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function drawRoad() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#10223e'); grad.addColorStop(1, '#07111f');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .84; }
  const roadX = W * .08, roadW = W * .84;
  ctx.fillStyle = '#111827'; roundRect(roadX, 0, roadW, H, 26); ctx.fill();
  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(roadX + 4, 0); ctx.lineTo(roadX + 4, H); ctx.moveTo(roadX + roadW - 4, 0); ctx.lineTo(roadX + roadW - 4, H); ctx.stroke();
  ctx.strokeStyle = '#ffffff35'; ctx.lineWidth = 3; ctx.setLineDash([26, 38]);
  for (const r of [0.36, 0.64]) { ctx.beginPath(); ctx.moveTo(W * r, -60 + (state.roadOffset % 92)); ctx.lineTo(W * r, H + 80); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.restore();
}
function drawCar(x, y, color, enemy = false) {
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = enemy ? '#000' : '#22c55e'; ctx.shadowBlur = enemy ? 6 : 18;
  ctx.fillStyle = color; roundRect(-28, -42, 56, 84, 14); ctx.fill();
  if (!enemy) { ctx.strokeStyle = '#fefce8'; ctx.lineWidth = 4; ctx.stroke(); }
  ctx.fillStyle = '#020617'; roundRect(-18, -24, 36, 25, 8); ctx.fill();
  ctx.fillRect(-34, -25, 7, 24); ctx.fillRect(27, -25, 7, 24); ctx.fillRect(-34, 17, 7, 24); ctx.fillRect(27, 17, 7, 24);
  if (!enemy) { ctx.fillStyle = '#facc15'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.fillText('أنت', 0, 55); }
  ctx.restore();
}
function render() {
  drawRoad();
  for (const p of state.pickups) {
    const x = laneX(p.lane); ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.spin);
    ctx.fillStyle = p.kind === 'coin' ? '#facc15' : '#38bdf8'; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0f172a'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.kind === 'coin' ? '﷼' : '⚡', 0, 1); ctx.restore();
  }
  for (const o of state.obstacles) drawCar(laneX(o.lane), o.y, o.color, true);
  drawCar(laneX(state.lane), state.playerY, state.boost > 0 ? '#38bdf8' : '#22c55e');
  for (const p of state.particles) { ctx.globalAlpha = Math.max(0, p.life * 2.4); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3 + p.life * 5, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  if (state.boost > 0) { ctx.fillStyle = '#38bdf81f'; ctx.fillRect(0, 0, W, H); }
}
function loop(t) { const dt = Math.min(.033, (t - last) / 1000 || .016); last = t; update(dt); render(); if (running) raf = requestAnimationFrame(loop); }
function startGame() { reset(); start.classList.remove('show'); over.classList.remove('show'); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
function gameOver() { running = false; cancelAnimationFrame(raf); const best = Math.max(state.best, state.score); localStorage.setItem('falcon-best', best); final.innerHTML = `${grade(state.score)}<br>نتيجتك: <b>${state.score.toLocaleString('ar-SA')}</b> نقطة<br>أفضل نتيجة: ${best.toLocaleString('ar-SA')}<br>العملات: ${state.coins}`; setTimeout(() => over.classList.add('show'), 450); }
function moveToClientX(x) { setLane(laneFromX(x, W)); }
canvas.addEventListener('pointerdown', e => { touchStartX = e.clientX; if (running) moveToClientX(e.clientX); });
canvas.addEventListener('pointermove', e => { if (running && e.isPrimary) moveToClientX(e.clientX); });
canvas.addEventListener('touchend', e => {
  if (!running || touchStartX === null) return;
  const changed = e.changedTouches[0];
  const dx = changed.clientX - touchStartX;
  if (Math.abs(dx) > 28) setLane(state.targetLane + (dx > 0 ? 1 : -1));
  touchStartX = null;
}, { passive: true });
addEventListener('keydown', e => { if (!running) return; if (e.key === 'ArrowLeft') setLane(state.targetLane - 1); if (e.key === 'ArrowRight') setLane(state.targetLane + 1); });
document.querySelector('#leftBtn').addEventListener('click', () => running && setLane(state.targetLane - 1));
document.querySelector('#midBtn').addEventListener('click', () => running && setLane(1));
document.querySelector('#rightBtn').addEventListener('click', () => running && setLane(state.targetLane + 1));
document.querySelector('#play').addEventListener('click', startGame);
document.querySelector('#again').addEventListener('click', startGame);
document.querySelector('#share').addEventListener('click', async () => {
  const url = 'https://azoz055.github.io/saudi-word-challenge/';
  const text = `جبت ${state.score} نقطة في صقر الطريق 🦅 تقدر تهزمني؟ ${url}`;
  if (navigator.share) { try { await navigator.share({ title: 'صقر الطريق', text, url }); return; } catch {} }
  await navigator.clipboard.writeText(text);
  document.querySelector('#share').textContent = 'تم نسخ التحدي';
});
reset(); render();
