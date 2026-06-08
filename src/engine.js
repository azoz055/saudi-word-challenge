export const LANES = [0.22, 0.5, 0.78];
export const MISSIONS = [
  { city: 'الرياض', title: 'اجمع 6 عملات قبل البوابة', kind: 'coins', target: 6, reward: 1200 },
  { city: 'جدة', title: 'وصل كومبو x5', kind: 'combo', target: 5, reward: 1500 },
  { city: 'العلا', title: 'استخدم النيترو 3 مرات', kind: 'nitro', target: 3, reward: 1800 },
  { city: 'الدرعية', title: 'اهرب لمسافة 900م', kind: 'distance', target: 900, reward: 2200 },
];
export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function laneFromX(x, width) {
  const ratios = LANES.map(l => Math.abs(x / width - l));
  return ratios.indexOf(Math.min(...ratios));
}
export function playerYForHeight(height) {
  return Math.max(390, height - Math.max(128, Math.min(174, height * 0.19)));
}
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function currentMission(level) { return MISSIONS[level % MISSIONS.length]; }
export function missionProgress(state) {
  const m = currentMission(state.level);
  if (m.kind === 'coins') return state.missionCoins;
  if (m.kind === 'combo') return state.combo;
  if (m.kind === 'nitro') return state.missionNitro;
  if (m.kind === 'distance') return Math.floor(state.missionDistance);
  return 0;
}
export function isMissionComplete(state) {
  return missionProgress(state) >= currentMission(state.level).target;
}
export function scoreTick(state, dt, boostMul = 1) {
  const pressure = 1 + state.level * 0.08;
  state.distance += state.speed * dt * boostMul;
  state.missionDistance += state.speed * dt * boostMul;
  state.score += Math.floor((state.speed * dt) * 0.16 * pressure) + Math.floor(state.combo * 1.5);
  state.speed = clamp(state.speed + dt * (10 + state.level * 1.8), 320, 920);
  state.chase = clamp(state.chase + dt * (1.2 + state.level * 0.32) - (state.boost > 0 ? dt * 2.2 : 0), 0, 100);
  return state;
}
export function applyCollision(state, severity = 1) {
  if (state.shield > 0) {
    state.shield = 0;
    state.score += 180;
    return 'shield';
  }
  state.health = clamp(state.health - severity, 0, 3);
  state.combo = 1;
  state.chase = clamp(state.chase + 18 * severity, 0, 100);
  return state.health <= 0 || state.chase >= 100 ? 'gameover' : 'hit';
}
export function completeMission(state) {
  const mission = currentMission(state.level);
  const complete = isMissionComplete(state);
  if (complete) {
    state.score += mission.reward;
    state.level += 1;
    state.health = clamp(state.health + 1, 1, 3);
    state.nitro = clamp(state.nitro + 45, 0, 100);
    state.chase = clamp(state.chase - 30, 0, 100);
  } else {
    state.chase = clamp(state.chase + 28, 0, 100);
  }
  state.missionCoins = 0;
  state.missionNitro = 0;
  state.missionDistance = 0;
  return complete;
}
export function grade(score) {
  if (score >= 18000) return 'ملك المطاردة';
  if (score >= 11000) return 'درفت محترف';
  if (score >= 5500) return 'صقر سريع';
  return 'بداية قوية';
}
