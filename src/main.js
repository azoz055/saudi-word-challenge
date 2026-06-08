import './styles.css';
import { LANES, clamp, laneFromX, rectsOverlap, scoreTick, grade } from './engine.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <div class="game-shell">
    <canvas id="game" aria-label="صقر الطريق"></canvas>
    <div class="hud">
      <div><b id="score">0</b><span>نقطة</span></div>
      <div><b id="coins">0</b><span>عملة</span></div>
      <div><b id="combo">x1</b><span>كومبو</span></div>
    </div>
    <div class="top-ad">مساحة إعلان مستقبلية</div>
    <section id="start" class="overlay show">
      <div class="logo">🦅</div>
      <h1>صقر الطريق</h1>
      <p>اسحب يمين ويسار، تفادى الزحام، اجمع العملات، وخذ البوست قبل ما يلحقك الطريق.</p>
      <div class="cards"><span>⚡ بوست</span><span>🪙 عملات</span><span>🔥 كومبو</span></div>
      <button id="play">ابدأ التحدي</button>
      <small>لعبة ويب للجوال بدون تحميل — شارك نتيجتك وتحدى أصحابك</small>
    </section>
    <section id="gameover" class="overlay">
      <h2>انتهى التحدي</h2>
      <p id="final"></p>
      <button id="again">العب مرة ثانية</button>
      <button id="share">شارك نتيجتك</button>
    </section>
  </div>
  <section class="seo-copy">
    <h2>لعبة سرعة عربية للجوال</h2>
    <p>صقر الطريق لعبة أركيد سعودية سريعة، مصممة للجولات القصيرة والمشاركة. الهدف بسيط: اصمد أطول، اجمع أكثر، واهزم نتيجة أصحابك.</p>
    <a href="./privacy.html">سياسة الخصوصية</a>
  </section>`;

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const scoreEl = document.querySelector('#score');
const coinsEl = document.querySelector('#coins');
const comboEl = document.querySelector('#combo');
const start = document.querySelector('#start');
const over = document.querySelector('#gameover');
const final = document.querySelector('#final');

let W=0,H=0,DPR=1,last=0, running=false, raf=0, shake=0;
let state;
const colors = ['#ef4444','#f97316','#0ea5e9','#a855f7'];

function resize(){
  DPR = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.floor(W*DPR); canvas.height = Math.floor(H*DPR);
  canvas.style.width = W+'px'; canvas.style.height = H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
addEventListener('resize', resize); resize();

function reset(){
  state = {
    lane:1, targetLane:1, playerY:H*0.76, speed:390, distance:0, score:0, coins:0,
    combo:1, boost:0, alive:true, obstacles:[], pickups:[], particles:[], nextObstacle:0, nextPickup:1.4,
    roadOffset:0, best:Number(localStorage.getItem('falcon-best')||0)
  };
}

function spawnObstacle(){
  const lane = Math.floor(Math.random()*3);
  state.obstacles.push({lane, y:-120, w:54, h:82, color:colors[Math.floor(Math.random()*colors.length)], passed:false, wobble:Math.random()*10});
}
function spawnPickup(){
  const lane = Math.floor(Math.random()*3);
  const kind = Math.random()<0.78?'coin':'boost';
  state.pickups.push({lane, y:-80, kind, r:kind==='coin'?16:20, spin:0});
}
function laneX(lane){ return W*LANES[lane]; }
function playerRect(){ return {x:laneX(state.lane)-25, y:state.playerY-34, w:50, h:68}; }
function objectRect(o){ return {x:laneX(o.lane)-o.w/2, y:o.y-o.h/2, w:o.w, h:o.h}; }

function burst(x,y,color,count=14){
  for(let i=0;i<count;i++) state.particles.push({x,y,vx:(Math.random()-.5)*260,vy:(Math.random()-.8)*260,life:0.55,color});
}

function update(dt){
  if(!state.alive) return;
  const boostMul = state.boost>0 ? 1.38 : 1;
  state.boost = Math.max(0, state.boost-dt);
  scoreTick(state, dt*boostMul);
  state.roadOffset += state.speed*dt*boostMul;
  state.nextObstacle -= dt;
  state.nextPickup -= dt;
  if(state.nextObstacle<=0){ spawnObstacle(); state.nextObstacle = Math.max(.42, 1.12 - state.speed/1250) + Math.random()*.24; }
  if(state.nextPickup<=0){ spawnPickup(); state.nextPickup = .9 + Math.random()*1.05; }
  state.lane += (state.targetLane-state.lane)*Math.min(1,dt*12);
  const fall = state.speed*dt*boostMul;
  for(const o of state.obstacles){
    o.y += fall; o.wobble += dt*7;
    if(!o.passed && o.y > state.playerY+50){
      o.passed = true; state.combo = Math.min(12,state.combo+1); state.score += 35*state.combo; burst(laneX(o.lane), state.playerY-10, '#22c55e', 5);
    }
    if(rectsOverlap(playerRect(), objectRect(o))){
      state.alive=false; shake=18; burst(laneX(Math.round(state.lane)), state.playerY, '#f97316', 34); gameOver();
    }
  }
  state.obstacles = state.obstacles.filter(o=>o.y < H+140);
  for(const p of state.pickups){
    p.y += fall; p.spin += dt*8;
    const dx = laneX(p.lane)-laneX(Math.round(state.lane));
    const dy = p.y-state.playerY;
    if(Math.abs(dx)<48 && Math.abs(dy)<58){
      p.collected=true;
      if(p.kind==='coin'){ state.coins++; state.score += 120*state.combo; burst(laneX(p.lane), p.y, '#facc15', 18); }
      else { state.boost = 2.6; state.score += 250; burst(laneX(p.lane), p.y, '#38bdf8', 26); }
    }
  }
  state.pickups = state.pickups.filter(p=>!p.collected && p.y < H+100);
  for(const pa of state.particles){ pa.life-=dt; pa.x+=pa.vx*dt; pa.y+=pa.vy*dt; pa.vy+=520*dt; }
  state.particles = state.particles.filter(p=>p.life>0);
  scoreEl.textContent = state.score.toLocaleString('ar-SA');
  coinsEl.textContent = state.coins.toLocaleString('ar-SA');
  comboEl.textContent = 'x'+state.combo;
}

function drawRoad(){
  const grad=ctx.createLinearGradient(0,0,0,H); grad.addColorStop(0,'#10223e'); grad.addColorStop(1,'#07111f');
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  ctx.save();
  if(shake>0){ ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake); shake*=.86; }
  ctx.fillStyle='#111827';
  roundRect(W*.1, -40, W*.8, H+80, 34); ctx.fill();
  ctx.strokeStyle='#ffffff22'; ctx.lineWidth=2;
  for(const r of [0.36,0.64]){
    for(let y=-80 + (state.roadOffset%96); y<H+80; y+=96){ ctx.setLineDash([32,28]); ctx.beginPath(); ctx.moveTo(W*r,y); ctx.lineTo(W*r,y+48); ctx.stroke(); }
  }
  ctx.setLineDash([]); ctx.strokeStyle= state.boost>0 ? '#38bdf8' : '#22c55e'; ctx.lineWidth=5;
  ctx.beginPath(); ctx.moveTo(W*.11,0); ctx.lineTo(W*.11,H); ctx.moveTo(W*.89,0); ctx.lineTo(W*.89,H); ctx.stroke();
  ctx.restore();
}
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x,y,w,h,r) : ctx.rect(x,y,w,h); }
function drawCar(x,y,color,enemy=false){
  ctx.save(); ctx.translate(x,y);
  ctx.fillStyle=color; roundRect(-27,-42,54,84,14); ctx.fill();
  ctx.fillStyle=enemy?'#020617':'#fef3c7'; roundRect(-18,-25,36,24,8); ctx.fill();
  ctx.fillStyle='#020617'; ctx.fillRect(-33,-25,7,24); ctx.fillRect(26,-25,7,24); ctx.fillRect(-33,18,7,24); ctx.fillRect(26,18,7,24);
  if(!enemy){ ctx.fillStyle='#facc15'; ctx.beginPath(); ctx.moveTo(0,-56); ctx.lineTo(15,-32); ctx.lineTo(-15,-32); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function render(){
  drawRoad();
  for(const p of state.pickups){
    const x=laneX(p.lane); ctx.save(); ctx.translate(x,p.y); ctx.rotate(p.spin);
    ctx.fillStyle=p.kind==='coin'?'#facc15':'#38bdf8'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.arc(0,0,p.r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#0f172a'; ctx.font='bold 18px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(p.kind==='coin'?'﷼':'⚡',0,1); ctx.restore();
  }
  for(const o of state.obstacles) drawCar(laneX(o.lane)+Math.sin(o.wobble)*3,o.y,o.color,true);
  drawCar(laneX(state.lane), state.playerY, state.boost>0?'#38bdf8':'#22c55e');
  for(const p of state.particles){ ctx.globalAlpha=Math.max(0,p.life*1.8); ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,4+p.life*7,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
  if(state.boost>0){ ctx.fillStyle='#38bdf822'; ctx.fillRect(0,0,W,H); }
}
function loop(t){ const dt=Math.min(.033,(t-last)/1000||.016); last=t; update(dt); render(); if(running) raf=requestAnimationFrame(loop); }
function startGame(){ reset(); start.classList.remove('show'); over.classList.remove('show'); running=true; last=performance.now(); cancelAnimationFrame(raf); raf=requestAnimationFrame(loop); }
function gameOver(){ running=false; cancelAnimationFrame(raf); const best=Math.max(state.best,state.score); localStorage.setItem('falcon-best', best); final.innerHTML=`${grade(state.score)}<br>نتيجتك: <b>${state.score.toLocaleString('ar-SA')}</b> نقطة<br>أفضل نتيجة: ${best.toLocaleString('ar-SA')}<br>العملات: ${state.coins}`; setTimeout(()=>over.classList.add('show'),450); }
function moveToClientX(x){ state.targetLane=laneFromX(x,W); }
canvas.addEventListener('pointerdown', e=>{ if(running) moveToClientX(e.clientX); });
canvas.addEventListener('pointermove', e=>{ if(running && e.pressure>0) moveToClientX(e.clientX); });
addEventListener('keydown', e=>{ if(!running) return; if(e.key==='ArrowLeft') state.targetLane=clamp(state.targetLane-1,0,2); if(e.key==='ArrowRight') state.targetLane=clamp(state.targetLane+1,0,2); });
document.querySelector('#play').addEventListener('click', startGame);
document.querySelector('#again').addEventListener('click', startGame);
document.querySelector('#share').addEventListener('click', async()=>{
  const url='https://azoz055.github.io/saudi-word-challenge/';
  const text=`جبت ${state.score} نقطة في صقر الطريق 🦅 تقدر تهزمني؟ ${url}`;
  if(navigator.share){ try{ await navigator.share({title:'صقر الطريق',text,url}); return; }catch{} }
  await navigator.clipboard.writeText(text);
  document.querySelector('#share').textContent='تم نسخ التحدي';
});
reset(); render();
