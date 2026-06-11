import './styles.css';
import { companies as fallbackCompanies, newsItems, socialSignals, defaultHoldings } from './marketData.js';
import { SAR, NUM, rankOpportunities, calculatePortfolio, marketSessionStatus, summarizeMarket } from './financeEngine.js';

const app = document.querySelector('#app');
let companies = fallbackCompanies;
let opportunities = rankOpportunities(companies);
let selectedSymbol = opportunities[0]?.symbol;
let portfolioHoldings = loadHoldings();
let activeTab = 'dashboard';
let lastRefresh = new Date();

function loadHoldings() {
  try { return JSON.parse(localStorage.getItem('saudi-stock-holdings')) || defaultHoldings; }
  catch { return defaultHoldings; }
}
function saveHoldings() {
  localStorage.setItem('saudi-stock-holdings', JSON.stringify(portfolioHoldings));
}

async function loadLiveSnapshot() {
  try {
    const response = await fetch('./data/market.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('no snapshot');
    const data = await response.json();
    if (Array.isArray(data.companies) && data.companies.length >= 10) {
      const map = new Map(fallbackCompanies.map((c) => [c.symbol, c]));
      companies = data.companies.map((live) => ({ ...(map.get(live.symbol) || {}), ...live }));
      lastRefresh = data.generatedAt ? new Date(data.generatedAt) : new Date();
      opportunities = rankOpportunities(companies);
    }
  } catch (error) {
    console.info('Using bundled Saudi market snapshot', error.message);
  }
}

function pill(text, tone = 'neutral') { return `<span class="pill ${tone}">${text}</span>`; }
function fmtPct(n) { return `${n > 0 ? '+' : ''}${NUM.format(n)}٪`; }
function changeClass(n) { return n > 0 ? 'up' : n < 0 ? 'down' : 'flat'; }
function selectedStock() { return opportunities.find((s) => s.symbol === selectedSymbol) || opportunities[0]; }
function priceMap() { return Object.fromEntries(companies.map((s) => [s.symbol, s.price])); }

function render() {
  const session = marketSessionStatus();
  const market = summarizeMarket(companies);
  const portfolio = calculatePortfolio(portfolioHoldings, priceMap());
  const top = opportunities.slice(0, 5);
  const stock = selectedStock();
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-icon">ر</div>
          <div><h1>رادار السوق السعودي</h1><p>فريق إيجنتات لتحليل الأسهم</p></div>
        </div>
        <nav>
          ${navButton('dashboard','لوحة السوق','📊')}
          ${navButton('companies','الشركات والبحث','🔎')}
          ${navButton('portfolio','المحفظة','💼')}
          ${navButton('opportunities','فرص المضاربة','⚡')}
          ${navButton('news','الأخبار والمؤثرات','🛰️')}
          ${navButton('agents','فريق الإيجنتات','🤖')}
        </nav>
        <div class="disclaimer">تحليل آلي لأغراض البحث والمتابعة فقط، وليس توصية مالية أو دعوة للبيع أو الشراء.</div>
      </aside>
      <main>
        <header class="topbar">
          <div><strong>${session.state}</strong><span>${session.detail}</span></div>
          <div><strong>آخر تحديث</strong><span>${lastRefresh.toLocaleString('ar-SA')}</span></div>
          <button id="refreshBtn">تحديث الآن</button>
        </header>
        ${activeTab === 'dashboard' ? dashboard(market, portfolio, top) : ''}
        ${activeTab === 'companies' ? companiesView() : ''}
        ${activeTab === 'portfolio' ? portfolioView(portfolio) : ''}
        ${activeTab === 'opportunities' ? opportunitiesView() : ''}
        ${activeTab === 'news' ? newsView() : ''}
        ${activeTab === 'agents' ? agentsView() : ''}
        ${stockDetail(stock)}
      </main>
    </div>`;
  bindEvents();
}

function navButton(id, label, icon) {
  return `<button class="nav ${activeTab === id ? 'active' : ''}" data-tab="${id}"><span>${icon}</span>${label}</button>`;
}

function dashboard(market, portfolio, top) {
  return `<section class="grid hero-grid">
    ${metric('متوسط حركة العينة', fmtPct(market.avgChange), market.avgChange >= 0 ? 'up' : 'down')}
    ${metric('رابحة / خاسرة', `${market.gainers} / ${market.losers}`, 'neutral')}
    ${metric('قيمة تداول تقديرية', SAR.format(market.totalValue), 'neutral')}
    ${metric('ربح/خسارة المحفظة', `${SAR.format(portfolio.pnl)} (${fmtPct(portfolio.pnlPct)})`, portfolio.pnl >= 0 ? 'up' : 'down')}
    <article class="panel wide">
      <div class="section-title"><h2>أفضل فرص مراقبة اليوم</h2><span>تصفية فنية + أخبار + مخاطر</span></div>
      <div class="cards-row">${top.map(opportunityCard).join('')}</div>
    </article>
    <article class="panel">
      <div class="section-title"><h2>موجز بعد/أثناء الجلسة</h2></div>
      <p>الإيجنتات تراقب ${companies.length} شركة سعودية، وتدمج الحركة السعرية مع الأخبار السياسية والسوقية والتوصيات المتداولة. أي فكرة تظهر هنا تمر على إيجنت إدارة المخاطر أولاً.</p>
      <ul class="checklist"><li>لا توجد فكرة بدون وقف خسارة.</li><li>يتم تمييز الشائعات عن الأخبار المؤكدة.</li><li>التحليل قابل للتحديث عبر ملف بيانات مجدول.</li></ul>
    </article>
  </section>`;
}

function metric(label, value, tone) {
  return `<article class="metric"><span>${label}</span><strong class="${tone}">${value}</strong></article>`;
}
function opportunityCard(item) {
  return `<button class="opp-card" data-symbol="${item.symbol}"><strong>${item.name}</strong><span>${item.symbol}</span><b>${item.score}</b><em>${item.label}</em></button>`;
}

function companiesView() {
  return `<section class="panel wide"><div class="section-title"><h2>الشركات والرموز</h2><input id="search" placeholder="ابحث بالاسم أو الرمز أو القطاع" /></div><div class="table-wrap"><table id="companiesTable"><thead><tr><th>الشركة</th><th>الرمز</th><th>القطاع</th><th>السعر</th><th>التغير</th><th>الحجم النسبي</th><th>النتيجة</th></tr></thead><tbody>${companyRows(opportunities)}</tbody></table></div></section>`;
}
function companyRows(rows) {
  return rows.map((s) => `<tr class="clickable" data-symbol="${s.symbol}"><td>${s.name}</td><td>${s.symbol}</td><td>${s.sector}</td><td>${SAR.format(s.price)}</td><td class="${changeClass(s.change)}">${fmtPct(s.change)}</td><td>${NUM.format(s.relativeVolume)}x</td><td><strong>${s.score}</strong></td></tr>`).join('');
}

function portfolioView(portfolio) {
  return `<section class="panel wide"><div class="section-title"><h2>المحفظة التجريبية</h2><span>${SAR.format(portfolio.totalValue)} — ${fmtPct(portfolio.pnlPct)}</span></div>
    <form id="holdingForm" class="holding-form"><select name="symbol">${companies.map((s) => `<option value="${s.symbol}">${s.symbol} — ${s.name}</option>`).join('')}</select><input name="quantity" type="number" min="1" placeholder="الكمية" required><input name="avgCost" type="number" step="0.01" min="0" placeholder="متوسط التكلفة" required><button>إضافة</button></form>
    <div class="table-wrap"><table><thead><tr><th>الرمز</th><th>الكمية</th><th>متوسطك</th><th>السعر</th><th>القيمة</th><th>الربح/الخسارة</th><th></th></tr></thead><tbody>${portfolio.rows.map((h, i) => `<tr><td>${h.symbol}</td><td>${h.quantity}</td><td>${SAR.format(h.avgCost)}</td><td>${SAR.format(h.price)}</td><td>${SAR.format(h.value)}</td><td class="${h.pnl >= 0 ? 'up':'down'}">${SAR.format(h.pnl)} (${fmtPct(h.pnlPct)})</td><td><button class="ghost" data-remove="${i}">حذف</button></td></tr>`).join('')}</tbody></table></div>
  </section>`;
}

function opportunitiesView() {
  return `<section class="panel wide"><div class="section-title"><h2>تحليلات المضاربة والتوصيات التحليلية</h2><span>تحليل فقط — بدون تنفيذ أو ضمان</span></div><div class="table-wrap"><table><thead><tr><th>الشركة</th><th>النتيجة</th><th>الدخول</th><th>وقف</th><th>هدف 1</th><th>هدف 2</th><th>R/R</th><th>الحالة</th></tr></thead><tbody>${opportunities.map((s) => `<tr class="clickable" data-symbol="${s.symbol}"><td>${s.name} <small>${s.symbol}</small></td><td><strong>${s.score}</strong></td><td>${SAR.format(s.entry)}</td><td>${SAR.format(s.stop)}</td><td>${SAR.format(s.target1)}</td><td>${SAR.format(s.target2)}</td><td>${NUM.format(s.riskReward)}</td><td>${s.label}</td></tr>`).join('')}</tbody></table></div></section>`;
}

function newsView() {
  return `<section class="grid"><article class="panel"><div class="section-title"><h2>الأخبار السياسية والسوقية</h2></div>${newsItems.map((n) => `<div class="news"><b>${n.type}</b><h3>${n.title}</h3><p>${n.impact}</p><span>القطاعات: ${n.sectors.join('، ')} — ثقة ${n.confidence}٪</span></div>`).join('')}</article><article class="panel"><div class="section-title"><h2>التوصيات المتداولة بين الناس</h2></div>${socialSignals.map((s) => `<button class="signal" data-symbol="${s.symbol}"><b>${s.symbol} — ${s.name}</b><span>${s.mentions} ذكر — ${s.sentiment}</span><p>${s.note}</p></button>`).join('')}</article></section>`;
}

function agentsView() {
  const agents = [
    ['إيجنت حالة السوق', 'يفحص افتتاح/إغلاق السوق واتجاه العينة.'],
    ['إيجنت بيانات الأسعار', 'يجمع الأسعار ويحفظ آخر لقطة قابلة للعرض.'],
    ['إيجنت التحليل الفني', 'RSI / EMA / حجم نسبي / دعم ومقاومة.'],
    ['إيجنت الأخبار السياسية', 'يربط النفط والفائدة والجغرافيا السياسية بالقطاعات.'],
    ['إيجنت أخبار السوق السعودي', 'يتابع الإعلانات والنتائج والتوزيعات.'],
    ['إيجنت التوصيات المتداولة', 'يرصد الزخم العام والشائعات والمخاطر.'],
    ['إيجنت إدارة المخاطر', 'يرفض أي فكرة بلا وقف أو بسيولة ضعيفة.'],
    ['إيجنت التقرير اليومي', 'يكتب موجز قبل الافتتاح وبعد الإغلاق.'],
  ];
  return `<section class="panel wide"><div class="section-title"><h2>فريق الإيجنتات</h2><span>كل إيجنت له دور واضح وتظهر حالته للمستخدم</span></div><div class="agent-grid">${agents.map((a, i) => `<div class="agent"><span>0${i+1}</span><b>${a[0]}</b><p>${a[1]}</p><em>نشط</em></div>`).join('')}</div></section>`;
}

function stockDetail(stock) {
  if (!stock) return '';
  return `<section class="panel detail"><div class="section-title"><h2>${stock.name} <small>${stock.symbol}</small></h2><span>${stock.sector}</span></div><div class="detail-grid"><div><span>السعر</span><strong>${SAR.format(stock.price)}</strong><em class="${changeClass(stock.change)}">${fmtPct(stock.change)}</em></div><div><span>RSI</span><strong>${NUM.format(stock.rsi)}</strong></div><div><span>الحجم النسبي</span><strong>${NUM.format(stock.relativeVolume)}x</strong></div><div><span>النتيجة</span><strong>${stock.score}/100</strong><em>${stock.label}</em></div></div><div class="plan"><div><b>منطقة دخول</b>${SAR.format(stock.entry)}</div><div><b>وقف خسارة</b>${SAR.format(stock.stop)}</div><div><b>هدف 1</b>${SAR.format(stock.target1)}</div><div><b>هدف 2</b>${SAR.format(stock.target2)}</div></div><div class="split"><div><h3>أسباب الظهور</h3><ul>${stock.reasons.map((r) => `<li>${r}</li>`).join('')}</ul></div><div><h3>تحذيرات وإلغاء الفكرة</h3><ul>${[...stock.warnings, stock.invalidation].map((r) => `<li>${r}</li>`).join('')}</ul></div></div></section>`;
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach((btn) => btn.addEventListener('click', () => { activeTab = btn.dataset.tab; render(); }));
  document.querySelectorAll('[data-symbol]').forEach((el) => el.addEventListener('click', () => { selectedSymbol = el.dataset.symbol; document.querySelector('.detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); render(); }));
  document.querySelector('#refreshBtn')?.addEventListener('click', async () => { await loadLiveSnapshot(); lastRefresh = new Date(); render(); });
  document.querySelector('#search')?.addEventListener('input', (event) => {
    const q = event.target.value.trim().toLowerCase();
    const rows = opportunities.filter((s) => `${s.name} ${s.symbol} ${s.sector}`.toLowerCase().includes(q));
    document.querySelector('#companiesTable tbody').innerHTML = companyRows(rows);
    document.querySelectorAll('#companiesTable [data-symbol]').forEach((el) => el.addEventListener('click', () => { selectedSymbol = el.dataset.symbol; render(); }));
  });
  document.querySelector('#holdingForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    portfolioHoldings.push({ symbol: form.get('symbol'), quantity: Number(form.get('quantity')), avgCost: Number(form.get('avgCost')) });
    saveHoldings(); render();
  });
  document.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => { portfolioHoldings.splice(Number(btn.dataset.remove), 1); saveHoldings(); render(); }));
}

await loadLiveSnapshot();
render();
setInterval(async () => { await loadLiveSnapshot(); render(); }, 5 * 60 * 1000);
