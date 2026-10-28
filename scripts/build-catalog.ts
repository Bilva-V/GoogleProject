// Build-time pipeline: data/source.xlsx → src/generated/catalog.json
// Reads both tabs, merges them by GPN (kept exactly as written: 07018362 and
// 7018362 are different GPNs), parses every description, finds duplicate
// groups, folds physical parts, and computes the health figures.
//
//   npm run catalog
//
// Optional: data/volumes.csv with columns GPN,Volume (vendor order volumes).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

import type { Catalog, PartRecord, Phase, SourceRow, Supplier } from '../src/engine/types';
import { PHASES } from '../src/engine/types';
import { parseDescription } from '../src/engine/parse';
import { findGroups, physicalParts } from '../src/engine/groups';
import { computeHealth } from '../src/engine/health';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'data/source.xlsx');
const VOLUMES = resolve(ROOT, 'data/volumes.csv');
const OUT = resolve(ROOT, 'src/generated/catalog.json');

const text = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && v && 'richText' in v) return (v as { richText: { text: string }[] }).richText.map((r) => r.text).join('');
  if (typeof v === 'object' && v && 'text' in v) return String((v as { text: unknown }).text);
  return String(v).trim();
};

const asPhase = (s: string): Phase | null => PHASES.find((p) => p.toLowerCase() === s.trim().toLowerCase()) ?? null;

interface Merged {
  gpn: string;
  description: string;
  partType: string;
  phase: Phase | null;
  suppliers: Supplier[];
  sources: SourceRow[];
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Missing ${SOURCE}. Copy "Copy of GPNs list-Oct 2026.xlsx" there.`);
    process.exit(1);
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SOURCE);
  const merged = new Map<string, Merged>();
  const get = (gpn: string) => {
    let m = merged.get(gpn);
    if (!m) merged.set(gpn, (m = { gpn, description: '', partType: '', phase: null, suppliers: [], sources: [] }));
    return m;
  };
  let skippedHeaders = 0;

  const s1 = wb.getWorksheet('Set 01');
  const s2 = wb.getWorksheet('Set 02');
  if (!s1 || !s2) throw new Error('Expected tabs "Set 01" and "Set 02".');

  // Set 01: GPN, Description, Status, Type of Fastener (a repeated header sits at row 189)
  s1.eachRow((row, n) => {
    if (n === 1) return;
    const gpn = text(row.getCell(1).value);
    if (!gpn || gpn === 'GPN' || gpn === 'Number') { if (gpn) skippedHeaders++; return; }
    const m = get(gpn);
    m.description ||= text(row.getCell(2).value);
    m.phase = asPhase(text(row.getCell(3).value)) ?? m.phase;
    m.partType ||= text(row.getCell(4).value);
    m.sources.push({ sheet: 'Set 01', row: n });
  });

  // Set 02: Number, Part Type, Description, Lifecycle Phase, Mfr. Name, Mfr. Part Number, Vendor Code
  s2.eachRow((row, n) => {
    if (n === 1) return;
    const gpn = text(row.getCell(1).value);
    if (!gpn) return;
    const m = get(gpn);
    m.partType = text(row.getCell(2).value) || m.partType;
    m.description = text(row.getCell(3).value) || m.description;
    m.phase = asPhase(text(row.getCell(4).value)) ?? m.phase; // Set 02 is the full export
    const name = text(row.getCell(5).value);
    const pn = text(row.getCell(6).value);
    if ((name || pn) && !m.suppliers.some((s) => s.name === name && s.partNumber === pn)) {
      m.suppliers.push({ name, partNumber: pn });
    }
    m.sources.push({ sheet: 'Set 02', row: n });
  });

  const volumes = new Map<string, number>();
  if (existsSync(VOLUMES)) {
    for (const line of readFileSync(VOLUMES, 'utf8').split(/\r?\n/).slice(1)) {
      const [g, v] = line.split(',');
      const n = Number(String(v ?? '').replace(/[^\d.]/g, ''));
      if (g && Number.isFinite(n)) volumes.set(g.trim(), n);
    }
  }

  const parts: PartRecord[] = [];
  for (const m of merged.values()) {
    const { spec, misfiled } = parseDescription(m.partType, m.description);
    if (!spec.family) continue;
    parts.push({
      gpn: m.gpn,
      description: m.description,
      partType: m.partType,
      phase: m.phase ?? 'Production',
      suppliers: m.suppliers,
      sources: m.sources,
      spec,
      volume: volumes.get(m.gpn) ?? null,
      misfiled,
    });
  }
  parts.sort((a, b) => a.gpn.localeCompare(b.gpn));

  const groups = findGroups(parts);
  const physical = physicalParts(parts, groups);
  const health = computeHealth(parts, groups, physical);
  const catalog: Catalog = {
    builtAt: new Date().toISOString(),
    source: 'Copy of GPNs list-Oct 2026.xlsx',
    parts,
    groups,
    physical,
    health,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(catalog));

  const pct = (n: number, d: number) => `${d ? Math.round((n / d) * 100) : 0}%`;
  console.log(`GPNs read                 ${merged.size} (repeated headers skipped: ${skippedHeaders})`);
  console.log(`fasteners in scope        ${parts.length}  (misfiled under other types: ${health.misfiled}, kits: ${health.kits})`);
  for (const [f, n] of Object.entries(health.byFamily)) {
    const c = health.completeness[f as keyof typeof health.completeness];
    console.log(`  ${f.padEnd(10)} ${String(n).padStart(4)}   complete ${pct(c.complete, c.total)} · partial ${pct(c.partial, c.total)} · vague ${pct(c.vague, c.total)}`);
  }
  console.log(`physical parts            ${physical.length}  (from ${parts.length} GPNs)`);
  console.log(`groups                    ${groups.length}  ${JSON.stringify(health.groupsByKind)}`);
  console.log(`volumes loaded            ${volumes.size || 'none (pending)'}`);
  console.log(`wrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
