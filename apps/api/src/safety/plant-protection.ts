/**
 * Plant protection guard for every text the app shows from a provider or a
 * model: diagnosis descriptions and treatments, assistant replies.
 *
 * In Türkiye plant protection products are prescription-only (ziraat
 * mühendisi, B-Reçete) and may not be promoted online (RG 33106, Dec 2025).
 * So no product or active ingredient names, no doses or mixing ratios, no
 * application schedules, no "spray a fungicide" instructions. Sentences
 * that break the rule are dropped; the referral to an expert is added.
 *
 * Matching runs on folded text (Turkish lower case, no diacritics), so
 * "KÜKÜRT", "kükürt" and "kukurt" are the same word. ADR 0013 lists the
 * rules; test/fixtures/red-team.ts holds the prompts they are tested with.
 */

export const EXPERT_REFERRAL =
  'İlaç gerekip gerekmediğine bir ziraat mühendisi ya da il veya ilçe tarım müdürlüğü karar verir; gerekirse ilaç reçeteyle (B-Reçete) yazılır. Ürün adı, doz ve uygulama zamanı vermiyoruz.';

/** When nothing safe is left of an answer. */
export const SAFE_FALLBACK = `Bu konuda ilaç adı, doz ya da uygulama zamanı veremiyorum. ${EXPERT_REFERRAL} Bu arada hasta yaprakları ayırabilir, sulamayı azaltıp havalandırmayı artırabilir ve zararlıları nemli bir bezle silebilirsin.`;

export type Violation = 'product' | 'dose' | 'timing' | 'instruction';

export function fold(text: string) {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/[’‘`´]/g, "'")
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const any = (parts: string[]) => new RegExp(parts.join('|'));

/** Active ingredients, product types and brands, folded. */
const PRODUCT = any([
  // Insecticides and acaricides
  'imidaklopr',
  'imidaclopr',
  'asetamipr',
  'acetamipr',
  'tiyametoksam',
  'thiamethoxam',
  'klotianidin',
  'clothianidin',
  'abamekt',
  'abamect',
  'emamekt',
  'emamect',
  'deltametr',
  'deltamethr',
  'sipermetr',
  'cypermethr',
  'sihalotr',
  'cyhalothr',
  'permetr',
  'permethr',
  'klorpirifos',
  'chlorpyrifos',
  'malatyon',
  'malathion',
  'dimetoat',
  'dimethoat',
  'spirotetramat',
  'spinosad',
  'piretr',
  'pyrethr',
  // Herbicides and fungicides
  'glifosat',
  'glyphosat',
  'mankozeb',
  'mancozeb',
  'metalaksil',
  'metalaxyl',
  'fosetil',
  'fosetyl',
  'tebukonazol',
  'tebuconazol',
  'difenokonazol',
  'difenoconazol',
  'penkonazol',
  'penconazol',
  'azoksistrobin',
  'azoxystrobin',
  'propineb',
  '\\bkaptan\\b',
  '\\bcaptan\\b',
  'iprodion',
  'boscalid',
  'fludioksonil',
  'fludioxonil',
  'bakir (oksiklorur|hidroksit|sulfat)',
  'copper (oxychloride|hydroxide|sulfate|sulphate|fungicide|spray|soap)',
  'bakir(li)? (iceren |bazli |esasli )?(bir )?(ilac|fungisit|preparat|urun)',
  'goztasi',
  'bordo bulamac',
  'bordeaux',
  // "kükürt gibi kokuyor" is about soil, not a product
  '\\bkukurt(?!\\w*\\s+(gibi\\s+)?kok)',
  '\\bsulfur\\b(?!\\s+smell)',
  '\\bsulphur\\b',
  // Biological and botanical products are licensed products too
  '\\bneem\\b',
  'azadirakt',
  'azadiracht',
  'bacillus (thuringiensis|subtilis|amyloliquefaciens)',
  'trichoderma',
  'beauveria',
  'metarhizium',
  'insektisit(al)? sabun',
  'insecticidal soap',
  'arap sabun',
  'potasyum sabun',
  'potassium soap',
  'horticultural oil',
  'mineral (oil|yag)',
  'parafin yag',
  'yazlik yag',
  'kislik yag',
  // Brands sold in Türkiye
  'confidor',
  '\\bdecis\\b',
  'actara',
  'vertimec',
  'karate zeon',
  'roundup',
  'ridomil',
  'antracol',
  'previcur',
  'movento',
  'envidor',
  'nissorun',
  'mospilan',
  'calypso',
  'coragen',
  'altacor',
  '\\btopas\\b',
  'teldor',
  'folicur',
  'dithane',
  'kocide',
  'cuprofix',
  'thiovit',
  'polyram',
  'evisect',
  'oberon',
  '\\bnativo\\b',
  '®',
  '™',
]);

/** Words that make a sentence about plant protection products, folded. */
const PESTICIDE =
  /\bilac|\bfungisit|\binsektisit|\bherbisit|\bakarisit|\bpestisit|\bpreparat|\bfungicide|\binsecticide|\bpesticide|\bmiticide|\bherbicide/;
const CHEMICAL_WORD = /\bkimyasal|\bchemical/;
const FERTILIZER = /gubre|fertili/;
const REFERRAL =
  /muhendis|uzman|recete|danis|tarim mudurlug|agronom|expert|specialist|consult/;
const NEGATED =
  /kullanma(yin|yiniz|dan|mak)|uygulama(yin|yiniz|dan)|puskurtme(yin|yiniz)|ilaclama(yin|yiniz|dan)|gerekmez|gerek yok|gerekmiyor|\bdon'?t\b|\bdo not\b|\bavoid\b|\bnever\b|\bno need\b|onermiyoruz|onermem/;
const INSTRUCTION =
  /\b(uygula|kullan|puskurt|ilacla|serp|sik(in|iniz|abilir\w*|ma\w*)\b|atin\b|verin\b|ver\b|apply|spray|use\b|treat with|dust with)/;

const NUM = '(\\d+([.,]\\d+)?|bir|iki|uc|dort|bes|yarim|birkac|one|two|half)';
const UNIT =
  '(ml|cc|cl|mililitre|lt|litre|liter|l|gr|g|gram|mg|kg|kilogram|ppm|yemek kasig\\w*|cay kasig\\w*|tatli kasig\\w*|kasik\\w*|kapak\\w*|damla|olcek\\w*|bardak\\w*|fincan\\w*|avuc\\w*|tutam\\w*|dis\\b|adet|tbsp|tsp|tablespoons?|teaspoons?|drops?|cups?)';
const PER =
  '(l|lt|litre\\w*|liter\\w*|da|dekar\\w*|donum\\w*|m2|m²|metrekare\\w*|bitki\\w*|agac\\w*|saksi\\w*|gallon\\w*|gal)';

/** Mixing ratios and application rates. A plain "1 litre su ver" is fine. */
const DOSE = [
  new RegExp(
    `${NUM}\\s*${UNIT}'?\\w*\\s*(/|\\bper\\b|\\bher\\s)\\s*(\\d+([.,]\\d+)?\\s*)?${PER}\\b`,
  ),
  new RegExp(
    `\\b(litre|lt|l|liter|bardak|kova|sise)\\w*\\s+su(ya|yuna|yla|yu ile|\\s+ile)\\b[^.]{0,40}?${NUM}\\s*${UNIT}\\b`,
  ),
  new RegExp(
    `${NUM}\\s*${UNIT}'?\\w*\\b[^.]{0,30}?\\b(litre|lt|liter|bardak|kova)\\w*\\s+su(ya|yla|yu|\\s+ile)\\b`,
  ),
  new RegExp(`\\b(dekar|donum)(a|e)\\b[^.]{0,20}?${NUM}\\s*${UNIT}\\b`),
  new RegExp(`\\b(litre|liter)(ye|sine)\\b[^.]{0,20}?${NUM}\\s*${UNIT}\\b`),
  new RegExp(
    `${NUM}\\s*${UNIT}\\s+(of\\s+[\\w-]+\\s+)?(per|in|to|into|with)\\s+(a\\s+|one\\s+|\\d+\\s*)?(l|liters?|litres?|gallons?|quarts?)\\b`,
  ),
  /(%|yuzde)\s*\d+([.,]\d+)?\s*('?l[iu]k)?\s*(cozelti|solusyon|karisim|oran|konsantrasyon|solution|mix)/,
  /\d+([.,]\d+)?\s*%\s*(cozelti|solusyon|karisim|solution|mix)/,
  /\bbinde\s*\d+/,
  /\bdoz\w*\b[^.]{0,25}\d|\d[^.]{0,15}\bdoz\w*/,
  /\bdose\b[^.]{0,25}\d|\brate of\s+\d/,
];

/** How often or when to apply; only matters next to a chemical. */
const TIMING = [
  /\b(\d+|bir|iki|uc|dort|bes|alti|yedi|on)\s*(-\s*\d+\s*)?(gun|hafta)\w*\s*(ara\s*ile|arayla|aralikla|arasiyla|da\s*bir|de\s*bir|ta\s*bir|te\s*bir|icinde\s*tekrar|sonra\s*tekrar)/,
  /\bevery\s+\d+\s*(-\s*\d+\s*)?(days?|weeks?)/,
  /\b(haftada|gunde|ayda)\s+(bir|iki|uc|\d+)\s*(kez|kere|defa)?/,
  /\b\d+\s*(kez|kere|defa|times)\s*(tekrar|uygula|ilacla|repeat|apply)/,
  /\bhasat(tan)?\s*\d+\s*gun|\bbekleme\s*sures|\bpre-?harvest/,
  /\b(sabah\s*erken|aksam\s*serinlig|gun\s*batim|early morning|in the evening)/,
];

export function violations(text: string): Violation[] {
  const t = fold(text);
  const found = new Set<Violation>();
  const product = PRODUCT.test(t);
  // "Kimyasal gübre" is fertilizer, not plant protection.
  const pesticide =
    PESTICIDE.test(t) || (CHEMICAL_WORD.test(t) && !FERTILIZER.test(t));
  const negated = NEGATED.test(t);
  if (product) found.add('product');
  // A ratio counts even without the product's name: that sentence often
  // follows the one that named it. Fertilizer ratios are fine.
  if (
    DOSE.some((re) => re.test(t)) &&
    (product || pesticide || !FERTILIZER.test(t))
  ) {
    found.add('dose');
  }
  if ((product || pesticide) && !negated && TIMING.some((re) => re.test(t))) {
    found.add('timing');
  }
  if (pesticide && INSTRUCTION.test(t) && !REFERRAL.test(t) && !negated) {
    found.add('instruction');
  }
  return [...found];
}

/** Sentences of one line; the bullet stays with the first one. */
const sentences = (line: string) => line.split(/(?<=[.!?…])\s+(?=\S)/);

const isTableRow = (line: string) => line.trimStart().startsWith('|');

/**
 * Drops every sentence that breaks the rule; keeps the rest as written. A
 * table with one bad row goes whole: its headers alone would still say
 * "ilaç, doz, aralık".
 */
export function redact(text: string) {
  let removed = 0;
  const source = text.split('\n');
  const dropped = new Set<number>();
  for (let start = 0; start < source.length; start++) {
    if (!isTableRow(source[start])) continue;
    let end = start;
    while (end + 1 < source.length && isTableRow(source[end + 1])) end++;
    const rows = source.slice(start, end + 1);
    if (rows.some((row) => violations(row).length > 0)) {
      for (let i = start; i <= end; i++) dropped.add(i);
      removed += 1;
    }
    start = end;
  }
  const lines = source.flatMap((line, index) => {
    if (dropped.has(index)) return [];
    const parts = sentences(line);
    const kept = parts.filter((sentence) => {
      const bad = violations(sentence).length > 0;
      if (bad) removed += 1;
      return !bad;
    });
    if (kept.length === parts.length) return [line];
    const rest = kept.join(' ').trim();
    // A bullet whose only sentence went, or a lone bullet mark.
    if (!rest || /^[-•*\d.)\s]+$/.test(rest)) return [];
    const bullet = /^\s*([-•*]|\d+[.)])\s+/.exec(line)?.[0];
    return [bullet && !rest.startsWith(bullet.trim()) ? bullet + rest : rest];
  });
  return {
    text: lines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    removed,
  };
}

/** List items (treatment steps) that pass, each redacted on its own. */
export function safeSteps(steps: string[]) {
  return steps
    .map((step) => redact(step).text)
    .filter((step) => step.length > 0);
}

/** The question is about products, doses or spraying. */
export function asksForChemicals(question: string) {
  const t = fold(question);
  return (
    PRODUCT.test(t) ||
    PESTICIDE.test(t) ||
    CHEMICAL_WORD.test(t) ||
    /\bdoz|\bdose|kac (ml|cc|gram|gr|kasik|kapak|damla)|ne kadar (karistir|koy|kat|sik)|karisim|hangi (urun|marka)|urun ad|etken madde|\bbayi|\brecete|bekleme sures|\bmarka|\bbrand|how much|which product|\bspray|\bsabun|\bsirke/.test(
      t,
    )
  );
}

export const mentionsExpert = (text: string) => REFERRAL.test(fold(text));

/**
 * The assistant's answer as shown and stored: unsafe sentences out, the
 * referral in when something went or the question asked for chemicals.
 */
export function guardReply(reply: string, question: string) {
  const { text, removed } = redact(reply);
  let answer = removed > 0 && text.length < 40 ? SAFE_FALLBACK : text;
  if (!answer) answer = SAFE_FALLBACK;
  if ((removed > 0 || asksForChemicals(question)) && !mentionsExpert(answer)) {
    answer = `${answer}\n\n${EXPERT_REFERRAL}`;
  }
  return { text: answer, redacted: removed > 0 };
}
