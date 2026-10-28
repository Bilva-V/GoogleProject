// Writes a spec back as a line the parser reads. Chip edits rewrite the search
// line through this, so the line is always the one source of truth.

import type { Attr, Spec } from './types';
import { inchFraction, trimNum } from './standard';

const DRIVE_WORD: Record<string, string> = { hex: 'hex drive', square: 'square drive' };
const SCREW_TYPE_WORD: Record<string, string> = { set: 'set screw', rack: 'rack screw', 'captive panel': 'captive panel' };
const NUT_TYPE_WORD: Record<string, string> = { lock: 'lock' };

export function specToQuery(s: Spec): string {
  const w: string[] = [];
  // an inch length that is not a clean fraction is written in mm, which reads back exactly
  const frac = s.lengthMm !== null && s.lengthImperial ? inchFraction(s.lengthMm) : null;
  const len = s.lengthMm === null ? null : frac && !frac.includes('.') ? `${frac}in` : `${trimNum(s.lengthMm)}mm`;
  const thread = s.thread ? (s.pitch !== null && s.thread.startsWith('M') ? `${s.thread}-${trimNum(s.pitch)}` : s.thread) : null;

  if (s.family === 'screw') {
    w.push('screw');
    if (thread) w.push(len ? `${thread} x ${len}` : thread);
    else if (len) w.push(`${len} long`);
    if (s.head) w.push(`${s.head} head`);
    if (s.drive) w.push(DRIVE_WORD[s.drive] ?? s.drive);
    if (s.type) w.push(SCREW_TYPE_WORD[s.type] ?? s.type);
  } else if (s.family === 'nut') {
    w.push(s.type ? `${NUT_TYPE_WORD[s.type] ?? s.type} nut` : 'nut');
    if (thread) w.push(thread);
  } else if (s.family === 'washer') {
    w.push(s.type ? `${s.type} washer` : 'washer');
    if (s.fits) w.push(s.fits.endsWith('in') ? `for ${s.fits} screw` : s.fits);
    if (s.idMm !== null) w.push(`${trimNum(s.idMm)}mm id`);
    if (s.odMm !== null) w.push(`${trimNum(s.odMm)}mm od`);
    if (s.thicknessMm !== null) w.push(`${trimNum(s.thicknessMm)}mm thk`);
  } else if (s.family === 'standoff') {
    w.push(s.type ? `${s.type} standoff` : 'standoff');
    if (thread) w.push(len ? `${thread} x ${len}` : thread);
    else if (len) w.push(`${len} long`);
  }
  if (s.material) w.push(s.material);
  if (s.finish) w.push(s.finish === 'plain' ? 'plain finish' : s.finish);
  if (s.strength) w.push(s.strength);
  if (s.washer && s.family !== 'washer') w.push(s.washer === 'captive' ? 'sems' : `with ${s.washer} washer`);
  return w.join(' ');
}

/** The spec with one attribute changed (null removes it). */
export function withAttr(s: Spec, attr: Attr, value: string | number | null): Spec {
  const next = { ...s, [attr]: value } as Spec;
  if (attr === 'lengthMm') next.lengthImperial = false;
  if (attr === 'thread') {
    if (value === null || !String(value).startsWith('M')) next.pitch = null;
  }
  return next;
}
