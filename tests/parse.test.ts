// Golden tests: real descriptions from the October 2026 snapshot, and queries
// the way an engineer types them.
import { parseDescription, parseQuery, readFits, readLength, readPitch, readThread } from '../src/engine/parse';

const screw = (d: string) => parseDescription('Fastener-Bolts & Screws', d).spec;
const washer = (d: string) => parseDescription('Fastener-Washers', d).spec;
const nut = (d: string) => parseDescription('Fastener-Nut', d).spec;

describe('screw descriptions', () => {
  it('reads a complete JDM-style description', () => {
    const s = screw('SCREW WITH CAPTIVE  WASHER, M3-0.5X8MM, PH1, PAN, ST, ZC');
    expect(s).toMatchObject({
      family: 'screw', thread: 'M3', pitch: 0.5, lengthMm: 8, head: 'pan', drive: 'phillips',
      driveSize: 'PH1', material: 'steel', finish: 'zinc plated', washer: 'captive',
    });
  });
  it('reads M3x5 with no unit as 5 mm, and a square cone washer is not a square drive', () => {
    const s = screw('Screw, M3x5, PHP, w/ Square Cone Washer, STL Zn, RoHS');
    expect(s).toMatchObject({ thread: 'M3', lengthMm: 5, head: 'pan', drive: 'phillips', washer: 'square cone', material: 'steel', finish: 'zinc plated' });
    expect(s.pitch).toBeNull();
  });
  it('reads imperial thread x length in inches', () => {
    const s = screw('SCREW, 2-56 X .375LG, PHP W/SQ CONICAL WASHER, STL Zn, RoHS');
    expect(s.thread).toBe('2-56');
    expect(s.lengthMm).toBeCloseTo(9.525);
    expect(s.lengthImperial).toBe(true);
    expect(s.drive).toBe('phillips');
  });
  it('reads 3/8"L and the HDW prefix', () => {
    const s = screw('HDW,SCREWS, PANHEAD PHLPS, 8-32, 3/8"L, 100PK');
    expect(s).toMatchObject({ thread: '8-32', head: 'pan', drive: 'phillips', packQty: 100 });
    expect(s.lengthMm).toBeCloseTo(9.525);
  });
  it('keeps the typo "Trust Head" as truss and reads Box of 100', () => {
    const s = screw('Screw, Black, 10-32 x 0.75 IN, PH2, Trust Head, Pilot Pin, Steel, BOM UOM = 1 EA, Ordering UOM = Box of 100');
    expect(s).toMatchObject({ thread: '10-32', head: 'truss', drive: 'phillips', finish: 'black', packQty: 100 });
    expect(s.lengthMm).toBeCloseTo(19.05);
  });
  it('reads a hex bolt as a hex head, not a hex socket', () => {
    const s = screw('Fastener-Bolt, Hex, Thread 1/4in-20, UNC, 1in L, Coarse, 651 Silicon Bronze');
    expect(s).toMatchObject({ type: 'bolt', thread: '1/4-20', head: 'hex', drive: null, material: 'bronze' });
    expect(s.lengthMm).toBeCloseTo(25.4);
  });
  it('reads a strength class and a cap head', () => {
    const s = screw('M6 x 30mm Cap Head Screws (DIN 912) - Zinc Plated High Tensile Steel (12.9)');
    expect(s).toMatchObject({ thread: 'M6', lengthMm: 30, head: 'socket', strength: 'class 12.9', finish: 'zinc plated' });
  });
  it('does not read a nylon patch as a nylon screw', () => {
    expect(screw('Screw, M5 x 8mm, Philips Pan Head, Flat Washer, Nylon Patch, RoHS').material).toBeNull();
  });
  it('states nothing it cannot read', () => {
    const s = screw('Screws, 12-24, No Spec');
    expect(s).toMatchObject({ thread: '12-24', lengthMm: null, head: null, drive: null, material: null });
  });
  it('does not read a pitch as a length, or an insert size as a pitch', () => {
    expect(screw('Screw, M3x0.5mm Thread, Pan Head').lengthMm).toBeNull();
    expect(readPitch('Nut, M3 x 4.22 mm Press In Threaded Insert')).toBeNull();
    expect(readPitch('M6x1.0X20mm')).toBe(1);
  });
});

describe('threads', () => {
  it.each([
    ['M2.5 Sz, 6mm L', 'M2.5'],
    ['#4-40 X 1/4"L', '4-40'],
    ['Screws, Thumb Panel, 10/32, pk of 50', '10-32'],
    ['Nut, 5/16"-18, 1/2" Width', '5/16-18'],
    ['1000 screws 12/24 Pan Head', '12-24'],
  ])('%s → %s', (d, t) => expect(readThread(d)).toBe(t));
  it('does not read 18-8 stainless or a 3/16 fraction as a thread', () => {
    expect(readThread('Washer, Split Lock, #8 18-8 Stainless Steel')).toBeNull();
    expect(readThread('Washer, Flat, 3/16 Screw')).toBeNull();
  });
});

describe('washers', () => {
  it('reads ID, OD and thickness in either order and unit', () => {
    const s = washer('Washer, Flat, For M8 Screw, 1.6mm Thk x 8.4mm ID x 16mm OD, 18-8 SST, RoHS');
    expect(s).toMatchObject({ fits: 'M8', type: 'flat', idMm: 8.4, odMm: 16, thicknessMm: 1.6, material: 'stainless steel' });
  });
  it('reads fractions after the label', () => {
    const s = washer('WASHER, FLAT FENDER 1/4 IN, OD 7/8 IN, SS');
    expect(s.type).toBe('fender');
    expect(s.fits).toBe('1/4in');
    expect(s.odMm).toBeCloseTo(22.225);
  });
  it('reads a thread as the nominal size it fits', () => {
    expect(readFits('WASHER 1/4-20 ID', '1/4-20')).toBe('1/4in');
    expect(washer('Washer, Split Lock, #8 18-8 Stainless Steel')).toMatchObject({ fits: '#8', type: 'split lock' });
    expect(washer('WASHER, FLAT, .50, STL').fits).toBe('1/2in');
  });
  it('reads a range as its middle', () => {
    expect(washer('Washer, M5, 5.3mm ID, 10mm OD, 0.9 to 1.1mm Thickness, Flat').thicknessMm).toBe(1);
  });
});

describe('nuts and families', () => {
  it('reads a cage nut', () => {
    expect(nut('Cage Nuts, 10-32, Hardened Steel, Clear Zinc Finich, 1 pc')).toMatchObject({ type: 'cage', thread: '10-32', finish: 'zinc plated', packQty: 1 });
  });
  it('files a nut described under Bolts & Screws as a nut', () => {
    expect(screw('Nut, M3 x 4.22 mm Press In Threaded Insert')).toMatchObject({ family: 'nut', type: 'press-in', thread: 'M3' });
  });
  it('recovers a screw filed under another part type', () => {
    const r = parseDescription('Custom Mechanical', 'Screw, PHP, 1/4-20 X .375" L with square Cone washer, steel, zinc');
    expect(r.misfiled).toBe(true);
    expect(r.spec).toMatchObject({ family: 'screw', thread: '1/4-20', washer: 'square cone' });
  });
  it('ignores non-fasteners', () => {
    expect(parseDescription('Assembly', 'Assy, 12GB Diorite B1 w/ 4-40 Screws').spec.family).toBeNull();
  });
});

describe('queries', () => {
  it('reads the way an engineer types', () => {
    const { spec, unread } = parseQuery('m3 x 8 pan torx stainless');
    expect(spec).toMatchObject({ family: 'screw', thread: 'M3', lengthMm: 8, head: 'pan', drive: 'torx', material: 'stainless steel' });
    expect(unread).toEqual([]);
  });
  it('reads imperial queries', () => {
    const { spec } = parseQuery('#6-32 x 1/4 flat phillips');
    expect(spec).toMatchObject({ family: 'screw', thread: '6-32', head: 'flat', drive: 'phillips' });
    expect(spec.lengthMm).toBeCloseTo(6.35);
  });
  it('reads a washer query', () => {
    expect(parseQuery('m5 split lock washer').spec).toMatchObject({ family: 'washer', fits: 'M5', type: 'split lock' });
  });
  it('reads a length given on its own', () => {
    expect(parseQuery('m4 12mm socket').spec).toMatchObject({ family: 'screw', thread: 'M4', lengthMm: 12, head: 'socket' });
  });
  it('reports the words it did not understand', () => {
    expect(parseQuery('m3 x 8 pan sparkly').unread).toEqual(['sparkly']);
  });
  it('reads a nut query', () => {
    expect(parseQuery('10-32 cage nut').spec).toMatchObject({ family: 'nut', type: 'cage', thread: '10-32' });
  });
});

describe('lengths', () => {
  it.each([
    ['Screw, M3 x 0.5 x 6 mm, Steel', 6],
    ['M5 X 12 Phil Screw', 12],
    ['Screw-Washer, Metric, M3, L=10', 10],
    ['Screws, M4, 0.7mm Pitch, 12mm Length', 12],
  ])('%s → %d mm', (d, n) => expect(readLength(d)?.mm).toBe(n));
  it('does not read a pitch as a length', () => {
    expect(readLength('Nut, Hex, M8x1.25, Steel')).toBeNull();
  });
});

describe('found in the demo run (Oct 28)', () => {
  it('reads a length written after the word thread', () => {
    expect(screw('SCREW, PHILLIPS FLATHEAD, 6-32 THREAD X 3/8 IN. LENGTH, STAINLESS STEEL')).toMatchObject({
      thread: '6-32', lengthMm: 9.525, head: 'flat', drive: 'phillips',
    });
  });
  it('reads screw sizes given without threads per inch', () => {
    expect(screw('Screw, Sheetmetal, No. 8 x 1in L, Washer Hex Head, Hex/Slotted Drive, Steel, Zinc Plated')).toMatchObject({
      thread: '#8', lengthMm: 25.4, type: 'self-tapping', head: 'hex', drive: 'combo',
    });
    expect(screw('Screw, Self Tapping, No 2 x 1/4 in, Pan Head, Phillips, ZStl, RoHS')).toMatchObject({ thread: '#2', lengthMm: 6.35 });
    expect(screw('Screw, Self-Tapping, 5/16in x 1-1/2in, Hex Drive, Hex Washer Head, Grade 5')).toMatchObject({ thread: '5/16', lengthMm: 38.1 });
  });
  it('reads a hex washer head as a hex head', () => {
    expect(screw('Screw, Self-Tapping, 5/16in x 1-1/2in, Hex Drive, Hex Washer Head, Grade 5').head).toBe('hex');
  });
  it('does not take a Phillips bit size for a screw size', () => {
    expect(screw('Screw, M3, Thread legnth 4mm, PH#2, Cone Washer 6.35mm').thread).toBe('M3');
  });
  it('reads PN PH abbreviations and an inch length after a metric thread', () => {
    expect(screw('SCREW WASHER M3X0.25" PN PH STL ZN')).toMatchObject({ thread: 'M3', pitch: null, lengthMm: 6.35, head: 'pan', drive: 'phillips' });
  });
  it('keeps a plastic washer plastic, and not the screw', () => {
    expect(screw('Screws, Steel, Cross head with plastic washer (Black), Diameter M6 X 16')).toMatchObject({ washer: 'plastic', material: 'steel' });
    expect(screw('Screws, Cross Head, Finishing Plastic Washer, M5 x 16mm').material).toBeNull();
  });
  it('reads a unit-less washer size in a search as millimetres', () => {
    expect(parseQuery('washer 5.3 id').spec.idMm).toBe(5.3);
    expect(parseQuery('washer 5.3 id').unread).toEqual([]);
    expect(parseQuery('#8 washer .17 id').spec.idMm).toBeCloseTo(4.318);
  });
  it('reads shop words and a lone length', () => {
    expect(parseQuery('m4 nyloc').spec).toMatchObject({ family: 'nut', type: 'nylon lock', thread: 'M4' });
    expect(parseQuery('M3 SHCS 10').spec).toMatchObject({ head: 'socket', lengthMm: 10 });
    expect(parseQuery('m3 standoff female')).toMatchObject({ unread: [], notRecorded: ['female'] });
  });
});
