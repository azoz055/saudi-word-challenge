export const SAR = new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 2 });
export const NUM = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 2 });

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function calculateEMA(values, period = 10) {
  if (!values?.length) return 0;
  const k = 2 / (period + 1);
  return values.reduce((ema, price, index) => index === 0 ? price : price * k + ema * (1 - k), values[0]);
}

export function calculateRSI(closes, period = 14) {
  if (!closes || closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  const start = closes.length - period;
  for (let i = start; i < closes.length; i += 1) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function movingAverage(values, period = 20) {
  if (!values?.length) return 0;
  const slice = values.slice(-period);
  return slice.reduce((sum, n) => sum + n, 0) / slice.length;
}

export function estimateATR(stock) {
  const closes = stock.closes?.length ? stock.closes : [stock.price];
  const changes = [];
  for (let i = 1; i < closes.length; i += 1) {
    changes.push(Math.abs(closes[i] - closes[i - 1]));
  }
  const meanMove = changes.length ? changes.reduce((a, b) => a + b, 0) / changes.length : stock.price * 0.015;
  return clamp(meanMove * 1.6, stock.price * 0.008, stock.price * 0.055);
}

export function analyzeStock(stock) {
  const closes = stock.closes?.length ? stock.closes : [stock.price];
  const latest = stock.price ?? closes.at(-1);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const ma20 = movingAverage(closes, 20);
  const rsi = calculateRSI(closes);
  const atr = estimateATR({ ...stock, price: latest });
  const relativeVolume = stock.avgVolume ? stock.volume / stock.avgVolume : 1;
  const trendStrength = clamp(((ema9 - ema21) / latest) * 500 + (latest > ma20 ? 10 : 0) + stock.change * 1.8, 0, 20);
  const volumeScore = clamp(relativeVolume * 12, 0, 20);
  const breakoutScore = clamp(((latest - Math.min(...closes.slice(-10))) / Math.max(atr, 0.01)) * 4, 0, 15);
  const catalystScore = clamp(stock.newsImpact ?? 5, 0, 15);
  const sentimentScore = clamp(stock.sentiment ?? 0, -5, 5);
  const stop = Math.max(0.01, latest - atr * 1.25);
  const entry = latest + atr * 0.12;
  const target1 = entry + atr * 1.6;
  const target2 = entry + atr * 2.75;
  const riskReward = (target2 - entry) / Math.max(entry - stop, 0.01);
  const riskScore = clamp(riskReward * 8, 0, 20);
  let score = Math.round(clamp(trendStrength + volumeScore + breakoutScore + catalystScore + riskScore + sentimentScore + 10, 0, 100));
  const warnings = [];
  if (stock.volume < 250000) warnings.push('سيولة منخفضة: يحتاج حذر قبل أي قرار.');
  if (rsi > 78) warnings.push('تشبع شرائي مرتفع؛ الأفضل انتظار تهدئة أو اختراق مؤكد.');
  if (rsi < 32) warnings.push('زخم ضعيف/تشبع بيعي؛ الفكرة للمراقبة فقط.');
  if (relativeVolume < 0.65) warnings.push('الحجم أقل من المعتاد؛ الاختراق غير مؤكد.');
  if (riskReward < 1.7) warnings.push('العائد مقابل المخاطرة أقل من المستوى المفضل.');
  if (warnings.length) score = Math.max(0, score - warnings.length * 4);
  const reasons = [];
  if (ema9 > ema21) reasons.push('المتوسط القصير أعلى من المتوسط الأطول.');
  if (relativeVolume >= 1.2) reasons.push('حجم تداول أعلى من المتوسط.');
  if ((stock.newsImpact ?? 0) >= 10) reasons.push('يوجد محفز خبري/قطاعي مؤثر.');
  if ((stock.sentiment ?? 0) > 3) reasons.push('السهم متداول بكثرة في النقاشات العامة.');
  if (!reasons.length) reasons.push('فكرة مراقبة تحتاج تأكيد إضافي من السعر والحجم.');
  const label = score >= 85 ? 'فرصة قوية للمراقبة' : score >= 70 ? 'فرصة جيدة' : score >= 55 ? 'مراقبة فقط' : 'غير مناسب حالياً';
  return {
    ...stock,
    price: latest,
    ema9,
    ema21,
    ma20,
    rsi,
    atr,
    relativeVolume,
    entry,
    stop,
    target1,
    target2,
    riskReward,
    score,
    label,
    reasons,
    warnings,
    invalidation: `كسر ${SAR.format(stop)} أو هبوط الحجم عن المتوسط يلغي الفكرة.`,
  };
}

export function rankOpportunities(stocks) {
  return stocks.map(analyzeStock).sort((a, b) => b.score - a.score);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function roundAverage(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

export function normalizeLots(holding) {
  const sourceLots = Array.isArray(holding.lots) && holding.lots.length
    ? holding.lots
    : [{
        quantity: holding.quantity,
        price: holding.price ?? holding.avgCost,
        commission: holding.commission ?? 0,
        tax: holding.tax ?? 0,
        date: holding.date,
      }];
  return sourceLots
    .map((lot) => {
      const quantity = Number(lot.quantity) || 0;
      const price = Number(lot.price ?? lot.avgCost) || 0;
      const commission = Number(lot.commission) || 0;
      const tax = Number(lot.tax) || 0;
      const gross = quantity * price;
      const cost = roundMoney(gross + commission + tax);
      return { ...lot, quantity, price, commission, tax, gross: roundMoney(gross), cost };
    })
    .filter((lot) => lot.quantity > 0);
}

export function calculatePortfolio(holdings, priceMap) {
  const grouped = new Map();
  for (const holding of holdings) {
    const symbol = holding.symbol;
    if (!symbol) continue;
    const lots = normalizeLots(holding);
    if (!grouped.has(symbol)) grouped.set(symbol, { symbol, lots: [] });
    grouped.get(symbol).lots.push(...lots);
  }
  const rows = [...grouped.values()].map((group) => {
    const quantity = group.lots.reduce((sum, lot) => sum + lot.quantity, 0);
    const cost = roundMoney(group.lots.reduce((sum, lot) => sum + lot.cost, 0));
    const fees = roundMoney(group.lots.reduce((sum, lot) => sum + lot.commission + lot.tax, 0));
    const avgCost = quantity ? roundAverage(cost / quantity) : 0;
    const price = priceMap[group.symbol] ?? avgCost;
    const value = roundMoney(quantity * price);
    const pnl = roundMoney(value - cost);
    return { ...group, quantity, avgCost, price, cost, value, pnl, fees, pnlPct: cost ? (pnl / cost) * 100 : 0 };
  });
  const totalCost = roundMoney(rows.reduce((sum, row) => sum + row.cost, 0));
  const totalValue = roundMoney(rows.reduce((sum, row) => sum + row.value, 0));
  const pnl = roundMoney(totalValue - totalCost);
  return { rows, totalCost, totalValue, pnl, pnlPct: totalCost ? (pnl / totalCost) * 100 : 0 };
}

export function marketSessionStatus(date = new Date()) {
  const local = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const day = local.getDay();
  const minutes = local.getHours() * 60 + local.getMinutes();
  if (day === 5 || day === 6) return { state: 'مغلق', detail: 'عطلة نهاية الأسبوع في السوق السعودي' };
  if (minutes < 9 * 60 + 30) return { state: 'قبل الافتتاح', detail: 'المزاد/الاستعداد قبل جلسة 10:00 ص' };
  if (minutes >= 10 * 60 && minutes < 15 * 60) return { state: 'مفتوح', detail: 'جلسة تداول مستمرة تقريباً من 10:00 ص إلى 3:00 م' };
  if (minutes >= 15 * 60 && minutes < 15 * 60 + 20) return { state: 'مزاد الإغلاق', detail: 'فترة إغلاق/تذبذب نهائي' };
  return { state: 'مغلق', detail: 'خارج ساعات التداول الرسمية' };
}

export function summarizeMarket(stocks) {
  const gainers = stocks.filter((s) => s.change > 0).length;
  const losers = stocks.filter((s) => s.change < 0).length;
  const unchanged = stocks.length - gainers - losers;
  const totalValue = stocks.reduce((sum, s) => sum + s.price * s.volume, 0);
  const avgChange = stocks.reduce((sum, s) => sum + s.change, 0) / stocks.length;
  return { gainers, losers, unchanged, totalValue, avgChange };
}
