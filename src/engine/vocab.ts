// Vocabulary: every spelling seen in the October 2026 snapshot, mapped to one
// canonical value. Within each table, canonicals are tried in declaration order
// and variants in order, so specific phrases come before their short forms.

export type Table = ReadonlyArray<readonly [canonical: string, variants: readonly string[]]>;

export const HEAD: Table = [
  ['pan', ['PANHEAD', 'PAN HEAD', 'PAN-HEAD', 'PAN HD', 'PHP', 'PHMS', 'PHCS', 'PAN']],
  ['flat', ['FLATHEAD', 'FLAT HEAD', 'FLAT HD', 'FHCS', 'COUNTERSUNK', 'CSK', '100 DEGREE', '100°', '82 DEGREE', '82°', '120°']],
  ['button', ['BUTTON HEAD', 'BUTTON HD', 'BHCS', 'BUTTON']],
  ['socket', ['SOCKET HEAD', 'SOCKET HD', 'SHCS', 'SOCKET CAP', 'CAP HEAD', 'CAP HD']],
  ['truss', ['TRUSS-HEAD', 'TRUSS HEAD', 'TRUSS HD', 'TRUST HEAD', 'TRUSS']],
  ['hex', ['HEX WASHER HEAD', 'HEX HEAD', 'HEX HD', 'HHCS', 'HEXAGON HEAD']],
  ['oval', ['OVAL HEAD', 'OVAL']],
  ['round', ['ROUND HEAD']],
  ['cheese', ['CHEESE HEAD']],
  ['fillister', ['FILLISTER']],
  ['flange', ['FLANGE HEAD', 'FLANGED HEAD']],
  ['wafer', ['WAFER HEAD']],
  ['low profile', ['ULTRA LOW PROFILE', 'LOW PROFILE HEAD', 'LOW PROFILE', 'LOW HEAD']],
  ['knurled', ['KNURLED']],
];

export const DRIVE: Table = [
  ['combo', ['PHILLIPS/SLOT', 'SLOTTED & PHILLIPS', 'SLOT/PHIL', 'COMBO', 'COMBINATION']],
  ['torx', ['TORX', 'HEXALOBULAR', '6 LOBE', '6-LOBE', 'SIX LOBE']],
  ['phillips', ['PHILLIPS', 'PHILIPS', 'PHLPS', 'PHIL', 'PHL', 'PHP', 'CROSS RECESS', 'CROSS HEAD']],
  ['hex', ['HEX SOCKET', 'HEX DRIVE', 'HEX RECESS', 'HEX KEY', 'ALLEN', 'SHCS', 'BHCS', 'FHCS']],
  ['pozi', ['POZIDRIV', 'POZI']],
  ['square', ['SQUARE DRIVE', 'SQUARE RECESS', 'ROBERTSON', 'SQUARE']],
  ['slotted', ['SLOTTED', 'SLOT']],
  ['tamper', ['TAMPER', 'SECURITY', 'PIN-IN']],
];

// Stainless before plain steel; the steel grades are stainless.
export const MATERIAL: Table = [
  ['stainless steel', ['STAINLESS STEEL', 'STAINLESS', 'SST', 'S.S.', 'SS', '18-8', 'A2', 'A4', '304', '316', '410']],
  ['alloy steel', ['ALLOY STEEL']],
  ['carbon steel', ['HIGH-CARBON STEEL', 'HIGH CARBON STEEL', 'CARBON STEEL']],
  ['spring steel', ['SPRING STEEL']],
  ['steel', ['STEEL', 'STL', 'ST', 'SPCC', 'SWRCH18A', 'SWRCH']],
  ['brass', ['BRASS']],
  ['bronze', ['BRONZE']],
  ['aluminum', ['ALUMINUM', 'ALUMINIUM']],
  ['titanium', ['TITANIUM']],
  ['nylon', ['NYLON']],
  ['plastic', ['PLASTIC', 'POLYCARBONATE', 'PEEK']],
];

// Specific finishes before the bare words they contain ('black zinc' before 'zinc' and 'black').
export const FINISH: Table = [
  ['black oxide', ['BLACK OXIDE', 'BLACK-OXIDE', 'BLACK-OXID', 'BLK OXIDE']],
  ['black zinc', ['BLACK ZINC']],
  ['zinc flake', ['ZINC FLAKE']],
  ['zinc plated', ['ZINC PLATED', 'ZINC-PLATED', 'CLEAR ZINC', 'ZINC', 'ZN', 'ZC', 'ZP', 'ZI']],
  ['nickel plated', ['NICKEL PLATED', 'NICKEL']],
  ['passivated', ['PASSIVATED']],
  ['galvanized', ['HOT DIP GALVANIZED', 'GALVANIZED', 'GALVANISED']],
  ['cadmium', ['CADMIUM']],
  ['phosphate', ['PHOSPHATE']],
  ['chrome', ['CHROME']],
  ['plain', ['PLAIN FINISH', 'UNPLATED']],
  ['black', ['BLACK', 'BLK']],
];

/** A washer built into a screw or nut. */
export const BUILT_IN_WASHER: Table = [
  ['external tooth', ['EXTERNAL-TOOTH', 'EXTERNAL TOOTH', 'EXT-TOOTH', 'EXT TOOTH', 'EXT. TOOTH', 'EXT LOCK']],
  ['internal tooth', ['INTERNAL-TOOTH', 'INTERNAL TOOTH', 'INT TOOTH', 'INT. TOOTH']],
  ['square cone', ['SQUARE CONE', 'SQUARE CONICAL', 'SQ CONICAL', 'SQ CONE', 'CONICAL', 'CONE WASHER']],
  ['split lock', ['SPLIT LOCK', 'SPLIT-LOCK', 'SPRING LOCK', 'LOCK WASHER', 'SPLIT WASHER']],
  ['flat', ['FLAT WASHER', 'PLAIN WASHER']],
  ['nylon', ['NYLON WASHER', 'PLASTIC WASHER']],
  ['belleville', ['BELLEVILLE', 'BELLVILLE']],
  ['captive', ['SEMS', 'SEM', 'CAPTIVE WASHER', 'CAPTIVE  WASHER', 'CONTAINED WASHER', 'LOOSE WASHER', 'W/ WASHER', 'W/WASHER', 'WITH WASHER', 'WASHER INCLUDED', 'INTEGRATED WASHER', 'INTEGRAL WASHER']],
];

export const WASHER_TYPE: Table = [
  ['fender', ['FENDER', 'LARGE DIAMETER', 'OVERSIZED', 'OVERSIZE']],
  ['belleville', ['BELLEVILLE', 'BELLVILLE', 'DISC SPRING']],
  ['external tooth', ['EXTERNAL-TOOTH', 'EXTERNAL TOOTH', 'EXT-TOOTH', 'EXT TOOTH', 'EXT. TOOTH']],
  ['internal tooth', ['INTERNAL-TOOTH', 'INTERNAL TOOTH', 'INT TOOTH', 'INT. TOOTH']],
  ['split lock', ['SPLIT LOCK', 'SPLIT-LOCK', 'SPRING LOCK', 'SPT LOCK', 'HELICAL', 'LOCK', 'SPLIT']],
  ['square cone', ['SQUARE CONE', 'CONICAL']],
  ['shoulder', ['SHOULDER']],
  ['sealing', ['SEALING', 'BONDED', 'EPDM']],
  ['wave', ['WAVE']],
  ['finishing', ['FINISHING', 'COUNTERSUNK']],
  ['flat', ['FLAT', 'PLAIN', 'DIN 125', 'ISO 7089', 'ISO 7091', 'NAS 620', 'AN 960', 'SAE', 'TYPE A']],
];

export const SCREW_TYPE: Table = [
  ['shoulder', ['SHOULDER']],
  ['set', ['SET SCREW', 'SET,', 'HEADLESS', 'CUP-POINT', 'CUP POINT']],
  ['self-tapping', ['SELF TAPPING', 'SELF-TAPPING', 'THREAD FORMING', 'THREAD-FORMING', 'SHEET METAL', 'TAPPING']],
  ['captive panel', ['CAPTIVE SCREW', 'CAPTIVE PANEL', 'SCREW, CAPTIVE', 'FLARE-IN']],
  ['thumb', ['THUMB']],
  ['rack', ['RACK SCREW', 'RACK SCREWS', 'PILOT POINT', 'CAGE BOLT', 'CAGE BOLTS']],
  ['bolt', ['BOLT', 'BOLTS']],
  ['machine', ['MACHINE SCREW', 'MACHINE', 'MACH']],
];

export const NUT_TYPE: Table = [
  ['cage', ['CAGE NUT', 'CAGE NUTS', 'CAGE', 'CLIK-NUT']],
  ['kep', ['KEPS', 'KEP']],
  ['nylon lock', ['NYLOCK', 'NYLON INSERT', 'NYLON LOCK', 'NYLON LOCKING', 'PREVAILING TORQUE']],
  ['press-in', ['PRESS IN', 'PRESS-IN', 'SELF-CLINCHING', 'SELF CLINCHING', 'CLINCH', 'THREADED INSERT', 'INSERT']],
  ['broaching', ['BROACHING']],
  ['rivet nut', ['RIVET NUT', 'RIVNUT']],
  ['flange', ['FLANGE NUT', 'FLANGE']],
  ['wing', ['WING NUT', 'WING']],
  ['strut', ['STRUT', 'CHANNEL NUT', 'SPRING NUT']],
  ['weld', ['WELD NUT', 'WELD']],
  ['acorn', ['ACORN', 'CAP NUT']],
  ['jam', ['JAM NUT', 'JAM']],
  ['square', ['SQUARE NUT']],
  ['lock', ['LOCKNUT', 'LOCK NUT', 'LOCKING']],
  ['hex', ['HEX NUT', 'HEXAGON NUT', 'HEXAGON', 'HEX']],
];

const isAlnum = (ch: string | undefined) => !!ch && /[A-Z0-9]/i.test(ch);

/** True when `needle` appears in `upper` with no letter or digit touching either end. */
export function hasTerm(upper: string, needle: string): boolean {
  let i = upper.indexOf(needle);
  while (i !== -1) {
    const before = upper[i - 1];
    const after = upper[i + needle.length];
    // a needle ending in punctuation ('SET,') carries its own boundary
    const endsSelf = !/[A-Z0-9]/.test(needle[needle.length - 1]);
    if (!isAlnum(before) && (endsSelf || !isAlnum(after))) return true;
    i = upper.indexOf(needle, i + 1);
  }
  return false;
}

/** The first canonical in `table` with a variant present in `text`. */
export function findTerm(text: string, table: Table): string | null {
  const upper = text.toUpperCase();
  for (const [canonical, variants] of table) {
    for (const v of variants) if (hasTerm(upper, v)) return canonical;
  }
  return null;
}

/** Every canonical value a table can produce, for pickers. */
export const canonicals = (table: Table) => table.map(([c]) => c);
