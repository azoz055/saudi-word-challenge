import './styles.css';
import { LANES, clamp, laneFromX, rectsOverlap, scoreTick, grade, playerYForHeight, currentMission, missionProgress, isMissionComplete, applyCollision, completeMission } from './engine.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="game-shell">
    <canvas id="game" aria-label="مطاردة صقر الطريق"></canvas>
    <div class="hud">
      <div><b id="score">0</b><span>نقطة</span></div>
      <div><b id="hearts">♥♥♥</b><span>صحة</span></div>
      <div><b id="combo">x1</b><span>كومبو</span></div>
    </div>
    <div class="mission-card"><strong id="city">الرياض</strong><span id="mission">اجمع 6 عملات</span><meter id="missionMeter" value="0" max="1"></meter></div>
    <div class="bars">
      <label>مطاردة الشرطة <meter id="chase" value="0" max="100"></meter></label>
      <label>نيترو <meter id="nitroMeter" value="45" max="100"></meter></label>
    </div>
    <div class="toast" id="toast">جاهز؟</div>
    <div class="touch-controls" aria-label="أزرار التحكم">
      <button id="leftBtn" aria-label="يسار">‹</button>
      <button id="nitroBtn" class="nitro" aria-label="نيترو">نيترو</button>
      <button id="rightBtn" aria-label="يمين">›</button>
    </div>
    <section id="start" class="overlay show">
      <div class="logo">🚓🏎️</div>
      <h1>مطاردة صقر الطريق</h1>
      <p>اهرب من الشرطة، أنجز مهمة كل مدينة، اجمع عملات ونيترو، ولا تخلي مؤشر المطاردة يوصل 100.</p>
      <div class="cards"><span>🚓 شرطة تطاردك</span><span>🎯 مهمات</span><span>⚡ نيترو</span><span>🛡️ درع</span></div>
      <button id="play">ابدأ المطاردة</button>
      <small>يمين/يسار للتفادي — نيترو وقت الزحمة — الجولة قصيرة وسريعة</small>
    </section>
    <section id="gameover" class="overlay">
      <h2>انتهت المطاردة</h2>
      <p id="final"></p>
      <button id="again">العب مرة ثانية</button>
      <button id="share">شارك نتيجتك</button>
    </section>
  </div>`;

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const heartsEl = document.querySelector('#hearts');
const comboEl = document.querySelector('#combo');
const cityEl = document.querySelector('#city');
const missionEl = document.querySelector('#mission');
const missionMeter = document.querySelector('#missionMeter');
const chaseMeter = document.querySelector('#chase');
const nitroMeter = document.querySelector('#nitroMeter');
const toastEl = document.querySelector('#toast');
const start = document.querySelector('#start');
const over = document.querySelector('#gameover');
const final = document.querySelector('#final');

let W = 0, H = 0, DPR = 1, last = 0, running = false, raf = 0, shake = 0;
let state;
let touchStartX = null;
const enemyColors = ['#ef4444', '#f97316', '#0ea5e9', '#a855f7', '#f43f5e'];
const pickupTypes = ['coin','coin','coin','nitro','shield'];

function viewportSize() {
  const vv = window.visualViewport;
  return { w: Math.floor(vv?.width || window.innerWidth), h: Math.floor(vv?.height || window.innerHeight) };
}
function resize() {
  const size = viewportSize();
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = size.w; H = size.h;
  canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (state) state.playerY = playerYForHeight(H);
}
addEventListener('resize', resize); visualViewport?.addEventListener('resize', resize); resize();

function reset() {
  state = {
    lane: 1, targetLane: 1, playerY: playerYForHeight(H), speed: 335, distance: 0, score: 0,
    health: 3, combo: 1, boost: 0, nitro: 45, shield: 0, chase: 18, level: 0,
    missionCoins: 0, missionNitro: 0, missionDistance: 0, alive: true,
    obstacles: [], pickups: [], gates: [], particles: [], sparks: [], nextObstacle: .75, nextPickup: .9, nextGate: 12,
    roadOffset: 0, best: Number(localStorage.getItem('falcon-best') || 0), nitroPressed: false
  };
  toast('مهمة الرياض بدأت');
}
function toast(text) { toastEl.textContent = text; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 1200); }
function laneX(lane) { return W * LANES[lane]; }
function playerRect() { return { x: laneX(state.lane) - 27, y: state.playerY - 40, w: 54, h: 80 }; }
function objectRect(o) { return { x: laneX(o.lane) - o.w / 2, y: o.y - o.h / 2, w: o.w, h: o.h }; }
function burst(x, y, color, count = 12) { for (let i=0;i<count;i++) state.particles.push({x,y,vx:(Math.random()-.5)*220,vy:(Math.random()-.8)*220,life:.42,color}); }
function sparkLane(lane, text, color='#facc15') { state.sparks.push({x: laneX(lane), y: state.playerY-72, text, color, life: .9}); }

function spawnObstacle() {
  const lane = Math.floor(Math.random()*3);
  const roll = Math.random();
  const type = roll < .72 ? 'car' : roll < .9 ? 'barricade' : 'oil';
  const w = type === 'barricade' ? 82 : 54;
  const h = type === 'oil' ? 34 : 76;
  state.obstacles.push({ lane, type, y: -90, w, h, color: enemyColors[Math.floor(Math.random()*enemyColors.length)], passed: false });
}
function spawnPickup() {
  const lane = Math.floor(Math.random()*3);
  const kind = pickupTypes[Math.floor(Math.random()*pickupTypes.length)];
  state.pickups.push({ lane, kind, y: -68, r: kind === 'coin' ? 17 : 21, spin: 0 });
}
function spawnGate() { state.gates.push({ y: -80, checked: false }); }
function setLane(next) { state.targetLane = clamp(next, 0, 2); navigator.vibrate?.(12); }
function useNitro() {
  if (!running || state.nitro < 18) return;
  state.boost = .9; state.nitro -= 18; state.missionNitro += 1; state.score += 160; burst(laneX(Math.round(state.lane)), state.playerY+25, '#38bdf8', 16); toast('نيترو!'); navigator.vibrate?.(25);
}

function update(dt) {
  if (!state.alive) return;
  const boostMul = state.boost > 0 ? 1.55 : 1;
  state.boost = Math.max(0, state.boost - dt);
  scoreTick(state, dt, boostMul);
  state.nitro = clamp(state.nitro + dt * 2.8, 0, 100);
  state.roadOffset += state.speed * dt * boostMul;
  state.nextObstacle -= dt; state.nextPickup -= dt; state.nextGate -= dt;
  if (state.nextObstacle <= 0) { spawnObstacle(); state.nextObstacle = Math.max(.46, 1.12 - state.speed/1300 - state.level*.025) + Math.random()*.2; }
  if (state.nextPickup <= 0) { spawnPickup(); state.nextPickup = .82 + Math.random()*.85; }
  if (state.nextGate <= 0) { spawnGate(); state.nextGate = 13 + Math.random()*3; }
  state.lane += (state.targetLane - state.lane) * Math.min(1, dt*15);
  const fall = state.speed * dt * boostMul;
  for (const o of state.obstacles) {
    o.y += fall;
    if (!o.passed && o.y > state.playerY + 54) { o.passed = true; state.combo = Math.min(12, state.combo + 1); state.score += 55 * state.combo; if(state.combo % 4 === 0) sparkLane(o.lane, 'كومبو x'+state.combo, '#bbf7d0'); }
    if (rectsOverlap(playerRect(), objectRect(o))) {
      o.hit = true; shake = 15; burst(laneX(Math.round(state.lane)), state.playerY, '#fb7185', 22);
      const outcome = applyCollision(state, o.type === 'oil' ? 0.5 : 1);
      if (outcome === 'shield') { sparkLane(Math.round(state.lane), 'درع!', '#38bdf8'); }
      else if (outcome === 'gameover') { gameOver(); return; }
      else { toast('انتبه! الشرطة قربت'); navigator.vibrate?.([40,20,40]); }
    }
  }
  state.obstacles = state.obstacles.filter(o => !o.hit && o.y < H + 120);
  for (const p of state.pickups) {
    p.y += fall; p.spin += dt*8;
    const dx = laneX(p.lane) - laneX(Math.round(state.lane)); const dy = p.y - state.playerY;
    if (Math.abs(dx) < 52 && Math.abs(dy) < 64) {
      p.collected = true;
      if (p.kind === 'coin') { state.missionCoins++; state.score += 150 * state.combo; burst(laneX(p.lane), p.y, '#facc15', 12); sparkLane(p.lane, '+عملة'); }
      if (p.kind === 'nitro') { state.nitro = clamp(state.nitro+34,0,100); state.score += 220; burst(laneX(p.lane), p.y, '#38bdf8', 14); sparkLane(p.lane, '+نيترو','#38bdf8'); }
      if (p.kind === 'shield') { state.shield = 1; state.score += 180; burst(laneX(p.lane), p.y, '#a78bfa', 14); sparkLane(p.lane, 'درع','#c4b5fd'); }
    }
  }
  state.pickups = state.pickups.filter(p => !p.collected && p.y < H + 100);
  for (const g of state.gates) {
    g.y += fall;
    if (!g.checked && g.y > state.playerY - 20) {
      g.checked = true;
      const ok = completeMission(state);
      if (ok) { burst(W/2, state.playerY-90, '#22c55e', 30); toast('نجحت المهمة! مدينة جديدة'); }
      else { shake = 10; toast('فشلت المهمة — الشرطة قربت'); if (state.chase >= 100) { gameOver(); return; } }
    }
  }
  state.gates = state.gates.filter(g => g.y < H + 90);
  for (const pa of state.particles) { pa.life-=dt; pa.x+=pa.vx*dt; pa.y+=pa.vy*dt; pa.vy+=430*dt; }
  for (const s of state.sparks) { s.life-=dt; s.y-=40*dt; }
  state.particles = state.particles.filter(p=>p.life>0); state.sparks = state.sparks.filter(s=>s.life>0);
  if (state.chase >= 100 || state.health <= 0) { gameOver(); return; }
  updateHud();
}
function updateHud() {
  const m = currentMission(state.level); const progress = missionProgress(state);
  scoreEl.textContent = state.score.toLocaleString('ar-SA');
  heartsEl.textContent = '♥'.repeat(Math.ceil(state.health)) + '♡'.repeat(Math.max(0, 3-Math.ceil(state.health)));
  comboEl.textContent = 'x' + state.combo;
  cityEl.textContent = m.city;
  missionEl.textContent = `${m.title} (${Math.min(progress, m.target).toLocaleString('ar-SA')}/${m.target.toLocaleString('ar-SA')})`;
  missionMeter.value = Math.min(1, progress / m.target);
  chaseMeter.value = state.chase; nitroMeter.value = state.nitro;
  document.body.classList.toggle('danger', state.chase > 72);
  document.body.classList.toggle('boosting', state.boost > 0);
  document.body.classList.toggle('shielded', state.shield > 0);
}

function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x,y,w,h,r) : ctx.rect(x,y,w,h); }
function drawRoad(){
  const sky = ctx.createLinearGradient(0,0,0,H); sky.addColorStop(0,'#1e293b'); sky.addColorStop(.5,'#0f172a'); sky.addColorStop(1,'#020617'); ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
  ctx.save(); if(shake>0){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake); shake*=.84;}
  const roadX=W*.07, roadW=W*.86; ctx.fillStyle='#111827'; roundRect(roadX,0,roadW,H,28); ctx.fill();
  ctx.fillStyle='#f59e0b22'; for(let i=0;i<5;i++){ const y=(state.roadOffset*.38+i*170)% (H+170)-170; ctx.fillRect(roadX-18,y,12,90); ctx.fillRect(roadX+roadW+6,y+50,12,90); }
  ctx.strokeStyle=state.boost>0?'#38bdf8':'#22c55e'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(roadX+4,0); ctx.lineTo(roadX+4,H); ctx.moveTo(roadX+roadW-4,0); ctx.lineTo(roadX+roadW-4,H); ctx.stroke();
  ctx.strokeStyle='#ffffff38'; ctx.lineWidth=3; ctx.setLineDash([24,34]);
  for(const r of [.36,.64]){ctx.beginPath();ctx.moveTo(W*r,-80+(state.roadOffset%92));ctx.lineTo(W*r,H+80);ctx.stroke();}
  ctx.setLineDash([]); ctx.restore();
}
function drawCar(x,y,color,enemy=false,label=''){
  ctx.save(); ctx.translate(x,y); ctx.shadowColor=enemy?'#000':(state.shield>0?'#c4b5fd':'#22c55e'); ctx.shadowBlur=enemy?6:20;
  ctx.fillStyle=color; roundRect(-28,-42,56,84,14); ctx.fill();
  if(!enemy){ ctx.strokeStyle=state.shield>0?'#c4b5fd':'#fefce8'; ctx.lineWidth=4; ctx.stroke(); }
  ctx.fillStyle='#020617'; roundRect(-18,-24,36,25,8); ctx.fill(); ctx.fillRect(-34,-25,7,24); ctx.fillRect(27,-25,7,24); ctx.fillRect(-34,17,7,24); ctx.fillRect(27,17,7,24);
  if(label){ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(label,0,57);} ctx.restore();
}
function drawObstacle(o){ if(o.type==='oil'){ ctx.fillStyle='#020617cc'; ctx.beginPath(); ctx.ellipse(laneX(o.lane),o.y,38,18,0,0,Math.PI*2); ctx.fill(); return; } if(o.type==='barricade'){ ctx.save(); ctx.translate(laneX(o.lane),o.y); ctx.fillStyle='#f97316'; roundRect(-42,-20,84,40,8); ctx.fill(); ctx.fillStyle='#fff'; for(let x=-32;x<34;x+=24){ctx.fillRect(x,-18,10,36);} ctx.restore(); return; } drawCar(laneX(o.lane),o.y,o.color,true); }
function render(){
  drawRoad();
  for(const g of state.gates){ ctx.save(); ctx.globalAlpha=.92; ctx.fillStyle=isMissionComplete(state)?'#22c55e99':'#f9731699'; roundRect(W*.12,g.y-22,W*.76,44,18); ctx.fill(); ctx.fillStyle='#fff'; ctx.font='bold 18px Arial'; ctx.textAlign='center'; ctx.fillText(isMissionComplete(state)?'بوابة نجاح':'بوابة مهمة', W/2, g.y+6); ctx.restore(); }
  for(const p of state.pickups){ const x=laneX(p.lane); ctx.save(); ctx.translate(x,p.y); ctx.rotate(p.spin); ctx.shadowBlur=18; ctx.shadowColor=p.kind==='coin'?'#facc15':p.kind==='nitro'?'#38bdf8':'#c4b5fd'; ctx.fillStyle=ctx.shadowColor; ctx.beginPath(); ctx.arc(0,0,p.r,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#0f172a'; ctx.font='bold 18px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(p.kind==='coin'?'﷼':p.kind==='nitro'?'⚡':'🛡',0,1); ctx.restore(); }
  for(const o of state.obstacles) drawObstacle(o);
  const policeY = H + 38 - state.chase * 1.45; drawCar(laneX(1), policeY, '#1d4ed8', true, 'شرطة');
  drawCar(laneX(state.lane), state.playerY, state.boost>0?'#38bdf8':'#22c55e', false, 'أنت');
  for(const s of state.sparks){ctx.globalAlpha=Math.max(0,s.life); ctx.fillStyle=s.color; ctx.font='bold 18px Arial'; ctx.textAlign='center'; ctx.fillText(s.text,s.x,s.y); ctx.globalAlpha=1;}
  for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life*2.4); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,3+p.life*6,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;}
  if(state.boost>0){ctx.fillStyle='#38bdf81f';ctx.fillRect(0,0,W,H);} if(state.chase>72){ctx.fillStyle='#ef44441a';ctx.fillRect(0,0,W,H);} 
}
function loop(t){ const dt=Math.min(.033,(t-last)/1000||.016); last=t; update(dt); render(); if(running) raf=requestAnimationFrame(loop); }
function startGame(){ reset(); updateHud(); start.classList.remove('show'); over.classList.remove('show'); running=true; last=performance.now(); cancelAnimationFrame(raf); raf=requestAnimationFrame(loop); }
function gameOver(){ state.alive=false; running=false; cancelAnimationFrame(raf); const best=Math.max(state.best,state.score); localStorage.setItem('falcon-best',best); final.innerHTML=`${grade(state.score)}<br>نتيجتك: <b>${state.score.toLocaleString('ar-SA')}</b><br>وصلت: ${currentMission(state.level).city}<br>أفضل نتيجة: ${best.toLocaleString('ar-SA')}`; setTimeout(()=>over.classList.add('show'),420); }
function moveToClientX(x){ setLane(laneFromX(x,W)); }
canvas.addEventListener('pointerdown', e=>{ touchStartX=e.clientX; if(running) moveToClientX(e.clientX); });
canvas.addEventListener('pointermove', e=>{ if(running && e.isPrimary) moveToClientX(e.clientX); });
canvas.addEventListener('touchend', e=>{ if(!running||touchStartX===null)return; const dx=e.changedTouches[0].clientX-touchStartX; if(Math.abs(dx)>28)setLane(state.targetLane+(dx>0?1:-1)); touchStartX=null; }, {passive:true});
addEventListener('keydown', e=>{ if(!running)return; if(e.key==='ArrowLeft')setLane(state.targetLane-1); if(e.key==='ArrowRight')setLane(state.targetLane+1); if(e.key===' ')useNitro(); });
document.querySelector('#leftBtn').addEventListener('click',()=>running&&setLane(state.targetLane-1));
document.querySelector('#rightBtn').addEventListener('click',()=>running&&setLane(state.targetLane+1));
document.querySelector('#nitroBtn').addEventListener('click',useNitro);
document.querySelector('#play').addEventListener('click',startGame);
document.querySelector('#again').addEventListener('click',startGame);
document.querySelector('#share').addEventListener('click',async()=>{const url='https://azoz055.github.io/saudi-word-challenge/'; const text=`جبت ${state.score} في مطاردة صقر الطريق 🚓🏎️ تقدر تهرب أكثر؟ ${url}`; if(navigator.share){try{await navigator.share({title:'مطاردة صقر الطريق',text,url});return;}catch{}} await navigator.clipboard.writeText(text); document.querySelector('#share').textContent='تم نسخ التحدي';});
reset(); updateHud(); render();
