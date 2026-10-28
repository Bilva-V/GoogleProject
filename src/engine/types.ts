// Shared types: used by the catalog build script and the app.

export type Family = 'screw' | 'nut' | 'washer' | 'standoff';

export type Phase =
  | 'Production'
  | 'Preliminary'
  | 'Planning'
  | 'Prototype'
  | 'End of Production'
  | 'Sunset'
  | 'Obsolete';

export const PHASES: Phase[] = [
  'Production',
  'Preliminary',
  'Planning',
  'Prototype',
  'End of Production',
  'Sunset',
  'Obsolete',
];

/**
 * What a description (or a typed query) states about a fastener.
 * null always means "not stated". Nothing is inferred or defaulted.
 */
export interface Spec {
  family: Family | null;
  /** screw: machine, self-tapping, set, shoulder, captive, thumb, rack…; nut: hex, cage, kep…; washer: flat, split lock… */
  type: string | null;
  /** 'M3', '10-32', '1/4-20' */
  thread: string | null;
  /** metric pitch in mm, only when stated */
  pitch: number | null;
  lengthMm: number | null;
  /** true when the length was written in inches */
  lengthImperial: boolean;
  head: string | null;
  drive: string | null;
  /** 'T10', 'PH2': shown, never matched on */
  driveSize: string | null;
  material: string | null;
  /** '18-8', '316', 'A2': shown, never matched on */
  materialGrade: string | null;
  /** 'class 8.8', 'grade 5' */
  strength: string | null;
  finish: string | null;
  /** a washer built into a screw or nut: split lock, external tooth, square cone, captive (SEMS)… */
  washer: string | null;
  /** washers: the nominal screw size they fit: 'M5', '#10', '1/4in' */
  fits: string | null;
  idMm: number | null;
  odMm: number | null;
  thicknessMm: number | null;
  packQty: number | null;
  kit: boolean;
}

/** Attributes a search can ask about and a part can state. */
export type Attr =
  | 'type'
  | 'thread'
  | 'pitch'
  | 'lengthMm'
  | 'head'
  | 'drive'
  | 'material'
  | 'strength'
  | 'finish'
  | 'washer'
  | 'fits'
  | 'idMm'
  | 'odMm'
  | 'thicknessMm';

export const NUMERIC_ATTRS: ReadonlySet<Attr> = new Set<Attr>([
  'pitch',
  'lengthMm',
  'idMm',
  'odMm',
  'thicknessMm',
]);

/** Which attributes matter for each family, in the order a person would say them. */
export const ATTRS_BY_FAMILY: Record<Family, Attr[]> = {
  screw: ['thread', 'pitch', 'lengthMm', 'head', 'drive', 'type', 'material', 'finish', 'washer', 'strength'],
  nut: ['thread', 'pitch', 'type', 'material', 'finish', 'washer', 'strength'],
  washer: ['fits', 'type', 'idMm', 'odMm', 'thicknessMm', 'material', 'finish'],
  standoff: ['thread', 'pitch', 'lengthMm', 'type', 'material', 'finish'],
};

export const ATTR_LABEL: Record<Attr, string> = {
  type: 'Type',
  thread: 'Thread',
  pitch: 'Pitch',
  lengthMm: 'Length',
  head: 'Head',
  drive: 'Drive',
  material: 'Material',
  strength: 'Strength',
  finish: 'Finish',
  washer: 'Built-in washer',
  fits: 'Fits screw',
  idMm: 'Inner diameter',
  odMm: 'Outer diameter',
  thicknessMm: 'Thickness',
};

export interface Supplier {
  name: string;
  partNumber: string;
}

export interface SourceRow {
  sheet: 'Set 01' | 'Set 02';
  row: number;
}

/** One GPN as it appears in Agile, with what its description states. */
export interface PartRecord {
  /** as written in the sheet, leading zeros kept */
  gpn: string;
  description: string;
  partType: string;
  phase: Phase;
  suppliers: Supplier[];
  sources: SourceRow[];
  spec: Spec;
  /** units ordered; null until Google sends vendor volumes */
  volume: number | null;
  /** fastener words in the description but filed under another part type */
  misfiled: boolean;
}

export type GroupKind =
  | 'duplicate' //  same part; consolidate (Google ruling 1)
  | 'pack' //       single vs bulk; keep both, combine volume (ruling 3)
  | 'near' //       a size differs slightly; engineer decides (ruling 2)
  | 'variant' //    shares an identifier but states a real difference
  | 'conflict'; //  same exact MPN, descriptions disagree: a data issue

export type Evidence =
  | 'same supplier part number'
  | 'same description'
  | 'same description except pack size'
  | 'supplier part numbers share a base'
  | 'same specs except one size';

/** Candidate group of GPNs that may describe the same fastener. */
export interface Group {
  id: string;
  kind: GroupKind;
  evidence: Evidence;
  /** the shared MPN, the base, or the size difference; null for description evidence */
  detail: string | null;
  gpns: string[];
  /** attributes on which members state different values */
  differences: Attr[];
  preferred: string | null;
  phasesDiffer: boolean;
}

/**
 * A physical part: GPNs joined by duplicate or pack-variant groups. The engineer
 * sees one row per physical part, under its preferred GPN.
 */
export interface PhysicalPart {
  id: string;
  preferred: string;
  gpns: string[];
  /** the preferred record's spec, filled in from aliases where it is silent and they agree */
  spec: Spec;
  /** the preferred GPN was picked by a reviewer in Clean up, not by the rules */
  chosenInReview?: boolean;
}

export interface Health {
  inScope: number;
  byFamily: Record<Family, number>;
  physicalParts: number;
  gpnsInGroups: number;
  /** complete: states every key field; partial: some; vague: at most one (see KEY_FIELDS) */
  completeness: Record<Family, { total: number; complete: number; partial: number; vague: number }>;
  coverage: Record<Family, Partial<Record<Attr, number>>>;
  groupsByKind: Record<GroupKind, number>;
  misfiled: number;
  kits: number;
}

export interface Catalog {
  builtAt: string;
  source: string;
  parts: PartRecord[];
  groups: Group[];
  physical: PhysicalPart[];
  health: Health;
}
