import assert from 'node:assert/strict';
import {
  calculateRSI,
  calculateEMA,
  analyzeStock,
  calculatePortfolio,
  marketSessionStatus,
  rankOpportunities,
} from '../src/financeEngine.js';

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('calculateRSI returns high value for persistent gains', () => {
  const closes = [10, 10.4, 10.9, 11.2, 11.6, 11.9, 12.3, 12.7, 13.1, 13.4, 13.9, 14.2, 14.7, 15.1, 15.5, 15.9];
  assert.ok(calculateRSI(closes) > 70);
});

test('calculateEMA tracks the latest price direction', () => {
  const ema = calculateEMA([10, 11, 12, 13, 14, 15], 3);
  assert.ok(ema > 13);
  assert.ok(ema < 15.1);
});

test('analyzeStock produces entry, stop, targets and risk reward', () => {
  const stock = {
    symbol: '2222',
    name: 'أرامكو السعودية',
    sector: 'الطاقة',
    price: 31.8,
    change: 1.2,
    volume: 14800000,
    avgVolume: 9300000,
    closes: [28,28.4,28.8,29,29.3,29.5,29.7,30.1,30.4,30.8,31,31.4,31.6,31.8,32],
    newsImpact: 13,
    sentiment: 8,
  };
  const result = analyzeStock(stock);
  assert.equal(result.symbol, '2222');
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(result.entry > result.stop);
  assert.ok(result.target2 > result.entry);
  assert.ok(result.riskReward >= 1);
  assert.ok(result.reasons.length > 0);
});

test('rankOpportunities sorts high scoring ideas first and blocks unsafe rows', () => {
  const rows = [
    { symbol: 'A', name: 'A', sector: 'طاقة', price: 10, change: 2, volume: 2000000, avgVolume: 1000000, closes: [8,8.1,8.3,8.6,8.9,9.1,9.4,9.7,10,10.2,10.4,10.6,10.9,11,11.3], newsImpact: 12, sentiment: 8 },
    { symbol: 'B', name: 'B', sector: 'مواد', price: 20, change: -2, volume: 10000, avgVolume: 20000, closes: [22,21.8,21.4,21,20.8,20.6,20.4,20.2,20,19.9,19.7,19.5,19.2,19,18.8], newsImpact: 0, sentiment: -3 },
  ];
  const ranked = rankOpportunities(rows);
  assert.equal(ranked[0].symbol, 'A');
  assert.ok(ranked[1].warnings.length > 0);
});

test('calculatePortfolio returns total value and P/L', () => {
  const holdings = [
    { symbol: '2222', quantity: 100, avgCost: 30 },
    { symbol: '1120', quantity: 10, avgCost: 35 },
  ];
  const prices = { '2222': 31, '1120': 33 };
  const result = calculatePortfolio(holdings, prices);
  assert.equal(result.totalCost, 3350);
  assert.equal(result.totalValue, 3430);
  assert.equal(result.pnl, 80);
});

test('marketSessionStatus identifies closed session outside Tadawul hours', () => {
  const friday = new Date('2026-06-12T12:00:00+03:00');
  assert.equal(marketSessionStatus(friday).state, 'مغلق');
});
