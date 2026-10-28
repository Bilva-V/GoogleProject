// The catalog, vendor volumes dropped in by the user, clean-up decisions and the
// current route. Everything stays in this browser tab; decisions are kept in
// localStorage so a reviewer can come back to them.

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import raw from '../generated/catalog.json';
import type { Catalog, GroupKind } from '../engine/types';
import { findGroups, physicalParts } from '../engine/groups';
import { computeHealth } from '../engine/health';

export const BASE = raw as unknown as Catalog;

/** Rebuild groups, physical parts and health with volumes applied: preferred parts follow volume. */
export function withVolumes(base: Catalog, volumes: Map<string, number>): Catalog {
  if (!volumes.size) return base;
  const parts = base.parts.map((p) => ({ ...p, volume: volumes.get(p.gpn) ?? p.volume }));
  const groups = findGroups(parts);
  const physical = physicalParts(parts, groups);
  return { ...base, parts, groups, physical, health: computeHealth(parts, groups, physical) };
}

/** Parse a GPN,Volume CSV. Accepts a header row, quotes and thousands separators. */
export function parseVolumes(text: string): { volumes: Map<string, number>; skipped: number } {
  const volumes = new Map<string, number>();
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '').trim());
    const gpn = cells[0];
    const n = Number((cells[1] ?? '').replace(/[,\s]/g, ''));
    if (!gpn || !Number.isFinite(n) || cells[1] === '') { skipped++; continue; }
    volumes.set(gpn, n);
  }
  return { volumes, skipped: Math.max(0, skipped - 1) }; // the header is not a skip
}

/**
 * Apply reviewers' choices: where Clean up kept a different GPN for a part that is
 * folded together (duplicates, pack sizes), Find recommends that GPN instead.
 * A group marked 'keep separate' is left to the rules.
 */
export function withReviews(base: Catalog, reviews: Record<string, Review>): Catalog {
  const chosen = new Map<string, string>(); // any GPN in the group → the GPN kept
  for (const g of base.groups) {
    const r = reviews[g.id];
    if (!r?.preferred || r.decision === 'separate' || (g.kind !== 'duplicate' && g.kind !== 'pack')) continue;
    for (const x of g.gpns) chosen.set(x, r.preferred);
  }
  if (!chosen.size) return base;
  const physical = base.physical.map((pp) => {
    const keep = pp.gpns.map((x) => chosen.get(x)).find((x) => x && pp.gpns.includes(x));
    return keep && keep !== pp.preferred ? { ...pp, preferred: keep, chosenInReview: true } : pp;
  });
  return { ...base, physical };
}

export type Decision = 'consolidate' | 'separate' | 'check';
export interface Review {
  decision: Decision | null;
  preferred: string | null;
  note: string;
}

export type Route =
  | { page: 'find'; q: string }
  | { page: 'new'; q: string }
  | { page: 'cleanup'; kind: GroupKind }
  | { page: 'health' }
  | { page: 'standard' };

export function parseHash(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query);
  switch (path) {
    case 'new': return { page: 'new', q: params.get('q') ?? '' };
    case 'cleanup': return { page: 'cleanup', kind: (params.get('kind') as GroupKind) || 'duplicate' };
    case 'health': return { page: 'health' };
    case 'standard': return { page: 'standard' };
    default: return { page: 'find', q: params.get('q') ?? '' };
  }
}

export function toHash(r: Route): string {
  switch (r.page) {
    case 'find': return r.q ? `#/find?q=${encodeURIComponent(r.q)}` : '#/find';
    case 'new': return `#/new?q=${encodeURIComponent(r.q)}`;
    case 'cleanup': return `#/cleanup?kind=${r.kind}`;
    default: return `#/${r.page}`;
  }
}

interface Store {
  catalog: Catalog;
  volumes: Map<string, number>;
  setVolumes: (v: Map<string, number>) => void;
  reviews: Record<string, Review>;
  setReview: (groupId: string, r: Partial<Review>) => void;
  route: Route;
  go: (r: Route, replace?: boolean) => void;
}

const Ctx = createContext<Store | null>(null);
const REVIEWS_KEY = 'fastener-finder.reviews.v1';

function loadReviews(): Record<string, Review> {
  try {
    return JSON.parse(localStorage.getItem(REVIEWS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [volumes, setVolumes] = useState<Map<string, number>>(new Map());
  const [reviews, setReviews] = useState<Record<string, Review>>(loadReviews);
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  const catalog = useMemo(() => withReviews(withVolumes(BASE, volumes), reviews), [volumes, reviews]);

  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback((r: Route, replace = false) => {
    const h = toHash(r);
    if (replace) history.replaceState(null, '', h);
    else if (location.hash !== h) history.pushState(null, '', h);
    setRoute(r);
  }, []);

  const setReview = useCallback((id: string, r: Partial<Review>) => {
    setReviews((prev) => {
      const base: Review = { decision: null, preferred: null, note: '' };
      const next = { ...prev, [id]: { ...base, ...prev[id], ...r } };
      try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(next)); } catch { /* private window: keep in memory */ }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ catalog, volumes, setVolumes, reviews, setReview, route, go }), [catalog, volumes, reviews, setReview, route, go]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
