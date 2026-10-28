// How big the problem is, computed from the catalog.

import type { Attr, Family, Group, GroupKind, Health, PartRecord, PhysicalPart } from './types';
import { ATTRS_BY_FAMILY } from './types';

/** The fields a description must state for an engineer to tell what the part is. */
export const KEY_FIELDS: Record<Family, Attr[]> = {
  screw: ['thread', 'lengthMm', 'head'],
  nut: ['thread', 'type'],
  washer: ['fits', 'type'],
  standoff: ['thread', 'lengthMm'],
};

const FAMILIES: Family[] = ['screw', 'nut', 'washer', 'standoff'];

export function completeness(p: PartRecord): 'complete' | 'partial' | 'vague' | null {
  const f = p.spec.family;
  if (!f) return null;
  const rec = p.spec as unknown as Record<string, unknown>;
  const stated = KEY_FIELDS[f].filter((a) => rec[a] !== null).length;
  if (stated === KEY_FIELDS[f].length) return 'complete';
  // fewer than half the key fields: an engineer cannot tell what the part is
  return stated / KEY_FIELDS[f].length < 0.5 ? 'vague' : 'partial';
}

export function computeHealth(parts: PartRecord[], groups: Group[], physical: PhysicalPart[]): Health {
  const zero = () => ({ total: 0, complete: 0, partial: 0, vague: 0 });
  const byFamily = Object.fromEntries(FAMILIES.map((f) => [f, 0])) as Record<Family, number>;
  const comp = Object.fromEntries(FAMILIES.map((f) => [f, zero()])) as Health['completeness'];
  const coverage = Object.fromEntries(FAMILIES.map((f) => [f, {}])) as Health['coverage'];
  for (const p of parts) {
    const f = p.spec.family;
    if (!f) continue;
    byFamily[f]++;
    const c = completeness(p)!;
    comp[f].total++;
    comp[f][c]++;
  }
  for (const f of FAMILIES) {
    const members = parts.filter((p) => p.spec.family === f);
    for (const a of ATTRS_BY_FAMILY[f]) {
      const n = members.filter((p) => (p.spec as unknown as Record<string, unknown>)[a] !== null).length;
      coverage[f][a] = members.length ? n / members.length : 0;
    }
  }
  const kinds: GroupKind[] = ['duplicate', 'pack', 'near', 'variant', 'conflict'];
  const groupsByKind = Object.fromEntries(kinds.map((k) => [k, groups.filter((g) => g.kind === k).length])) as Record<GroupKind, number>;
  return {
    inScope: parts.length,
    byFamily,
    physicalParts: physical.length,
    gpnsInGroups: new Set(groups.flatMap((g) => g.gpns)).size,
    completeness: comp,
    coverage,
    groupsByKind,
    misfiled: parts.filter((p) => p.misfiled).length,
    kits: parts.filter((p) => p.spec.kit).length,
  };
}
