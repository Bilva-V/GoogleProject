// Finds GPNs that may describe the same fastener, labels each group with
// Google's rulings, and folds duplicates into physical parts.

import type { Attr, Evidence, Group, GroupKind, PartRecord, Phase, PhysicalPart, Spec } from './types';
import { NUMERIC_ATTRS, PHASES } from './types';
import { stripPack } from './parse';

/**
 * Sizes this close are a near match (Google: 5.4 vs 5.5 mm): 0.25 mm, or 3% of the size
 * when that is more, so a 22.2 mm washer OD is near 22.7 mm the way a 5.4 mm ID is near 5.5 mm.
 */
export const NEAR_MM = 0.25;
export const NEAR_REL = 0.03;
export const nearTolerance = (mm: number) => Math.max(NEAR_MM, NEAR_REL * Math.abs(mm));

/** Attributes compared when deciding whether two records disagree. */
export const COMPARED: Attr[] = [
  'thread', 'pitch', 'lengthMm', 'head', 'drive', 'material', 'finish', 'washer', 'type',
  'fits', 'idMm', 'odMm', 'thicknessMm',
];

export const PHASE_RANK: Record<Phase, number> = Object.fromEntries(PHASES.map((p, i) => [p, i])) as Record<Phase, number>;

const val = (s: Spec, a: Attr) => (s as unknown as Record<string, string | number | null>)[a] ?? null;

export function isNear(a: Attr, x: unknown, y: unknown): boolean {
  if (!NUMERIC_ATTRS.has(a) || a === 'pitch') return false;
  if (typeof x !== 'number' || typeof y !== 'number') return false;
  const d = Math.abs(x - y);
  return d > 0.001 && d <= nearTolerance(Math.min(x, y)) + 0.001;
}

/**
 * Two stated values that are not a real difference: equal, within the size
 * tolerance, or a bare 'black' (a colour) next to a specific black finish.
 */
export function compatible(a: Attr, x: string | number, y: string | number): boolean {
  if (x === y) return true;
  if (typeof x === 'number' && typeof y === 'number' && Math.abs(x - y) <= 0.001) return true;
  if (isNear(a, x, y)) return true;
  if (a === 'type') {
    // a fender washer is a flat washer with a large outer diameter
    const pair = [String(x), String(y)].sort().join('|');
    if (pair === 'fender|flat') return true;
  }
  if (a === 'finish') {
    const [p, q] = [String(x), String(y)];
    if ((p === 'black' && q.startsWith('black')) || (q === 'black' && p.startsWith('black'))) return true;
  }
  return false;
}

export function differences(members: PartRecord[]): Attr[] {
  const out: Attr[] = [];
  for (const a of COMPARED) {
    const stated = members.map((p) => val(p.spec, a)).filter((v): v is string | number => v !== null);
    let differs = false;
    for (let i = 0; i < stated.length && !differs; i++) {
      for (let j = i + 1; j < stated.length; j++) {
        if (!compatible(a, stated[i], stated[j])) { differs = true; break; }
      }
    }
    if (differs) out.push(a);
  }
  return out;
}

function hasNearDifference(members: PartRecord[]): boolean {
  for (const a of COMPARED) {
    const stated = members.map((p) => val(p.spec, a)).filter((v) => v !== null);
    for (let i = 0; i < stated.length; i++) for (let j = i + 1; j < stated.length; j++) if (isNear(a, stated[i], stated[j])) return true;
  }
  return false;
}

export function statedCount(s: Spec): number {
  return COMPARED.filter((a) => val(s, a) !== null).length;
}

/** Higher volume first; a missing (pending) volume after any known one. */
export function byVolume(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

/** Production first, then volume, then supplier count, then the fullest description. */
export function preferredOrder(a: PartRecord, b: PartRecord): number {
  return (
    PHASE_RANK[a.phase] - PHASE_RANK[b.phase] ||
    byVolume(a.volume, b.volume) ||
    b.suppliers.length - a.suppliers.length ||
    statedCount(b.spec) - statedCount(a.spec) ||
    a.gpn.localeCompare(b.gpn)
  );
}

const packSize = (p: PartRecord) => p.spec.packQty ?? 1;

/**
 * Lower-case, 'w/' spelled out, punctuation dropped. A decimal point between
 * digits is kept as 'p' so 'M1.6' and 'M16' stay apart.
 */
export function normDesc(d: string): string {
  return d
    .toLowerCase()
    .replace(/\bw\/\s*/g, 'with ')
    .replace(/(\d)\.(\d)/g, '$1p$2')
    .replace(/[^a-z0-9]/g, '');
}

export function classify(evidence: Evidence, members: PartRecord[], diffs: Attr[]): GroupKind {
  if (evidence === 'same specs except one size') return 'near';
  if (diffs.length) return evidence === 'supplier part numbers share a base' ? 'variant' : 'conflict';
  if (hasNearDifference(members)) return 'near';
  if (new Set(members.map(packSize)).size > 1) return 'pack';
  return 'duplicate';
}

type Raw = { id: string; evidence: Evidence; detail: string | null; members: PartRecord[] };

const normMpn = (s: string) => s.toUpperCase().trim();

function sharedMpn(parts: PartRecord[]): Raw[] {
  const by = new Map<string, Map<string, PartRecord>>();
  for (const p of parts) for (const s of p.suppliers) {
    const k = normMpn(s.partNumber);
    if (k.length < 3) continue;
    if (!by.has(k)) by.set(k, new Map());
    by.get(k)!.set(p.gpn, p);
  }
  return [...by].filter(([, m]) => m.size > 1).map(([k, m]) => ({
    id: `mpn:${k}`, evidence: 'same supplier part number' as const, detail: k, members: [...m.values()],
  }));
}

function mpnPrefix(parts: PartRecord[]): Raw[] {
  const MIN = 6;
  const SEP = new Set(['-', '_', ' ', '(', '/']);
  const owners = new Map<string, Set<PartRecord>>();
  for (const p of parts) for (const s of p.suppliers) {
    const k = normMpn(s.partNumber);
    if (k.length < MIN) continue;
    if (!owners.has(k)) owners.set(k, new Set());
    owners.get(k)!.add(p);
  }
  const keys = [...owners.keys()].sort();
  const out: Raw[] = [];
  for (const base of keys) {
    const members = new Map<string, PartRecord>();
    for (const p of owners.get(base)!) members.set(p.gpn, p);
    let extended = false;
    for (const other of keys) {
      if (other === base || !other.startsWith(base) || !SEP.has(other[base.length])) continue;
      for (const p of owners.get(other)!) { if (!members.has(p.gpn)) extended = true; members.set(p.gpn, p); }
    }
    if (extended && members.size > 1) {
      out.push({ id: `prefix:${base}`, evidence: 'supplier part numbers share a base', detail: `${base}…`, members: [...members.values()] });
    }
  }
  return out;
}

function sameDescription(parts: PartRecord[], strip: boolean): Raw[] {
  const by = new Map<string, PartRecord[]>();
  for (const p of parts) {
    const k = normDesc(strip ? stripPack(p.description) : p.description);
    if (k.length < 6) continue;
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(p);
  }
  const out: Raw[] = [];
  for (const [k, ms] of by) {
    if (ms.length < 2) continue;
    if (strip && new Set(ms.map(packSize)).size < 2) continue;
    out.push({
      id: `${strip ? 'pack' : 'desc'}:${k.slice(0, 40)}`,
      evidence: strip ? 'same description except pack size' : 'same description',
      detail: null,
      members: ms,
    });
  }
  return out;
}

/** Same family, same stated attributes (at least three), sizes within tolerance and one not equal. */
function nearSize(parts: PartRecord[]): Raw[] {
  const out: Raw[] = [];
  const byFamily = new Map<string, PartRecord[]>();
  for (const p of parts) {
    if (!p.spec.family) continue;
    if (!byFamily.has(p.spec.family)) byFamily.set(p.spec.family, []);
    byFamily.get(p.spec.family)!.push(p);
  }
  for (const group of byFamily.values()) {
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i];
      const b = group[j];
      let shared = 0;
      let near: Attr | null = null;
      let ok = true;
      for (const k of COMPARED) {
        const x = val(a.spec, k);
        const y = val(b.spec, k);
        if (x === null && y === null) continue;
        if (x === null || y === null) { ok = false; break; }
        if (x === y) { shared++; continue; }
        if (isNear(k, x, y)) { near = near ?? k; continue; }
        ok = false;
        break;
      }
      if (ok && near && shared >= 3) {
        const x = val(a.spec, near);
        const y = val(b.spec, near);
        out.push({
          id: `near:${a.gpn}+${b.gpn}`,
          evidence: 'same specs except one size',
          detail: `${near === 'lengthMm' ? 'length' : near === 'idMm' ? 'ID' : near === 'odMm' ? 'OD' : 'thickness'} ${x} vs ${y} mm`,
          members: [a, b],
        });
      }
    }
  }
  return out;
}

const EVIDENCE_ORDER: Evidence[] = [
  'same supplier part number',
  'same description',
  'same description except pack size',
  'supplier part numbers share a base',
  'same specs except one size',
];

export function findGroups(parts: PartRecord[]): Group[] {
  const raw = [
    ...sharedMpn(parts),
    ...sameDescription(parts, false),
    ...sameDescription(parts, true),
    ...mpnPrefix(parts),
    ...nearSize(parts),
  ].sort((a, b) => EVIDENCE_ORDER.indexOf(a.evidence) - EVIDENCE_ORDER.indexOf(b.evidence));

  // the same set of GPNs found two ways is reported once, under the strongest evidence
  const seen = new Set<string>();
  const groups: Group[] = [];
  for (const r of raw) {
    const gpns = [...new Set(r.members.map((p) => p.gpn))].sort();
    const key = gpns.join('|');
    if (gpns.length < 2 || seen.has(key)) continue;
    seen.add(key);
    const members = gpns.map((g) => r.members.find((p) => p.gpn === g)!);
    const diffs = differences(members);
    const kind = classify(r.evidence, members, diffs);
    groups.push({
      id: r.id,
      kind,
      evidence: r.evidence,
      detail: r.detail,
      gpns,
      differences: diffs,
      preferred: kind === 'conflict' ? null : [...members].sort(preferredOrder)[0].gpn,
      phasesDiffer: new Set(members.map((p) => p.phase)).size > 1,
    });
  }
  return groups.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Join GPNs that are the same physical part (duplicate and pack-variant groups)
 * and give each part its preferred GPN. Near sizes, variants and conflicts stay
 * separate parts: they are different, or one record is wrong.
 */
export function physicalParts(parts: PartRecord[], groups: Group[]): PhysicalPart[] {
  const parent = new Map<string, string>(parts.map((p) => [p.gpn, p.gpn]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  for (const g of groups) {
    if (g.kind !== 'duplicate' && g.kind !== 'pack') continue;
    const inScope = g.gpns.filter((x) => parent.has(x));
    for (let i = 1; i < inScope.length; i++) parent.set(find(inScope[i]), find(inScope[0]));
  }
  const byRoot = new Map<string, PartRecord[]>();
  for (const p of parts) {
    const r = find(p.gpn);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r)!.push(p);
  }
  return [...byRoot.values()].map((members) => {
    const sorted = [...members].sort(preferredOrder);
    return {
      id: `part:${sorted[0].gpn}`,
      preferred: sorted[0].gpn,
      gpns: sorted.map((p) => p.gpn),
      spec: mergeSpecs(sorted),
    };
  });
}

/** The preferred record's spec, with gaps filled from aliases where the aliases agree. */
export function mergeSpecs(sorted: PartRecord[]): Spec {
  const base: Spec = { ...sorted[0].spec };
  const rec = base as unknown as Record<string, unknown>;
  for (const a of COMPARED) {
    if (rec[a] !== null) continue;
    const values = sorted.slice(1).map((p) => val(p.spec, a)).filter((v) => v !== null);
    if (values.length && values.every((v) => v === values[0])) rec[a] = values[0];
  }
  return base;
}
