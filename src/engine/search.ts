// Search: a spec asked for, against every physical part.
// Rules: a value the part does not state is unknown, never a match; a stated
// difference excludes; a size within tolerance is a near match (Google ruling 2).

import type { Attr, Catalog, Family, PartRecord, Phase, PhysicalPart, Spec } from './types';
import { ATTRS_BY_FAMILY, NUMERIC_ATTRS } from './types';
import { NEAR_MM, PHASE_RANK, statedCount } from './groups';

export type Verdict = 'match' | 'near' | 'unknown' | 'differs';
export type Band = 'ready' | 'close' | 'maybe';

export interface Check {
  attr: Attr;
  asked: string | number;
  found: string | number | null;
  verdict: Verdict;
}

export interface Hit {
  part: PhysicalPart;
  preferred: PartRecord;
  members: PartRecord[];
  checks: Check[];
  band: Band | null; // null = excluded
  volume: number | null;
}

export interface Scope {
  phases: Phase[];
  kits: boolean;
}

export const DEFAULT_SCOPE: Scope = {
  phases: ['Production', 'Preliminary', 'Planning', 'Prototype'],
  kits: false,
};

/** A record that says something more specific than what was asked still matches it. */
const GENERAL: Record<string, string> = {
  'black oxide': 'black',
  'black zinc': 'black',
  fender: 'flat',
  'alloy steel': 'steel',
  'carbon steel': 'steel',
  'spring steel': 'steel',
};

const value = (s: Spec, a: Attr) => (s as unknown as Record<string, string | number | null>)[a] ?? null;

export function check(attr: Attr, asked: string | number, found: string | number | null): Verdict {
  if (found === null) return 'unknown';
  if (typeof asked === 'number' && typeof found === 'number') {
    const d = Math.abs(asked - found);
    if (d <= 0.001) return 'match';
    if (attr !== 'pitch' && NUMERIC_ATTRS.has(attr) && d <= NEAR_MM + 0.001) return 'near';
    return 'differs';
  }
  if (asked === found) return 'match';
  if (GENERAL[String(found)] === asked) return 'match'; // asked 'black', part says 'black oxide'
  if (GENERAL[String(asked)] === found) return 'unknown'; // asked 'black oxide', part only says 'black'
  return 'differs';
}

/** The attributes a spec asks about: every non-null field the family uses. */
export function askedAttrs(q: Spec): Attr[] {
  if (!q.family) return [];
  return ATTRS_BY_FAMILY[q.family].filter((a) => value(q, a) !== null);
}

export interface SearchResult {
  ready: Hit[];
  close: Hit[];
  maybe: Hit[];
  /** in scope but ruled out by a stated difference, closest first */
  excluded: Hit[];
  /** parts found by a GPN or supplier part number typed in the query */
  byNumber: Hit[];
  outOfScope: number;
}

export function hitFor(catalog: Catalog, part: PhysicalPart, q: Spec | null, byGpn: Map<string, PartRecord>): Hit {
  const members = part.gpns.map((g) => byGpn.get(g)!).filter(Boolean);
  const preferred = byGpn.get(part.preferred)!;
  const checks: Check[] = q
    ? askedAttrs(q).map((attr) => {
        const asked = value(q, attr)!;
        const found = value(part.spec, attr);
        return { attr, asked, found, verdict: check(attr, asked, found) };
      })
    : [];
  let band: Band | null = 'ready';
  if (checks.some((c) => c.verdict === 'differs')) band = null;
  else if (checks.some((c) => c.verdict === 'near')) band = 'close';
  else if (checks.some((c) => c.verdict === 'unknown')) band = 'maybe';
  const known = members.map((m) => m.volume).filter((v): v is number => v !== null);
  return { part, preferred, members, checks, band, volume: known.length ? known.reduce((a, b) => a + b, 0) : null };
}

/** Lifecycle of the preferred GPN → volume (pending last) → fewer unknowns → more suppliers → fuller description. */
export function rank(a: Hit, b: Hit): number {
  const unknown = (h: Hit) => h.checks.filter((c) => c.verdict === 'unknown').length;
  const suppliers = (h: Hit) => h.members.reduce((n, m) => n + m.suppliers.length, 0);
  const vol = (x: number | null, y: number | null) => (x === y ? 0 : x === null ? 1 : y === null ? -1 : y - x);
  return (
    PHASE_RANK[a.preferred.phase] - PHASE_RANK[b.preferred.phase] ||
    vol(a.volume, b.volume) ||
    unknown(a) - unknown(b) ||
    suppliers(b) - suppliers(a) ||
    statedCount(b.part.spec) - statedCount(a.part.spec) ||
    a.part.preferred.localeCompare(b.part.preferred)
  );
}

const normId = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Physical parts whose GPN or supplier part number appears in the text. */
export function findByNumber(catalog: Catalog, text: string): PhysicalPart[] {
  const tokens = text.split(/[\s,;]+/).map(normId).filter((t) => t.length >= 5);
  if (!tokens.length) return [];
  const want = new Set(tokens);
  const hits = new Set<string>();
  for (const p of catalog.parts) {
    if (want.has(normId(p.gpn)) || p.suppliers.some((s) => want.has(normId(s.partNumber)))) hits.add(p.gpn);
  }
  return catalog.physical.filter((pp) => pp.gpns.some((g) => hits.has(g)));
}

export function search(catalog: Catalog, q: Spec, scope: Scope, text = ''): SearchResult {
  const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));
  const result: SearchResult = { ready: [], close: [], maybe: [], excluded: [], byNumber: [], outOfScope: 0 };

  result.byNumber = findByNumber(catalog, text).map((pp) => hitFor(catalog, pp, null, byGpn));

  if (!q.family) return result;
  for (const part of catalog.physical) {
    if (part.spec.family !== q.family) continue;
    const preferred = byGpn.get(part.preferred)!;
    if (!scope.phases.includes(preferred.phase) || (!scope.kits && part.spec.kit)) {
      result.outOfScope++;
      continue;
    }
    const hit = hitFor(catalog, part, q, byGpn);
    if (hit.band === 'ready') result.ready.push(hit);
    else if (hit.band === 'close') result.close.push(hit);
    else if (hit.band === 'maybe') result.maybe.push(hit);
    else result.excluded.push(hit);
  }
  result.ready.sort(rank);
  result.close.sort(rank);
  result.maybe.sort(rank);
  const differs = (h: Hit) => h.checks.filter((c) => c.verdict === 'differs').length;
  result.excluded.sort((a, b) => differs(a) - differs(b) || rank(a, b));
  return result;
}

/** How many in-scope parts of a family state each value of an attribute: for pickers. */
export function valueCounts(catalog: Catalog, family: Family, attr: Attr): { value: string | number; count: number }[] {
  const counts = new Map<string | number, number>();
  for (const p of catalog.physical) {
    if (p.spec.family !== family) continue;
    const v = value(p.spec, attr);
    if (v === null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts]
    .map(([v, count]) => ({ value: v, count }))
    .sort((a, b) =>
      typeof a.value === 'number' && typeof b.value === 'number' ? a.value - b.value : b.count - a.count || String(a.value).localeCompare(String(b.value))
    );
}
