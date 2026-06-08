export const LANES = [0.22, 0.5, 0.78];
export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function laneFromX(x, width) {
  const ratios = LANES.map(l => Math.abs(x / width - l));
  return ratios.indexOf(Math.min(...ratios));
}
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
export function scoreTick(state, dt) {
  const speedBonus = Math.floor(state.speed * 0.018);
  state.distance += state.speed * dt;
  state.score += Math.floor((state.speed * dt) * 0.12) + speedBonus;
  state.speed = clamp(state.speed + dt * 18, 360, 980);
  return state;
}
export function grade(score) {
  if (score >= 9000) return 'أسطورة الطريق';
  if (score >= 5500) return 'صقر محترف';
  if (score >= 2500) return 'سائق سريع';
  return 'بداية قوية';
}
