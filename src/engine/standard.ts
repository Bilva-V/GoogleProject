// The proposed description standard (SOW objective 2): the fields every fastener
// description states, in a fixed order and vocabulary, so the next engineer can
// find the part. Generates the standard text from a spec and names what's missing.

import type { Attr, Family, Spec } from './types';

/** Fields the standard requires per family, in the order they are written. */
export const STANDARD: Record<Family, { required: Attr[]; optional: Attr[]; example: string }> = {
  screw: {
    required: ['head', 'drive', 'thread', 'lengthMm', 'material'],
    optional: ['type', 'pitch', 'finish', 'washer', 'strength'],
    example: 'SCREW, PAN HEAD, PHILLIPS, M3-0.5 X 8 MM, STEEL, ZINC PLATED, W/ SPLIT LOCK WASHER',
  },
  nut: {
    required: ['type', 'thread', 'material'],
    optional: ['pitch', 'finish', 'washer', 'strength'],
    example: 'NUT, CAGE, 10-32, STEEL, ZINC PLATED',
  },
  washer: {
    required: ['type', 'fits', 'material'],
    optional: ['idMm', 'odMm', 'thicknessMm', 'finish'],
    example: 'WASHER, FLAT, M5, 5.3 ID X 10 OD X 1 THK MM, STEEL, ZINC PLATED',
  },
  standoff: {
    required: ['thread', 'lengthMm', 'material'],
    optional: ['type', 'finish'],
    example: 'STANDOFF, HEX, M3 X 10 MM, BRASS, NICKEL PLATED',
  },
};

const FRACTIONS = [2, 4, 8, 16, 32, 64];

/** 9.525 → '3/8', 25.4 → '1', 19.05 → '3/4' */
export function inchFraction(mm: number): string {
  const inch = mm / 25.4;
  const whole = Math.floor(inch + 1e-6);
  const rest = inch - whole;
  if (rest < 1e-3) return String(whole);
  for (const d of FRACTIONS) {
    const n = Math.round(rest * d);
    if (Math.abs(rest - n / d) < 0.0005) {
      const frac = n === d ? '' : `${n}/${d}`;
      if (!frac) return String(whole + 1);
      return whole ? `${whole}-${frac}` : frac;
    }
  }
  return inch.toFixed(3).replace(/^0/, '');
}

export const trimNum = (n: number) => String(Math.round(n * 100) / 100);

export function formatLength(s: Pick<Spec, 'lengthMm' | 'lengthImperial'>): string | null {
  if (s.lengthMm === null) return null;
  return s.lengthImperial ? `${inchFraction(s.lengthMm)} in` : `${trimNum(s.lengthMm)} mm`;
}

const U = (s: string | null) => (s ? s.toUpperCase() : null);

export interface StandardText {
  text: string;
  missing: Attr[];
  complete: boolean;
}

export function standardDescription(s: Spec): StandardText | null {
  const f = s.family;
  if (!f) return null;
  const missing = STANDARD[f].required.filter((a) => (s as unknown as Record<string, unknown>)[a] === null);
  const need = (a: Attr, v: string | null) => v ?? `[${a === 'lengthMm' ? 'LENGTH' : a.toUpperCase()}?]`;
  const parts: string[] = [];

  if (f === 'screw') {
    parts.push(s.type && s.type !== 'machine' ? `SCREW, ${U(s.type)}` : 'SCREW');
    parts.push(need('head', s.head ? `${U(s.head)} HEAD` : null));
    parts.push(need('drive', U(s.drive)));
    const thread = s.thread ? (s.pitch ? `${s.thread}-${trimNum(s.pitch)}` : s.thread) : null;
    const len = formatLength(s);
    parts.push(`${need('thread', thread)} X ${need('lengthMm', len ? len.toUpperCase() : null)}`);
  } else if (f === 'nut') {
    parts.push('NUT');
    parts.push(need('type', U(s.type)));
    parts.push(need('thread', s.thread ? (s.pitch ? `${s.thread}-${trimNum(s.pitch)}` : s.thread) : null));
  } else if (f === 'washer') {
    parts.push('WASHER');
    parts.push(need('type', U(s.type)));
    parts.push(need('fits', U(s.fits)));
    const dims = [
      s.idMm !== null ? `${trimNum(s.idMm)} ID` : null,
      s.odMm !== null ? `${trimNum(s.odMm)} OD` : null,
      s.thicknessMm !== null ? `${trimNum(s.thicknessMm)} THK` : null,
    ].filter(Boolean);
    if (dims.length) parts.push(`${dims.join(' X ')} MM`);
  } else {
    parts.push(s.type ? `STANDOFF, ${U(s.type)}` : 'STANDOFF');
    const len = formatLength(s);
    parts.push(`${need('thread', s.thread)} X ${need('lengthMm', len ? len.toUpperCase() : null)}`);
  }

  const material = s.material ? U(s.material + (s.materialGrade && s.material === 'stainless steel' ? ` ${s.materialGrade}` : '')) : null;
  parts.push(need('material', material));
  if (s.strength) parts.push(U(s.strength)!);
  if (s.finish) parts.push(U(s.finish)!);
  if (s.washer && f !== 'washer') parts.push(s.washer === 'captive' ? 'CAPTIVE WASHER (SEMS)' : `W/ ${U(s.washer)} WASHER`);
  if (s.packQty && s.packQty > 1) parts.push(`PACK OF ${s.packQty}`);

  return { text: parts.join(', '), missing, complete: missing.length === 0 };
}
