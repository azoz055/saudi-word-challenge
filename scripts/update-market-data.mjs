import { mkdir, writeFile } from 'node:fs/promises';
import { companies as baseCompanies } from '../src/marketData.js';

const UA = 'Mozilla/5.0 SaudiStockAgents/1.0';
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchYahoo(stock) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 60 * 60 * 24 * 45;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.yahoo || `${stock.symbol}.SR`)}?period1=${start}&period2=${now}&interval=1d&events=history&includeAdjustedClose=true`;
  const response = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
  if (!response.ok) throw new Error(`${stock.symbol} HTTP ${response.status}`);
  const json = await response.json();
  const result = json.chart?.result?.[0];
  const quote = result?.indicators?.quote?.[0];
  const closes = (quote?.close || []).filter((n) => typeof n === 'number' && Number.isFinite(n));
  const volumes = (quote?.volume || []).filter((n) => typeof n === 'number' && Number.isFinite(n));
  if (closes.length < 5) throw new Error(`${stock.symbol} has no close data`);
  const price = closes.at(-1);
  const prev = closes.at(-2) || price;
  const change = prev ? ((price - prev) / prev) * 100 : stock.change;
  const volume = volumes.at(-1) || stock.volume;
  const avgVolume = volumes.length ? Math.round(volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length)) : stock.avgVolume;
  return { ...stock, price, change, volume, avgVolume, closes: closes.slice(-30), dataSource: 'Yahoo Finance chart endpoint' };
}

const updated = [];
const errors = [];
for (const stock of baseCompanies) {
  try {
    updated.push(await fetchYahoo(stock));
  } catch (error) {
    errors.push({ symbol: stock.symbol, error: error.message });
    updated.push({ ...stock, dataSource: 'bundled fallback' });
  }
  await sleep(250);
}

await mkdir('public/data', { recursive: true });
await writeFile('public/data/market.json', JSON.stringify({ generatedAt: new Date().toISOString(), companies: updated, errors }, null, 2), 'utf8');
console.log(`Wrote public/data/market.json with ${updated.length} companies; ${errors.length} fallback rows.`);
if (errors.length) console.log(JSON.stringify(errors.slice(0, 5), null, 2));
