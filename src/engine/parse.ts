// Reads a fastener's spec out of free text. The same rules read Agile's
// descriptions at build time and what an engineer types into the search line.
// A field the text does not state is null: never inferred, never defaulted.

import type { Family, Spec } from './types';
import {
  BUILT_IN_WASHER,
  DRIVE,
  FINISH,
  HEAD,
  MATERIAL,
  NUT_TYPE,
  SCREW_TYPE,
  WASHER_TYPE,
  findTerm,
  hasTerm,
} from './vocab';

// ---- helpers --------------------------------------------------------------

/** ISO 261 metric pitches, coarse and fine. */
const ISO_PITCHES = [
  0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.75, 0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4,
];
/** Threads per inch used by UNC/UNF number and fractional sizes. */
const TPI = new Set([80, 72, 64, 56, 48, 44, 40, 36, 32, 28, 24, 20, 18, 16, 14, 13, 12, 11, 10, 9, 8]);

/** A number after 'M<d> x' is a pitch only if it is a standard pitch below half the diameter. */
export function isPlausiblePitch(diameterMm: number, value: number): boolean {
  return ISO_PITCHES.some((p) => Math.abs(p - value) < 0.001) && value < diameterMm / 2;
}

/** '5/8' → 0.625, '1-1/2' → 1.5, '.75' → 0.75 */
export function parseNumber(text: string): number | null {
  const t = text.trim();
  let m = t.match(/^(\d+)[\s-](\d+)\/(\d+)$/);
  if (m) return Number(m[1]) + Number(m[2]) / Number(m[3]);
  m = t.match(/^(\d+)\/(\d+)$/);
  if (m) return Number(m[2]) ? Number(m[1]) / Number(m[2]) : null;
  if (/^\d*\.?\d+$/.test(t)) return Number(t);
  return null;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
export const inchToMm = (inch: number) => round3(inch * 25.4);

/** Tidy the text: one quote style, no stray encoding debris. */
export function clean(text: string): string {
  return (text || '')
    .replace(/_x[0-9a-f]{4}_/gi, ' ')
    .replace(/[“”″]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/×/g, 'x')
    .replace(/[^\x20-\x7e°]/g, ' ');
}

/** A reduced fraction (3/16, 5/8) rather than a thread written with a slash (10/32). */
function isFraction(a: number, b: number): boolean {
  return [2, 4, 8, 16, 32, 64].includes(b) && a < b && a % 2 === 1;
}

// ---- family ---------------------------------------------------------------

const NOUNS: [RegExp, Family][] = [
  [/\b(?:cage\s+)?nuts?\b|\blocknut\b|\b(?:threaded\s+)?inserts?\b/i, 'nut'],
  [/\bwashers?\b/i, 'washer'],
  [/\bstandoffs?\b|\bspacers?\b/i, 'standoff'],
  [/\bscrews?\b|\bbolts?\b/i, 'screw'],
];

/** The noun that appears first decides, e.g. 'Screw, ... w/ Washer' is a screw. */
function firstNoun(text: string): Family | null {
  let best: { at: number; family: Family } | null = null;
  for (const [re, family] of NOUNS) {
    const m = text.match(re);
    if (m && m.index !== undefined && (!best || m.index < best.at)) best = { at: m.index, family };
  }
  return best?.family ?? null;
}

export function familyFromRecord(partType: string, description: string): { family: Family | null; misfiled: boolean } {
  const pt = partType.toLowerCase();
  const noun = firstNoun(description);
  if (pt.includes('washer')) return { family: noun === 'nut' ? 'nut' : 'washer', misfiled: false };
  if (pt.includes('nut')) return { family: 'nut', misfiled: false };
  if (pt.includes('standoff')) return { family: 'standoff', misfiled: false };
  if (pt.includes('bolts & screws')) {
    if (noun === 'nut' || noun === 'standoff' || noun === 'washer') return { family: noun, misfiled: false };
    return { family: 'screw', misfiled: false };
  }
  // Another part type: a fastener only if the description leads with a fastener noun.
  const lead = description.match(/^\W*(?:hdw\W+)?(screws?|bolts?|nuts?|washers?|standoffs?)\b/i);
  if (!lead) return { family: null, misfiled: false };
  return { family: firstNoun(lead[0]), misfiled: true };
}

// ---- thread, pitch --------------------------------------------------------

export function readThread(text: string): string | null {
  const metric = text.match(/(?<![A-Za-z0-9.])M(\d{1,2}(?:\.\d)?)(?![\d.])/i);
  if (metric) return `M${metric[1]}`;

  const frac = text.match(/(?<![\d./])(\d{1,2}\/\d{1,2})\s*(?:"|in(?:ch)?)?\s*-\s*(\d{1,2})(?![\d/.])/i);
  if (frac && TPI.has(Number(frac[2]))) return `${frac[1]}-${frac[2]}`;

  const num = text.match(/(?<![\d./A-Za-z-])#?(\d{1,2})\s*-\s*(\d{2,3})(?![\d/.])/);
  if (num && Number(num[1]) <= 14 && TPI.has(Number(num[2]))) return `${Number(num[1])}-${num[2]}`;

  // 10/32, 12/24 written with a slash; 3/16 and 5/8 are fractions, not threads
  const slash = text.match(/(?<![\d./A-Za-z-])#?(\d{1,2})\/(\d{2})(?![\d/.])/);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    if (a <= 14 && TPI.has(b) && !isFraction(a, b)) return `${a}-${b}`;
  }
  return null;
}

export function readPitch(text: string): number | null {
  let m = text.match(/(?<![A-Za-z0-9.])M(\d+(?:\.\d+)?)\s*[-xX]\s*(\d*\.?\d+)/i);
  if (m && isPlausiblePitch(Number(m[1]), Number(m[2]))) return Number(m[2]);
  m = text.match(/(\d*\.?\d+)\s*mm\s*pitch/i) || text.match(/pitch\s*[:=]?\s*(\d*\.?\d+)\s*mm/i);
  if (m) {
    const n = Number(m[1]);
    if (ISO_PITCHES.some((p) => Math.abs(p - n) < 0.001)) return n;
  }
  return null;
}

// ---- length ---------------------------------------------------------------

const LEN = String.raw`(\d+-\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)`;

export function readLength(text: string, opts: { query?: boolean } = {}): { mm: number; imperial: boolean } | null {
  const mm = (n: number | null) => (n !== null && n > 0 ? { mm: round3(n), imperial: false } : null);
  const inch = (n: number | null) => (n !== null && n > 0 ? { mm: inchToMm(n), imperial: true } : null);
  let m: RegExpMatchArray | null;

  // 8mm long, 6 mm L, 12mm Length
  m = text.match(/(\d+(?:\.\d+)?)\s*mm\s*(?:L|LG|long|length)\b/i);
  if (m) return mm(Number(m[1]));

  // Length 20mm, L=10
  m = text.match(/\blength\s*[:=]?\s*(\d+(?:\.\d+)?)\s*mm\b/i) || text.match(/\bL\s*=\s*(\d+(?:\.\d+)?)\s*(?:mm)?\b/i);
  if (m) return mm(Number(m[1]));

  // 5/8 inch Long, .75in Length, 3/8"L, 1.75" L
  m = text.match(new RegExp(String.raw`(?<![\d./-])${LEN}\s*(?:in(?:ch(?:es)?)?\b|")\s*(?:L|LG|long|length|lg)\b`, 'i'));
  if (m) return inch(parseNumber(m[1]));
  m = text.match(/\blength\s*[:=]?\s*(\d*\.?\d+)\s*(?:in(?:ch)?\b|")/i);
  if (m) return inch(parseNumber(m[1]));

  // M3-0.5X8MM, M3x8mm, M3 x 0.5 x 6 mm
  m = text.match(/(?<![A-Za-z0-9.])M(\d+(?:\.\d+)?)(\s*[-xX]\s*\d*\.?\d+)?\s*[xX]\s*(\d+(?:\.\d+)?)\s*mm/i);
  if (m && (m[2] || !isPlausiblePitch(Number(m[1]), Number(m[3])))) return mm(Number(m[3]));

  // M3x5, M5 X 12: unitless after a metric thread; not when it is the pitch
  m = text.match(/(?<![A-Za-z0-9.])M(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)(?![\d.]|\s*[xX]|\s*mm)/i);
  if (m && !isPlausiblePitch(Number(m[1]), Number(m[2]))) return mm(Number(m[2]));

  // 2-56 X .375LG, #6-32 x 1/4, 10-32 x 0.75 IN, 1/4-20 x 5/8", 4-40 x 6.35mm
  m = text.match(
    new RegExp(String.raw`(?:(?<![0-9./A-Za-z-])#?\d{1,2}|\d{1,2}\/\d{1,2})\s*-\s*\d{2,3}\s*[xX]\s*${LEN}\s*(mm|in(?:ch)?|"|LG|L)?(?![A-Za-z0-9])`, 'i')
  );
  if (m) return m[2] && m[2].toLowerCase() === 'mm' ? mm(parseNumber(m[1])) : inch(parseNumber(m[1]));

  // Last resort: a bare '<n> mm' that is not part of the thread, a pitch, or a washer size.
  const bare = /(?<![xX-]\s*)(?<![\d.])(\d+(?:\.\d+)?)\s*mm\b(?!\s*(?:pitch|thread|id|od|i\.d|o\.d|thk|thick|dia|head|hex|drive|wide|width|panel))/i;
  if (opts.query || /\b(?:screws?|bolts?|standoffs?|length|long)\b/i.test(text)) {
    m = text.match(bare);
    if (m) return mm(Number(m[1]));
  }
  // A query may give the length in inches: 1/2 in, 3/8"
  if (opts.query) {
    m = text.match(new RegExp(String.raw`(?<![\d./-])${LEN}\s*(?:in(?:ch(?:es)?)?\b|")`, 'i'));
    if (m) return inch(parseNumber(m[1]));
  }
  return null;
}

// ---- washer sizes ---------------------------------------------------------

function dim(text: string, words: string, fallbackUnit: 'mm' | 'in'): number | null {
  const num = String.raw`(\d+\/\d+|\d*\.?\d+(?:\s*(?:-|to)\s*\d*\.?\d+)?)`;
  const unit = String.raw`(mm|in(?:ch)?|")?`;
  const after = new RegExp(String.raw`(?<![\d./-])${num}\s*${unit}\s*(?:${words})\b`, 'i');
  const before = new RegExp(String.raw`\b(?:${words})\s*[:=]?\s*${num}\s*${unit}`, 'i');
  const m = text.match(after) || text.match(before);
  if (!m) return null;
  const parts = m[1].includes('/')
    ? [parseNumber(m[1]) ?? NaN]
    : m[1].split(/\s*(?:-|to)\s*/).map(Number);
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (!parts.length) return null;
  const value = parts.reduce((a, b) => a + b, 0) / parts.length; // a range is read as its middle
  const u = (m[2] || '').toLowerCase();
  const unitUsed = u === 'mm' ? 'mm' : u ? 'in' : fallbackUnit;
  return unitUsed === 'mm' ? round3(value) : inchToMm(value);
}

const NOMINAL_DECIMALS: Record<string, string> = {
  '.25': '1/4in', '.250': '1/4in', '.3125': '5/16in', '.375': '3/8in', '.5': '1/2in', '.50': '1/2in',
  '.625': '5/8in', '.75': '3/4in',
};

/** The screw size a washer fits: 'M5', '#10', '1/4in'. */
export function readFits(text: string, thread: string | null): string | null {
  if (thread) {
    const frac = thread.match(/^(\d+\/\d+)-\d+$/);
    if (frac) return `${frac[1]}in`;
    const num = thread.match(/^(\d+)-\d+$/);
    if (num) return `#${num[1]}`;
    return thread;
  }
  let m = text.match(/(?:\bNo\.?\s*|#)(\d{1,2})\b/i);
  if (m) return `#${Number(m[1])}`;
  m = text.match(/\b(\d{1,2}\/\d{1,2})\s*(?:"|in(?:ch)?)?\s*(?:screw|bolt|size|sz|wide)\b/i)
    || text.match(/\b(?:for|size)\s+(\d{1,2}\/\d{1,2})/i)
    || text.match(/(?<![\d./-])(\d{1,2}\/\d{1,2})\s*(?:"|in(?:ch)?)(?![\w/])/i);
  if (m) {
    const [a, b] = m[1].split('/').map(Number);
    if (b && a < b) return `${m[1]}in`;
  }
  m = text.match(/(?<![\d./-])(\d)\s*(?:in(?:ch)?|")(?![\w/])/i);
  if (m) return `${m[1]}in`;
  m = text.match(/(?<![\d.])0?(\.(?:25|250|3125|375|50?|625|75))\b/);
  if (m && NOMINAL_DECIMALS[m[1]]) return NOMINAL_DECIMALS[m[1]];
  return null;
}

// ---- packaging ------------------------------------------------------------

const PACK_PATTERNS: RegExp[] = [
  /\((\d+)\s*(?:pieces|pcs|pc|pack|count)\b[^)]*\)?/i,
  /\b(\d+)\s*(?:PACK|PK|PCS|PC|COUNT|PIECES)\b/i,
  /\b(\d+)\s*\/\s*(?:PKG|PK|PACK|BAG|BOX)\b/i,
  /\b(?:packs?|pks?|box|bag)\s+of\s+(\d+)\b/i,
];

export function readPack(text: string): number | null {
  for (const re of PACK_PATTERNS) {
    const m = text.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

/** The description with pack wording removed, for single-vs-bulk comparison. */
export function stripPack(text: string): string {
  let t = text;
  for (const re of PACK_PATTERNS) t = t.replace(new RegExp(re.source, 'gi'), ' ');
  return t.replace(/\b(?:BOM|Ordering)\s+UOM\s*=?\s*(?:1\s*EA)?/gi, ' ');
}

// ---- the parser -----------------------------------------------------------

const QUERY_HEAD = [
  ['flat', ['FLAT', 'CSK']],
  ['socket', ['SOCKET', 'CAP']],
  ['round', ['ROUND']],
  ['flange', ['FLANGE', 'FLANGED']],
] as const;

const EMPTY: Spec = {
  family: null, type: null, thread: null, pitch: null, lengthMm: null, lengthImperial: false,
  head: null, drive: null, driveSize: null, material: null, materialGrade: null, strength: null,
  finish: null, washer: null, fits: null, idMm: null, odMm: null, thicknessMm: null,
  packQty: null, kit: false,
};

export const emptySpec = (): Spec => ({ ...EMPTY });

function readStrength(text: string): string | null {
  const m = text.match(/\b(?:class|grade|gr\.?)\s*(\d{1,2}(?:\.\d)?)\b/i) || text.match(/\b(8\.8|10\.9|12\.9)\b/);
  if (!m) return null;
  return m[1].includes('.') ? `class ${m[1]}` : `grade ${m[1]}`;
}

function readDriveSize(text: string): string | null {
  const t = text.match(/\b(T\d{1,2})\b/);
  if (t) return t[1].toUpperCase();
  const p = text.match(/\bPH\s?#?([0-3])\b/i) || text.match(/PHIL(?:LIPS)?\s*#\s*([0-3])/i);
  return p ? `PH${p[1]}` : null;
}

/**
 * Read a spec from text. `family` is decided by the caller for descriptions
 * (from the part type) and by the words themselves for queries.
 */
export function parseText(raw: string, family: Family | null, opts: { query?: boolean } = {}): Spec {
  const text = clean(raw);
  const spec = emptySpec();
  spec.family = family;

  // Phrases that would fool the other readers: a square cone washer is not a
  // square drive, a nylon patch is not a nylon screw.
  const washerPhrase = /\b(?:w\/|with)?\s*(?:square\s+cone|sq\.?\s*conical|square\s+conical|square|split\s*lock|lock|external[\s-]tooth|internal[\s-]tooth|ext\.?[\s-]tooth|int\.?[\s-]tooth|flat|plain|nylon|captive|contained|loose|conical|cone|cup|crest\s+cup)?\s*washers?\b/gi;
  const noWasher = text.replace(washerPhrase, ' ');
  const noShapes = noWasher.replace(/\bSQ(?:UARE)?\.?\s*(?:CONE|CONICAL|NUT|NECK|HOLE)\b/gi, ' ');
  const noPatch = text.replace(/\bnylon\s+(?:patch|insert|washers?|lock(?:ing)?)\b|\bnylok\b|\bnylock\b/gi, ' ');

  spec.thread = readThread(text);
  spec.pitch = spec.thread?.startsWith('M') ? readPitch(text) : null;
  spec.materialGrade = (text.match(/\b(18-8|A2|A4|304|316|410|303)\b/) || [])[1] ?? null;
  spec.material = findTerm(noPatch, MATERIAL);
  spec.finish = findTerm(text, FINISH);
  spec.strength = readStrength(text);
  spec.packQty = readPack(text);
  spec.kit = /\bkits?\b/i.test(text);

  const fam = family;
  if (fam === 'screw' || fam === 'standoff' || fam === null) {
    const len = readLength(text, opts);
    if (len) {
      spec.lengthMm = len.mm;
      spec.lengthImperial = len.imperial;
    }
  }
  if (fam === 'screw' || fam === null) {
    spec.head = findTerm(noWasher, HEAD);
    // People type the bare word; descriptions use it for other things ('flat washer').
    if (!spec.head && opts.query) spec.head = findTerm(noWasher, QUERY_HEAD);
    spec.drive = findTerm(noShapes, DRIVE);
    // A bare 'hex': on a bolt it is the head (wrench-driven); on a screw whose
    // head is something else it is a hex socket.
    const bareHex = /\bhex\b(?!\s*(?:head|hd|nut|washer|standoff|spacer))/i.test(noShapes);
    if (bareHex && fam === 'screw') {
      if (/\bbolts?\b/i.test(text) && !spec.head) spec.head = 'hex';
      else if (!spec.drive && spec.head !== 'hex') spec.drive = 'hex';
    }
    spec.driveSize = readDriveSize(text);
    if (!spec.drive && spec.driveSize) spec.drive = spec.driveSize.startsWith('T') ? 'torx' : 'phillips';
    spec.type = findTerm(noWasher, SCREW_TYPE);
  }
  if (fam === 'screw' || fam === 'nut' || fam === null) {
    spec.washer = findTerm(text, BUILT_IN_WASHER);
  }
  if (fam === 'nut') spec.type = findTerm(text, NUT_TYPE);
  if (fam === 'washer') {
    spec.type = findTerm(text, WASHER_TYPE);
    const fallback: 'mm' | 'in' = /\bmm\b/i.test(text) || spec.thread?.startsWith('M') ? 'mm' : 'in';
    spec.idMm = dim(text, String.raw`ID|I\.D\.|inner\s+dia(?:meter)?|inside\s+dia(?:meter)?`, fallback);
    spec.odMm = dim(text, String.raw`OD|O\.D\.|outer\s+dia(?:meter)?|outside\s+dia(?:meter)?`, fallback);
    spec.thicknessMm = dim(text, String.raw`THK|thick(?:ness)?|thk\.`, fallback);
    spec.fits = readFits(text, spec.thread);
    spec.thread = null; // a washer fits a size; it has no thread of its own
    spec.pitch = null;
    spec.washer = null;
  }
  if (fam === 'standoff') {
    spec.type = /\bhex\b/i.test(text) ? 'hex' : /\bround\b/i.test(text) ? 'round' : null;
  }
  return spec;
}

/** Parse an Agile record's description. */
export function parseDescription(partType: string, description: string): { spec: Spec; misfiled: boolean } {
  const { family, misfiled } = familyFromRecord(partType, description);
  return { spec: parseText(description, family), misfiled };
}

// ---- queries --------------------------------------------------------------

const QUERY_FAMILY: [RegExp, Family][] = [
  [/\bwashers?\b/i, 'washer'],
  [/\b(?:nuts?|locknuts?|inserts?)\b/i, 'nut'],
  [/\b(?:standoffs?|spacers?)\b/i, 'standoff'],
  [/\b(?:screws?|bolts?|shcs|bhcs|fhcs)\b/i, 'screw'],
];

/** Words a query may contain that carry no spec. */
const FILLER = new Set([
  'a', 'an', 'the', 'with', 'w', 'and', 'for', 'of', 'in', 'mm', 'inch', 'in', 'x', 'head', 'drive',
  'thread', 'long', 'length', 'size', 'need', 'i', 'looking', 'screw', 'screws', 'bolt', 'bolts', 'nut',
  'nuts', 'washer', 'washers', 'standoff', 'standoffs', 'fastener', 'fasteners', 'metric', 'imperial',
]);

/**
 * Parse what an engineer types: "m3 x 8 pan torx stainless", "#6-32 x 1/4 flat phillips",
 * "m5 split lock washer". Returns the spec and the words nothing understood, so the UI
 * can say so instead of silently dropping them.
 */
export function parseQuery(raw: string): { spec: Spec; unread: string[] } {
  const text = clean(raw);
  // The noun said first decides: 'screw with a split lock washer' is a screw.
  let family: Family | null = null;
  let at = Infinity;
  for (const [re, f] of QUERY_FAMILY) {
    const m = text.match(re);
    if (m && m.index !== undefined && m.index < at) { at = m.index; family = f; }
  }
  let spec = parseText(text, family, { query: true });
  if (!family) {
    // infer only from what was said: a head, drive or length means a screw; a size in ID/OD a washer
    if (spec.head || spec.drive || spec.lengthMm !== null) family = 'screw';
    if (family) spec = parseText(text, family, { query: true });
  }

  const understood = (word: string) => {
    const w = word.toLowerCase();
    if (FILLER.has(w)) return true;
    if (/^[#\d./x×"-]+(mm|in|lg|l)?$/i.test(w)) return true; // sizes and dimensions
    if (/^m\d/i.test(w)) return true; // M3, m3x8
    if (/^(t\d{1,2}|ph[0-3])$/i.test(w)) return true;
    const up = word.toUpperCase();
    for (const table of [HEAD, DRIVE, MATERIAL, FINISH, BUILT_IN_WASHER, WASHER_TYPE, SCREW_TYPE, NUT_TYPE]) {
      for (const [, variants] of table) for (const v of variants) if (v.split(/\s+/).includes(up) || hasTerm(up, v)) return true;
    }
    return false;
  };
  const unread = text
    .split(/[\s,;]+/)
    .map((w) => w.replace(/^[(]+|[)]+$/g, ''))
    .filter((w) => w && !understood(w));
  return { spec, unread };
}
