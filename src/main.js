import './styles.css';
import { companies as fallbackCompanies, newsItems, socialSignals, defaultHoldings } from './marketData.js';
import { SAR, NUM, rankOpportunities, calculatePortfolio, marketSessionStatus, summarizeMarket } from './financeEngine.js';

const app = document.querySelector('#app');
let companies = fallbackCompanies;
let opportunities = rankOpportunities(companies);
let selectedSymbol = opportunities[0]?.symbol;
let portfolioHoldings = loadHoldings();
let portfolioCapital = loadCapital();
let activeTab = 'dashboard';
let lastRefresh = new Date();

function loadHoldings() {
  try { return JSON.parse(localStorage.getItem('saudi-stock-holdings')) || defaultHoldings; }
  catch { return defaultHoldings; }
}
function saveHoldings() {
  localStorage.setItem('saudi-stock-holdings', JSON.stringify(portfolioHoldings));
}
function loadCapital() {
  try { return Number(localStorage.getItem('saudi-stock-capital')) || 0; }
  catch { return 0; }
}
function saveCapital() {
  localStorage.setItem('saudi-stock-capital', String(portfolioCapital));
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
function companyInfo(symbol) { return companies.find((s) => s.symbol === symbol) || { symbol, name: symbol }; }

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
  const remainingCapital = portfolioCapital ? portfolioCapital - (portfolio.netCapitalUsed ?? 0) : 0;
  return `<section class="panel wide"><div class="section-title"><h2>المحفظة التجريبية</h2><span>${SAR.format(portfolio.totalValue)} — ${fmtPct(portfolio.pnlPct)}</span></div>
    <p class="helper-note">أضفت لك سجل عمليات مثل الإكسل: عمليات شراء، عمليات بيع، ونتيجة الصفقة. النظام يحسب صافي البيع بعد عمولة البنك والضريبة، ويعرض الحالة: منتهي إذا تم بيع كامل الكمية أو لم ينتهي إذا بقيت أسهم.</p>
    <form id="capitalForm" class="capital-form">
      <label>رأس المال</label>
      <input name="capital" type="number" step="0.01" min="0" value="${portfolioCapital || ''}" placeholder="اكتب رأس المال المتاح">
      <button>حفظ رأس المال</button>
      <span>${portfolioCapital ? `المتبقي من رأس المال: ${SAR.format(remainingCapital)}` : 'أضف رأس المال عشان يحسب لك المتبقي بعد الشراء والبيع.'}</span>
    </form>
    <div class="portfolio-summary">
      ${metric('رأس المال', portfolioCapital ? SAR.format(portfolioCapital) : 'غير محدد', 'neutral')}
      ${metric('المتبقي من رأس المال', portfolioCapital ? SAR.format(remainingCapital) : '—', remainingCapital >= 0 ? 'up' : 'down')}
      ${metric('تكلفة الأسهم المتبقية', SAR.format(portfolio.totalCost), 'neutral')}
      ${metric('القيمة الحالية', SAR.format(portfolio.totalValue), 'neutral')}
      ${metric('الربح/الخسارة الكاملة', `${SAR.format(portfolio.pnl)} (${fmtPct(portfolio.pnlPct)})`, portfolio.pnl >= 0 ? 'up' : 'down')}
      ${metric('صفقات مفتوحة / منتهية', `${portfolio.openDeals ?? portfolio.rows.length} / ${portfolio.closedDeals ?? 0}`, 'neutral')}
    </div>
    <div class="operations-total-bar">
      ${metric('إجمالي عمليات الشراء', `${SAR.format(portfolio.totalBuyCost ?? 0)} / ${NUM.format(portfolio.totalBoughtQuantity ?? 0)} سهم`, 'neutral')}
      ${metric('إجمالي عمليات البيع', `${SAR.format(portfolio.totalSalesProceeds ?? 0)} / ${NUM.format(portfolio.totalSoldQuantity ?? 0)} سهم`, 'neutral')}
      ${metric('صافي المستخدم من رأس المال', SAR.format(portfolio.netCapitalUsed ?? 0), (portfolio.netCapitalUsed ?? 0) <= portfolioCapital || !portfolioCapital ? 'neutral' : 'down')}
      ${metric('مجموع العمولات والضرائب', SAR.format(portfolio.totalFees ?? 0), 'neutral')}
      ${metric('محقق / غير محقق', `${SAR.format(portfolio.realizedPnl ?? 0)} / ${SAR.format(portfolio.unrealizedPnl ?? 0)}`, portfolio.pnl >= 0 ? 'up' : 'down')}
    </div>
    <div class="operation-forms">
      <form id="holdingForm" class="holding-form lots-form">
        <h3>إضافة عملية شراء</h3>
        <select name="symbol">${companies.map((s) => `<option value="${s.symbol}">${s.symbol} — ${s.name}</option>`).join('')}</select>
        <input name="quantity" type="number" min="1" placeholder="عدد الأسهم شراء" required>
        <input name="price" type="number" step="0.01" min="0" placeholder="سعر الشراء" required>
        <input name="commission" type="number" step="0.01" min="0" placeholder="خصم/عمولة البنك">
        <input name="tax" type="number" step="0.01" min="0" placeholder="ضريبة الشراء">
        <button>إضافة شراء</button>
      </form>
      <form id="saleForm" class="holding-form lots-form sell-form">
        <h3>إضافة عملية بيع</h3>
        <select name="symbol">${companies.map((s) => `<option value="${s.symbol}">${s.symbol} — ${s.name}</option>`).join('')}</select>
        <input name="quantity" type="number" min="1" placeholder="عدد الأسهم المباعة" required>
        <input name="price" type="number" step="0.01" min="0" placeholder="سعر البيع" required>
        <input name="commission" type="number" step="0.01" min="0" placeholder="خصم/عمولة البنك">
        <input name="tax" type="number" step="0.01" min="0" placeholder="ضريبة البيع">
        <button>إضافة بيع</button>
      </form>
    </div>
    ${operationsLedger(portfolio)}
    <div class="table-wrap"><table><thead><tr><th>الرمز</th><th>شراء</th><th>بيع</th><th>المتبقي</th><th>الحالة</th><th>نتيجة البيع</th><th>نتيجة المتبقي</th><th>إجمالي النتيجة</th><th></th></tr></thead><tbody>${portfolio.rows.map((h) => `<tr><td>${h.symbol}</td><td>${h.lots.length} عملية / ${NUM.format(h.boughtQuantity ?? h.quantity)} سهم</td><td>${h.sales.length} عملية / ${NUM.format(h.soldQuantity ?? 0)} سهم</td><td>${NUM.format(h.quantity)} سهم</td><td>${pill(h.status ?? 'لم ينتهي', h.status === 'منتهي' ? 'neutral' : 'good')}</td><td class="${(h.realizedPnl ?? 0) >= 0 ? 'up':'down'}">${SAR.format(h.realizedPnl ?? 0)}</td><td class="${(h.unrealizedPnl ?? h.pnl) >= 0 ? 'up':'down'}">${SAR.format(h.unrealizedPnl ?? h.pnl)}</td><td class="${h.pnl >= 0 ? 'up':'down'}">${SAR.format(h.pnl)} (${fmtPct(h.pnlPct)})</td><td><button class="ghost" data-remove-symbol="${h.symbol}">حذف الشركة</button></td></tr><tr class="lot-row"><td colspan="9">${operationDetails(h)}</td></tr>`).join('')}</tbody></table></div>
  </section>`;
}

function portfolioOperationRows(portfolio) {
  return portfolio.rows.flatMap((holding) => {
    const info = companyInfo(holding.symbol);
    const buys = holding.lots.map((lot, index) => ({
      type: 'شراء', tone: 'good', symbol: holding.symbol, name: info.name, index: index + 1,
      quantity: lot.quantity, price: lot.price, gross: lot.gross, commission: lot.commission, tax: lot.tax,
      net: lot.cost, date: lot.date,
    }));
    const sales = holding.sales.map((sale, index) => ({
      type: 'بيع', tone: 'bad', symbol: holding.symbol, name: info.name, index: index + 1,
      quantity: sale.quantity, price: sale.price, gross: sale.gross, commission: sale.commission, tax: sale.tax,
      net: sale.proceeds, date: sale.date,
    }));
    return [...buys, ...sales];
  });
}

function operationDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ar-SA');
}

function operationsLedger(portfolio) {
  const rows = portfolioOperationRows(portfolio);
  if (!rows.length) return '<section class="ledger-section"><h3>سجل العمليات المفصل</h3><p class="helper-note">لا توجد عمليات بعد.</p></section>';
  return `<section class="ledger-section">
    <div class="section-title"><h3>سجل العمليات المفصل</h3><span>كل عملية شراء أو بيع تظهر كسطر مستقل</span></div>
    <div class="table-wrap"><table class="operations-ledger"><thead><tr><th>العملية</th><th>الرمز</th><th>الشركة</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th><th>العمولة</th><th>الضريبة</th><th>الصافي/التكلفة</th><th>التاريخ</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${pill(`${row.type} ${row.index}`, row.tone)}</td><td>${row.symbol}</td><td>${row.name}</td><td>${NUM.format(row.quantity)}</td><td>${SAR.format(row.price)}</td><td>${SAR.format(row.gross)}</td><td>${SAR.format(row.commission)}</td><td>${SAR.format(row.tax)}</td><td><strong>${SAR.format(row.net)}</strong></td><td>${operationDate(row.date)}</td></tr>`).join('')}</tbody></table></div>
    <div class="operation-ledger-total">
      ${metric('مجموع تكلفة الشراء', SAR.format(portfolio.totalBuyCost ?? 0), 'neutral')}
      ${metric('مجموع صافي البيع', SAR.format(portfolio.totalSalesProceeds ?? 0), 'neutral')}
      ${metric('مجموع كل العمليات', SAR.format((portfolio.totalBuyCost ?? 0) + (portfolio.totalSalesProceeds ?? 0)), 'neutral')}
      ${metric('مجموع العمولات والضرائب', SAR.format(portfolio.totalFees ?? 0), 'neutral')}
      ${metric('النتيجة الكاملة', SAR.format(portfolio.pnl), portfolio.pnl >= 0 ? 'up' : 'down')}
    </div>
  </section>`;
}

function operationDetails(holding) {
  return `<div class="operations-grid">
    <div><h3>عمليات الشراء</h3>${lotDetails(holding)}</div>
    <div><h3>نتيجة العمليات</h3>${resultDetails(holding)}</div>
    <div><h3>عمليات البيع</h3>${saleDetails(holding)}</div>
  </div>`;
}

function lotDetails(holding) {
  return `<div class="lots-list">${holding.lots.map((lot, index) => `<div><b>شراء ${index + 1}</b><span>${NUM.format(lot.quantity)} سهم × ${SAR.format(lot.price)}</span><span>مبلغ الشراء: ${SAR.format(lot.gross)} — خصم البنك: ${SAR.format(lot.commission)}</span><span>ضريبة الشراء: ${SAR.format(lot.tax)} — تكلفة العملية: ${SAR.format(lot.cost)}</span><button class="ghost mini" data-remove-lot="${holding.symbol}:${index}">حذف الشراء</button></div>`).join('')}</div>`;
}

function saleDetails(holding) {
  if (!holding.sales.length) return '<p class="helper-note">لا توجد عمليات بيع بعد.</p>';
  return `<div class="lots-list sell-list">${holding.sales.map((sale, index) => `<div><b>بيع ${index + 1}</b><span>${NUM.format(sale.quantity)} سهم × ${SAR.format(sale.price)}</span><span>مبلغ البيع: ${SAR.format(sale.gross)} — خصم البنك: ${SAR.format(sale.commission)}</span><span>ضريبة البيع: ${SAR.format(sale.tax)} — صافي البيع: ${SAR.format(sale.proceeds)}</span><button class="ghost mini" data-remove-sale="${holding.symbol}:${index}">حذف البيع</button></div>`).join('')}</div>`;
}

function resultDetails(holding) {
  return `<div class="result-box">
    <div><span>شراء</span><strong>${SAR.format(holding.buyCost ?? holding.cost)}</strong></div>
    <div><span>بيع</span><strong>${SAR.format(holding.salesProceeds ?? 0)}</strong></div>
    <div><span>نتيجة البيع</span><strong class="${(holding.realizedPnl ?? 0) >= 0 ? 'up' : 'down'}">${SAR.format(holding.realizedPnl ?? 0)}</strong></div>
    <div><span>قيمة المتبقي الآن</span><strong>${SAR.format(holding.value)}</strong></div>
    <div><span>الحالة</span><strong>${holding.status ?? 'لم ينتهي'}</strong></div>
  </div>`;
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
  document.querySelector('#capitalForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    portfolioCapital = Number(form.get('capital')) || 0;
    saveCapital(); render();
  });
  document.querySelector('#capitalForm input')?.addEventListener('change', (event) => {
    portfolioCapital = Number(event.target.value) || 0;
    saveCapital(); render();
  });
  document.querySelector('#holdingForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const commission = Number(form.get('commission')) || 0;
    const taxInput = form.get('tax');
    const tax = taxInput === '' || taxInput === null ? Math.round(commission * 15) / 100 : Number(taxInput) || 0;
    addPurchaseLot({
      symbol: form.get('symbol'),
      quantity: Number(form.get('quantity')),
      price: Number(form.get('price')),
      commission,
      tax,
      date: new Date().toISOString(),
    });
    saveHoldings(); render();
  });
  document.querySelector('#saleForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const commission = Number(form.get('commission')) || 0;
    const taxInput = form.get('tax');
    const tax = taxInput === '' || taxInput === null ? Math.round(commission * 15) / 100 : Number(taxInput) || 0;
    addSaleOperation({
      symbol: form.get('symbol'),
      quantity: Number(form.get('quantity')),
      price: Number(form.get('price')),
      commission,
      tax,
      date: new Date().toISOString(),
    });
    saveHoldings(); render();
  });
  document.querySelectorAll('[data-remove-symbol]').forEach((btn) => btn.addEventListener('click', () => {
    portfolioHoldings = portfolioHoldings.filter((holding) => holding.symbol !== btn.dataset.removeSymbol);
    saveHoldings(); render();
  }));
  document.querySelectorAll('[data-remove-lot]').forEach((btn) => btn.addEventListener('click', () => {
    const [symbol, indexText] = btn.dataset.removeLot.split(':');
    removePurchaseLot(symbol, Number(indexText));
    saveHoldings(); render();
  }));
  document.querySelectorAll('[data-remove-sale]').forEach((btn) => btn.addEventListener('click', () => {
    const [symbol, indexText] = btn.dataset.removeSale.split(':');
    removeSaleOperation(symbol, Number(indexText));
    saveHoldings(); render();
  }));
}

function addPurchaseLot(lot) {
  const existing = portfolioHoldings.find((holding) => holding.symbol === lot.symbol);
  if (!existing) {
    portfolioHoldings.push({ symbol: lot.symbol, lots: [lot], sales: [] });
    return;
  }
  ensureHoldingShape(existing);
  existing.lots.push(lot);
}

function addSaleOperation(sale) {
  const existing = portfolioHoldings.find((holding) => holding.symbol === sale.symbol);
  if (!existing) {
    portfolioHoldings.push({ symbol: sale.symbol, lots: [], sales: [sale] });
    return;
  }
  ensureHoldingShape(existing);
  existing.sales.push(sale);
}

function ensureHoldingShape(holding) {
  if (!Array.isArray(holding.lots)) {
    holding.lots = [{ quantity: holding.quantity, price: holding.price ?? holding.avgCost, commission: holding.commission ?? 0, tax: holding.tax ?? 0, date: holding.date }];
    delete holding.quantity;
    delete holding.avgCost;
    delete holding.price;
    delete holding.commission;
    delete holding.tax;
  }
  if (!Array.isArray(holding.sales)) holding.sales = [];
}

function removePurchaseLot(symbol, lotIndex) {
  const holding = portfolioHoldings.find((item) => item.symbol === symbol);
  if (!holding) return;
  ensureHoldingShape(holding);
  holding.lots.splice(lotIndex, 1);
  if (holding.lots.length === 0 && holding.sales.length === 0) portfolioHoldings = portfolioHoldings.filter((item) => item.symbol !== symbol);
}

function removeSaleOperation(symbol, saleIndex) {
  const holding = portfolioHoldings.find((item) => item.symbol === symbol);
  if (!holding) return;
  ensureHoldingShape(holding);
  holding.sales.splice(saleIndex, 1);
  if (holding.lots.length === 0 && holding.sales.length === 0) portfolioHoldings = portfolioHoldings.filter((item) => item.symbol !== symbol);
}

await loadLiveSnapshot();
render();
setInterval(async () => { await loadLiveSnapshot(); render(); }, 5 * 60 * 1000);
