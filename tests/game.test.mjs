import assert from 'node:assert/strict';
import { PUZZLES, normalizeArabic, isValidGuess, canBuildWord, getDailyPuzzle } from '../src/puzzles.js';

assert.equal(normalizeArabic('أرض'), 'ارض');
assert.equal(normalizeArabic('قهوة'), 'قهوه');
assert.equal(PUZZLES.length >= 10, true);
assert.equal(canBuildWord('قهوة', ['ق','ه','و','ة','ب','ن','د']), true);
assert.equal(isValidGuess('قهوة', PUZZLES[0]).ok, true);
assert.equal(isValidGuess('سلام', PUZZLES[0]).ok, false);
assert.ok(getDailyPuzzle(new Date('2026-01-01')));
console.log('game tests passed');
