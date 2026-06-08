export const PUZZLES = [
  { theme: 'قهوة وتراث', letters: ['ق','ه','و','ة','ب','ن','د'], center: 'ق', words: ['قهوة','قهوه','دلة','بن','نقد','وقد','قود','دق','قند','ندق'] },
  { theme: 'مدن سعودية', letters: ['ر','ي','ا','ض','ج','د','ة'], center: 'ر', words: ['رياض','الرياض','جدة','دار','دير','دراية','راد','دور','يرد','رد'] },
  { theme: 'السفر والطرق', letters: ['ط','ر','ي','ق','س','ف','ر'], center: 'ط', words: ['طريق','طرق','طير','فطر','قطر','سطر','طرس','طفر','رطب','طيف'] },
  { theme: 'البحر وجدة', letters: ['ب','ح','ر','ج','د','ة','م'], center: 'ب', words: ['بحر','بحري','برج','برد','بدر','مبحر','بحره','حبر','درب','بدم'] },
  { theme: 'العقار والأرض', letters: ['ا','ر','ض','م','ل','ك','ة'], center: 'ر', words: ['ارض','أرض','عقار','ملك','مراد','رماد','كرم','مركز','رمل','رملة'] },
  { theme: 'رمضان', letters: ['ص','و','م','ر','ح','ا','ن'], center: 'ص', words: ['صوم','صحن','صاروخ','صاح','حرص','نص','صنم','صرح','صام','مصون'] },
  { theme: 'كورة', letters: ['ك','ر','ة','ه','د','ف','ل'], center: 'ك', words: ['كرة','كوره','هدفك','كف','ركل','درك','كر','فكر','كهل','كل'] },
  { theme: 'الرياض الحديثة', letters: ['م','ل','ك','س','ا','ن','ة'], center: 'م', words: ['ملك','مكان','ملاك','مسك','مكة','مالك','مناسك','مسكن','مسمار','منا'] },
  { theme: 'العمل والدوام', letters: ['ع','م','ل','د','و','ا','م'], center: 'ع', words: ['عمل','عامل','معد','عود','وعد','عدل','علم','عالم','معاد','دعم'] },
  { theme: 'الشتاء', letters: ['ش','ت','ا','ء','ب','ر','د'], center: 'ش', words: ['شتاء','برد','بشر','رشد','شرب','دش','شارد','شرط','تباشير','شات'] }
];

export function normalizeArabic(input) {
  return String(input || '')
    .trim()
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْـ\s]/g, '')
    .toLowerCase();
}

export function getDailyPuzzle(date = new Date()) {
  const start = new Date(Date.UTC(2026, 0, 1));
  const today = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const diff = Math.floor((today - start) / 86400000);
  return PUZZLES[((diff % PUZZLES.length) + PUZZLES.length) % PUZZLES.length];
}

export function canBuildWord(word, letters) {
  const pool = letters.map(normalizeArabic).join('');
  const counts = {};
  for (const ch of pool) counts[ch] = (counts[ch] || 0) + 1;
  for (const ch of normalizeArabic(word)) {
    counts[ch] = (counts[ch] || 0) - 1;
    if (counts[ch] < 0) return false;
  }
  return true;
}

export function isValidGuess(guess, puzzle) {
  const g = normalizeArabic(guess);
  if (g.length < 2) return { ok:false, reason:'الكلمة قصيرة' };
  if (!g.includes(normalizeArabic(puzzle.center))) return { ok:false, reason:`لازم تستخدم حرف ${puzzle.center}` };
  if (!canBuildWord(g, puzzle.letters)) return { ok:false, reason:'استخدم الحروف الظاهرة فقط' };
  const bank = new Set(puzzle.words.map(normalizeArabic));
  if (!bank.has(g)) return { ok:false, reason:'كلمة غير موجودة في لغز اليوم' };
  return { ok:true };
}
