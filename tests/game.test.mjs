import assert from 'node:assert/strict';
import { clamp, laneFromX, rectsOverlap, scoreTick, grade, LANES } from '../src/engine.js';

assert.equal(LANES.length, 3);
assert.equal(clamp(5, 0, 3), 3);
assert.equal(clamp(-1, 0, 3), 0);
assert.equal(laneFromX(10, 300), 0);
assert.equal(laneFromX(150, 300), 1);
assert.equal(laneFromX(290, 300), 2);
assert.equal(rectsOverlap({x:0,y:0,w:20,h:20},{x:10,y:10,w:20,h:20}), true);
assert.equal(rectsOverlap({x:0,y:0,w:5,h:5},{x:10,y:10,w:5,h:5}), false);
const s = scoreTick({speed:400,distance:0,score:0}, 1);
assert.ok(s.distance > 390);
assert.ok(s.score > 0);
assert.equal(grade(10000), 'أسطورة الطريق');
console.log('arcade game tests passed');
