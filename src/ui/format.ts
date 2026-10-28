import type { Attr, Family, Spec } from '../engine/types';
import { inchFraction, trimNum } from '../engine/standard';

export function formatValue(attr: Attr, v: string | number | null, spec?: Pick<Spec, 'lengthImperial'>): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') {
    if (attr === 'lengthMm' && spec?.lengthImperial) {
      const f = inchFraction(v);
      return f.includes('.') ? `${trimNum(v)} mm` : `${f} in`;
    }
    return `${trimNum(v)} mm`;
  }
  if (attr === 'head') return `${v} head`;
  return v;
}

export const FAMILY_LABEL: Record<Family, string> = {
  screw: 'Screw or bolt',
  nut: 'Nut',
  washer: 'Washer',
  standoff: 'Standoff',
};

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function downloadCsv(name: string, rows: (string | number | null)[][]) {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
