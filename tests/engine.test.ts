import type { Catalog, PartRecord, Phase } from '../src/engine/types';
import { parseDescription, parseQuery } from '../src/engine/parse';
import { findGroups, normDesc, physicalParts } from '../src/engine/groups';
import { computeHealth } from '../src/engine/health';
import { DEFAULT_SCOPE, check, closest, findByNumber, numberPrefixMatches, numberSuggestions, search, volumeTiers } from '../src/engine/search';
import { withReviews } from '../src/ui/store';
import { inchFraction, standardDescription } from '../src/engine/standard';

let n = 0;
function rec(gpn: string, description: string, o: { type?: string; phase?: Phase; mpns?: string[]; volume?: number | null } = {}): PartRecord {
  const partType = o.type ?? 'Fastener-Bolts & Screws';
  const { spec, misfiled } = parseDescription(partType, description);
  return {
    gpn, description, partType, phase: o.phase ?? 'Production',
    suppliers: (o.mpns ?? []).map((partNumber) => ({ name: 'Supplier', partNumber })),
    sources: [{ sheet: 'Set 02', row: ++n }], spec, volume: o.volume ?? null, misfiled,
  };
}

function catalog(parts: PartRecord[]): Catalog {
  const groups = findGroups(parts);
  const physical = physicalParts(parts, groups);
  return { builtAt: '', source: '', parts, groups, physical, health: computeHealth(parts, groups, physical) };
}

const kindOf = (c: Catalog, gpns: string[]) => c.groups.find((g) => gpns.every((x) => g.gpns.includes(x)))?.kind;

describe("Google's rulings", () => {
  it('same description, different lifecycle → duplicate, folded into one part under the Production GPN', () => {
    const c = catalog([
      rec('1106617', 'SCREW WITH CAPTIVE  WASHER (SEM), M3-0.5X8MM, T10, PAN, ST, ZC'),
      rec('1249277', 'Screw w/captive Washer (SEM), M3-0.5X8mm, T10, Pan, ST, ZC', { phase: 'Prototype' }),
    ]);
    expect(kindOf(c, ['1106617', '1249277'])).toBe('duplicate');
    expect(c.physical).toHaveLength(1);
    expect(c.physical[0].preferred).toBe('1106617');
  });
  it('single vs bulk pack → pack variant, kept as GPNs but one physical part', () => {
    const c = catalog([
      rec('07099416', 'Cage Nuts, 10-32, 0.025in - 0.063in Panel Range, Steel, 100/PKG', { type: 'Fastener-Nut' }),
      rec('07099419', 'Cage Nuts, 10-32, 0.025in - 0.063in Panel Range, Steel, 50/PKG', { type: 'Fastener-Nut' }),
    ]);
    expect(kindOf(c, ['07099416', '07099419'])).toBe('pack');
    expect(c.physical).toHaveLength(1);
    expect(c.physical[0].gpns).toHaveLength(2);
  });
  it('5.4 vs 5.5 mm → near, not folded, even with a shared part number', () => {
    const c = catalog([
      rec('1192976', 'Washer, M5, 5.5mm ID, 10mm OD, 1mm THK, Flat, Steel, Zinc Plated', { type: 'Fastener-Washers', mpns: ['IFW-A1-AA-10019'] }),
      rec('1247551', 'Washer, M5, 5.4mm ID, 10mm OD, 1mm Thick, Steel, Zinc Plated', { type: 'Fastener-Washers', mpns: ['IFW-A1-AA-10019'] }),
    ]);
    expect(kindOf(c, ['1192976', '1247551'])).toBe('near');
    expect(c.physical).toHaveLength(2);
  });
  it('a shared base part number with a real difference → variant', () => {
    const c = catalog([
      rec('1094168', 'SCREW WITH CAPTIVE  WASHER, M3-0.5X8MM, PH1, PAN, ST, ZC', { mpns: ['G721-03007-01'] }),
      rec('1106617', 'SCREW WITH CAPTIVE  WASHER (SEM), M3-0.5X8MM, T10, PAN, ST, ZC', { mpns: ['G721-03007-01-TORX'] }),
    ]);
    expect(kindOf(c, ['1094168', '1106617'])).toBe('variant');
    expect(c.groups[0].differences).toEqual(['drive']);
  });
  it('the same exact part number with disagreeing descriptions → conflict, no preferred part', () => {
    const c = catalog([
      rec('07070024', 'Screw, M3x5, PHP, w/ Square Cone Washer, STL Zn, RoHS', { mpns: ['90317A111'] }),
      rec('07082586', 'SCREW, PHP, M3 X 5mm, INTERNAL TOOTH WASHER, STAINLESS STEEL', { mpns: ['90317A111'] }),
    ]);
    expect(c.groups[0]).toMatchObject({ kind: 'conflict', preferred: null, differences: ['material', 'washer'] });
  });
  it('keeps M1.6 and M16 apart', () => {
    expect(normDesc('WASHER, FLAT, ISO 7089, M1.6, A2 SST')).not.toBe(normDesc('WASHER, FLAT, ISO 7089, M16, A2 SST'));
  });
});

describe('search', () => {
  const c = catalog([
    rec('2001', 'Screw, M3x0.5mm Thread, 8mm Long, Pan Head, Phillips, Steel', { volume: 100 }),
    rec('2002', 'Screw, M3x0.5mm Thread, 8mm Long, Pan Head, Phillips, Steel, Zinc Plated', { volume: 5000 }),
    rec('2003', 'Screw, M3x0.5mm Thread, 8.2mm Long, Pan Head, Phillips, Steel'),
    rec('2004', 'Screw, M3x0.5mm Thread, Pan Head, Phillips, Steel'),
    rec('2005', 'Screw, M3x0.5mm Thread, 8mm Long, Pan Head, Torx, Steel'),
    rec('2006', 'Screw, M3x0.5mm Thread, 8mm Long, Pan Head, Phillips, Steel, Black Oxide', { phase: 'End of Production' }),
  ]);
  const r = search(c, parseQuery('m3 x 8 pan phillips').spec, DEFAULT_SCOPE, 'm3 x 8 pan phillips');

  it('bands the results', () => {
    expect(r.ready.map((h) => h.part.preferred)).toEqual(['2002', '2001']); // higher volume first
    expect(r.close.map((h) => h.part.preferred)).toEqual(['2003']); // 8.2 mm is within 0.25
    expect(r.maybe.map((h) => h.part.preferred)).toEqual(['2004']); // length not stated
    expect(r.excluded.map((h) => h.part.preferred)).toEqual(['2005']); // torx
    expect(r.outOfScope).toBe(1); // End of Production
  });
  it('a more specific value still matches; a vaguer one is unknown', () => {
    expect(check('finish', 'black', 'black oxide')).toBe('match');
    expect(check('finish', 'black oxide', 'black')).toBe('unknown');
    expect(check('pitch', 0.5, 0.45)).toBe('differs');
  });
  it('finds a part by its GPN or a supplier part number', () => {
    const c2 = catalog([rec('07070024', 'Screw, M3x5, PHP', { mpns: ['90317A111'] })]);
    expect(search(c2, parseQuery('90317A111').spec, DEFAULT_SCOPE, '90317A111').byNumber).toHaveLength(1);
  });
});

describe('standard description', () => {
  it('writes the standard for a complete screw', () => {
    const s = parseQuery('m3 x 8 pan phillips steel zinc split lock').spec;
    expect(standardDescription(s)).toEqual({
      text: 'SCREW, PAN HEAD, PHILLIPS, M3 X 8 MM, STEEL, ZINC PLATED, W/ SPLIT LOCK WASHER',
      missing: [],
      complete: true,
    });
  });
  it('names what is missing', () => {
    const r = standardDescription(parseQuery('m3 pan screw').spec)!;
    expect(r.complete).toBe(false);
    expect(r.missing).toEqual(['drive', 'lengthMm', 'material']);
    expect(r.text).toContain('[LENGTH?]');
  });
  it('writes imperial lengths as fractions', () => {
    expect(inchFraction(9.525)).toBe('3/8');
    expect(inchFraction(25.4)).toBe('1');
    expect(inchFraction(41.275)).toBe('1-5/8');
  });
});

import catalogJson from '../src/generated/catalog.json';
import { specToQuery } from '../src/engine/query';
import { askedAttrs } from '../src/engine/search';

describe('the search line round-trips', () => {
  it('every real part spec, written as a query, reads back the same', () => {
    const cat = catalogJson as unknown as Catalog;
    const failures: string[] = [];
    for (const p of cat.physical) {
      const asked = askedAttrs(p.spec);
      const back = parseQuery(specToQuery(p.spec)).spec;
      for (const a of asked) {
        const x = (p.spec as unknown as Record<string, unknown>)[a];
        const y = (back as unknown as Record<string, unknown>)[a];
        const same = typeof x === 'number' && typeof y === 'number' ? Math.abs(x - y) < 0.01 : x === y;
        if (!same) failures.push(`${p.preferred} ${a}: ${x} → "${specToQuery(p.spec)}" → ${y}`);
      }
    }
    expect(failures.slice(0, 15)).toEqual([]);
  });
});

describe('found in the demo run (Oct 28)', () => {
  it('treats #8 as the general form of 8-32', () => {
    expect(check('thread', '#8', '8-32')).toBe('match');
    expect(check('thread', '8-32', '#8')).toBe('unknown');
    expect(check('thread', '#8', '10-32')).toBe('differs');
  });
  it('suggests a GPN whose leading zero was dropped, without matching it', () => {
    const c = catalog([rec('07070024', 'Screw, M3x5, PHP')]);
    expect(findByNumber(c, '7070024')).toHaveLength(0);
    expect(numberSuggestions(c, '7070024')).toEqual([{ typed: '7070024', gpn: '07070024' }]);
  });
  it('lists the part that differs in one detail before one that states almost nothing', () => {
    const c = catalog([
      rec('3001', 'Screw, M3x0.5mm Thread, 8mm Long, Pan Head, Torx, Steel'),
      rec('3002', 'Screws, M3, Cooler Master'),
    ]);
    const r = search(c, parseQuery('m3 x 8 pan torx brass').spec, DEFAULT_SCOPE);
    expect(closest(r).map((h) => h.part.preferred)).toEqual(['3001', '3002']);
  });
  it('a reviewer’s kept GPN becomes the one Find recommends', () => {
    const c = catalog([
      rec('4001', 'Screw, M3x0.5mm Thread, 8mm Long, Pan Head, Torx, Steel'),
      rec('4002', 'Screw, M3x0.5mm Thread, 8mm Long, Pan Head, Torx, Steel', { phase: 'Prototype' }),
    ]);
    expect(c.physical[0].preferred).toBe('4001');
    const reviewed = withReviews(c, { [c.groups[0].id]: { decision: 'consolidate', preferred: '4002', note: '' } });
    expect(reviewed.physical[0]).toMatchObject({ preferred: '4002', chosenInReview: true });
  });
});

describe('ideas from the team prototypes (Oct 28)', () => {
  it('scales the near-size tolerance with size (Valentina): 0.25 mm, or 3% when larger', () => {
    expect(check('odMm', 22.225, 22.733)).toBe('near'); // 0.508 mm on a 22 mm OD
    expect(check('idMm', 5.4, 5.5)).toBe('near');
    expect(check('idMm', 5.4, 5.8)).toBe('differs');
  });
  it('finds parts whose supplier number starts with what was typed (Valentina)', () => {
    const c = catalog([
      rec('5001', 'Washer, External Tooth, #10, Steel', { type: 'Fastener-Washers', mpns: ['91114A011'] }),
      rec('5002', 'Washer, External Tooth, #8, Steel', { type: 'Fastener-Washers', mpns: ['91114A010'] }),
    ]);
    expect(findByNumber(c, '91114')).toHaveLength(0);
    expect(numberPrefixMatches(c, '91114').parts).toHaveLength(2);
  });
  it('tiers parts by volume against every part with volume (Ishan)', () => {
    const parts = Array.from({ length: 10 }, (_, i) => rec(`60${i}`, `Screw, M${i + 2}x0.5mm Thread, 8mm Long, Pan Head`, { volume: [10000, 5000, 3000, 2000, 1000, 800, 600, 400, 300, 100][i] }));
    const t = volumeTiers(catalog(parts));
    const tierOf = (gpn: string) => t.get(catalog(parts).physical.find((p) => p.preferred === gpn)!.id);
    expect(tierOf('600')).toBe('high');
    expect(tierOf('601')).toBe('high');
    expect(tierOf('602')).toBe('regular');
    expect(tierOf('609')).toBe('low');
  });
});
