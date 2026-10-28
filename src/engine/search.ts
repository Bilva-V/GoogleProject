// Search: a spec asked for, against every physical part.
// Rules: a value the part does not state is unknown, never a match; a stated
// difference excludes; a size within tolerance is a near match (Google ruling 2).

import type { Attr, Catalog, Family, PartRecord, Phase, PhysicalPart, Spec } from './types';
import { ATTRS_BY_FAMILY, NUMERIC_ATTRS } from './types';
import { PHASE_RANK, nearTolerance, statedCount } from './groups';

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
    if (attr !== 'pitch' && NUMERIC_ATTRS.has(attr) && d <= nearTolerance(asked) + 0.001) return 'near';
    return 'differs';
  }
  if (asked === found) return 'match';
  // A size given without threads per inch (#8, 5/16) is the general form of 8-32, 5/16-18.
  if (attr === 'thread') {
    const base = (t: string) => t.replace(/^#/, '').replace(/-\d+$/, '');
    const general = (t: string) => /^#\d+$|^\d+\/\d+$/.test(t);
    if (base(String(asked)) === base(String(found))) {
      if (general(String(asked))) return 'match'; // asked #8, part says 8-32
      if (general(String(found))) return 'unknown'; // asked 8-32, part only says #8
    }
  }
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
  return numberMatches(catalog, text).parts;
}

/** The parts a typed GPN or supplier part number points to, and which typed words did the pointing. */
export function numberMatches(catalog: Catalog, text: string): { parts: PhysicalPart[]; words: Set<string> } {
  const typed = text.split(/[\s,;]+/).filter((w) => normId(w).length >= 5);
  const words = new Set<string>();
  if (!typed.length) return { parts: [], words };
  const want = new Map(typed.map((w) => [normId(w), w]));
  const hits = new Set<string>();
  for (const p of catalog.parts) {
    for (const id of [p.gpn, ...p.suppliers.map((s) => s.partNumber)]) {
      const w = want.get(normId(id));
      if (w) {
        hits.add(p.gpn);
        words.add(w);
      }
    }
  }
  return { parts: catalog.physical.filter((pp) => pp.gpns.some((g) => hits.has(g))), words };
}

/**
 * Parts whose GPN or supplier part number starts with a typed number, for when the
 * whole number matched nothing: '91114' finds 91114A011 and 91114A029. A lead, not a match.
 */
export function numberPrefixMatches(catalog: Catalog, text: string, limit = 20): { parts: PhysicalPart[]; words: Set<string> } {
  const typed = text.split(/[\s,;]+/).filter((w) => /\d/.test(w) && normId(w).length >= 5);
  const words = new Set<string>();
  const hits = new Set<string>();
  for (const w of typed) {
    const k = normId(w);
    for (const p of catalog.parts) {
      for (const id of [p.gpn, ...p.suppliers.map((s) => s.partNumber)]) {
        const n = normId(id);
        if (n !== k && n.startsWith(k)) {
          hits.add(p.gpn);
          words.add(w);
        }
      }
    }
  }
  return { parts: catalog.physical.filter((pp) => pp.gpns.some((g) => hits.has(g))).slice(0, limit), words };
}

export type VolumeTier = 'high' | 'regular' | 'low';

/** Share of parts with volume that count as high runners, and the low-runner cut (Ishan's tiers). */
export const HIGH_RUNNER_SHARE = 0.2;
export const LOW_RUNNER_SHARE = 0.05;

/**
 * Each physical part's tier against every part that has volume, so a tier means the
 * same thing whatever the search. Parts without volume have no tier.
 */
export function volumeTiers(catalog: Catalog): Map<string, VolumeTier> {
  const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));
  const totals = catalog.physical
    .map((pp) => {
      const vols = pp.gpns.map((g) => byGpn.get(g)?.volume).filter((v): v is number => typeof v === 'number');
      return { id: pp.id, qty: vols.length ? vols.reduce((a, b) => a + b, 0) : null };
    })
    .filter((x): x is { id: string; qty: number } => x.qty !== null);
  const tiers = new Map<string, VolumeTier>();
  if (!totals.length) return tiers;
  const sorted = totals.map((t) => t.qty).sort((a, b) => b - a);
  const cutoff = sorted[Math.max(0, Math.ceil(sorted.length * HIGH_RUNNER_SHARE) - 1)];
  for (const t of totals) tiers.set(t.id, t.qty > 0 && t.qty >= cutoff ? 'high' : t.qty < sorted[0] * LOW_RUNNER_SHARE ? 'low' : 'regular');
  return tiers;
}

/**
 * GPNs a typed number probably meant when it matched nothing: spreadsheets drop
 * leading zeros (07070024 → 7070024). Only suggested, never matched automatically,
 * because 7018362 and 07018362 are different GPNs.
 */
export function numberSuggestions(catalog: Catalog, text: string): { typed: string; gpn: string }[] {
  const gpns = new Set(catalog.parts.map((p) => p.gpn));
  const out: { typed: string; gpn: string }[] = [];
  for (const w of text.split(/[\s,;]+/)) {
    if (!/^\d{5,8}$/.test(w) || gpns.has(w)) continue;
    for (const pad of ['0', '00']) if (gpns.has(pad + w)) out.push({ typed: w, gpn: pad + w });
  }
  return out;
}

/**
 * The stocked parts nearest a spec, for when nothing fits: fewest stated differences
 * first, then fewest unknowns. Records that state none of what was asked are left out.
 */
export function closest(result: SearchResult, n = 3): Hit[] {
  const said = (h: Hit) => h.checks.some((c) => c.verdict === 'match' || c.verdict === 'near');
  const count = (h: Hit, v: Verdict) => h.checks.filter((c) => c.verdict === v).length;
  const score = (h: Hit) => count(h, 'differs') * 2 + count(h, 'unknown') + count(h, 'near') * 0.5;
  return [...result.close, ...result.maybe, ...result.excluded]
    .filter(said)
    .sort((a, b) => score(a) - score(b) || rank(a, b))
    .slice(0, n);
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
