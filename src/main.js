import './styles.css';
import { PUZZLES, getDailyPuzzle, isValidGuess, normalizeArabic } from './puzzles.js';

const repoUrl = 'https://azoz055.github.io/saudi-word-challenge/';
let puzzle = getDailyPuzzle();
let found = loadProgress(puzzle);
let input = '';
let combo = 0;

function keyFor(p) { return 'swc:' + p.theme + ':' + p.letters.join(''); }
function loadProgress(p) { try { return new Set(JSON.parse(localStorage.getItem(keyFor(p)) || '[]')); } catch { return new Set(); } }
function saveProgress() { localStorage.setItem(keyFor(puzzle), JSON.stringify([...found])); }
function score() { return [...found].reduce((sum, w) => sum + Math.max(10, normalizeArabic(w).length * 7), 0) + combo * 3; }
function rank() { const pct = found.size / puzzle.words.length; if (pct === 1) return 'أسطورة الكلمات'; if (pct >= .75) return 'خبير تحديات'; if (pct >= .45) return 'لاعب قوي'; return 'بداية موفقة'; }

function render() {
  const pct = Math.round(found.size / puzzle.words.length * 100);
  document.querySelector('#app').innerHTML = `
    <main class="shell">
      <section class="hero">
        <div class="brand">🇸🇦 تحدي كلمات السعودية</div>
        <h1>كوّن كلمات من الحروف وتحدى أصحابك</h1>
        <p>لغز عربي خفيف للجوال. العب يومياً، ارفع نتيجتك، وشارك التحدي.</p>
        <div class="daily-chip">موضوع اليوم: <b>${puzzle.theme}</b></div>
      </section>

      <section class="ad-slot top" aria-label="ad placeholder"><span>مساحة إعلان مستقبلية</span></section>

      <section class="game-card">
        <div class="stats">
          <div><strong>${score()}</strong><span>نقطة</span></div>
          <div><strong>${found.size}/${puzzle.words.length}</strong><span>كلمة</span></div>
          <div><strong>${pct}%</strong><span>إنجاز</span></div>
        </div>
        <div class="progress"><i style="width:${pct}%"></i></div>
        <div class="input" id="wordInput">${input || 'اضغط الحروف'}</div>
        <div class="letters">
          ${puzzle.letters.map((l, i) => `<button class="letter ${l === puzzle.center ? 'center' : ''}" data-letter="${l}">${l}</button>`).join('')}
        </div>
        <div class="actions">
          <button id="submit">تحقق</button>
          <button id="back">حذف</button>
          <button id="shuffle">خلط</button>
          <button id="random">لغز عشوائي</button>
        </div>
        <div id="toast" class="toast"></div>
      </section>

      <section class="found-card">
        <div class="found-head"><h2>كلماتك</h2><span>${rank()}</span></div>
        <div class="found-list">${[...found].sort((a,b)=>b.length-a.length).map(w => `<b>${w}</b>`).join('') || '<em>ابدأ بأول كلمة...</em>'}</div>
        <button class="share" id="share">شارك نتيجتك</button>
      </section>

      <section class="content">
        <h2>كيف تلعب؟</h2>
        <p>اختر الحروف لتكوين كلمة. يجب أن تحتوي الكلمة على الحرف الذهبي. كلما وجدت كلمات أكثر ارتفعت نتيجتك.</p>
        <h2>ليش اللعبة؟</h2>
        <p>تحدي سريع ومناسب للمشاركة في واتساب وإكس. كل يوم لغز جديد بطابع سعودي وعربي.</p>
      </section>

      <footer>
        <a href="./privacy.html">سياسة الخصوصية</a>
        <span>جاهزة لإضافة AdSense بعد ربط حساب الإعلانات</span>
      </footer>
    </main>`;

  document.querySelectorAll('.letter').forEach(btn => btn.addEventListener('click', () => { input += btn.dataset.letter; render(); }));
  document.querySelector('#submit').addEventListener('click', submitGuess);
  document.querySelector('#back').addEventListener('click', () => { input = input.slice(0, -1); render(); });
  document.querySelector('#shuffle').addEventListener('click', () => { puzzle.letters.sort(() => Math.random() - .5); render(); });
  document.querySelector('#random').addEventListener('click', () => { puzzle = PUZZLES[Math.floor(Math.random()*PUZZLES.length)]; found = loadProgress(puzzle); input = ''; render(); });
  document.querySelector('#share').addEventListener('click', shareScore);
}

function flash(msg, good=false) {
  const t = document.querySelector('#toast');
  t.textContent = msg;
  t.className = 'toast show ' + (good ? 'good' : 'bad');
  setTimeout(() => t.className = 'toast', 1200);
}

function submitGuess() {
  const valid = isValidGuess(input, puzzle);
  const normalized = normalizeArabic(input);
  if (!valid.ok) return flash(valid.reason);
  if (found.has(normalized)) return flash('موجودة قبل');
  found.add(normalized);
  combo += 1;
  saveProgress();
  input = '';
  render();
  flash('ممتاز! +' + (combo * 3), true);
}

async function shareScore() {
  const text = `جبت ${score()} نقطة ووجدت ${found.size}/${puzzle.words.length} في تحدي كلمات السعودية 🇸🇦
تقدر تهزمني؟ ${repoUrl}`;
  if (navigator.share) {
    try { await navigator.share({ title:'تحدي كلمات السعودية', text, url: repoUrl }); return; } catch {}
  }
  await navigator.clipboard.writeText(text);
  flash('تم نسخ رابط التحدي', true);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitGuess();
  if (e.key === 'Backspace') { input = input.slice(0,-1); render(); }
});

render();
