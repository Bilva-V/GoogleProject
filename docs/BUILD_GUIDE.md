# Fastener Finder: build guide

A fresh build, replacing the Part Reuse Check prototype. Target: done before 9 AM, 28 October 2026.

## 1. What we know (the brief, distilled)

**Client:** Google's mechanical manufacturing team (Christine Nolan-Brady, Daniel Rhee, Aviva Levi).
DiversaTech SOW, midpoint first week of November.

**The problem.** Design engineers can't find an existing fastener in Agile quickly, so they create
a new GPN (two minutes) instead of reusing one. Descriptions are free text, typed by hand, with no
standard. The result is many GPNs for the same physical part, bought from several suppliers.

**What Google asked for, in their words:**
- Find similar fasteners and consolidate them into one or a few **preferred** parts.
- Prefer parts that are ordered more (**volume**): bulk orders cost less. Volumes are pending
  from vendors; 85% coverage is fine.
- Rulings on duplicates (call, week 3):
  1. Same part, different lifecycle → **duplicate**, consolidate.
  2. 5.4 mm vs 5.5 mm → **not a duplicate**; show both, with volume; the engineer decides.
  3. Single vs bulk pack → **keep both GPNs**, combine their volume.
- Pitch the change as **today vs future**: today there is no process; in future, engineers check
  for an existing part before making a new one.
- What details must a description have, and in what order? (a **description standard**, SOW
  objective 2), and what share of descriptions are too vague today?
- Kits hide fasteners; handle them separately.
- Must pass Google security review: **no backend, no network, nothing leaves the browser**.
  May be rebuilt internally, possibly as a Gemini Enterprise agent.

**The data.** `Copy of GPNs list-Oct 2026.xlsx`: Set 01 (2,150 records, a subset) and Set 02
(13,512 rows, 11,844 GPNs, one row per manufacturer part number). About 1,045 screws, bolts, nuts
and washers in scope. Only ~19% of them state a length; ~16% a head type.

**Lessons from the first prototype** (keep): an unknown is never a match; a stated difference
excludes; the app never declares parts interchangeable; parser bugs found and fixed (bare PAN/ST,
square-cone washers aren't square drives, M3x5 lengths, implausible pitches, 18-8 isn't a thread,
M1.6 ≠ M16, w/ = with). **Fix** what didn't work: a ten-step wizard is slow, duplicates crowd
the results, the "new GPN" output was a dump of text, and the cleanup view was an afterthought.

## 2. The idea

> **Describe the fastener the way you'd say it; see the one part Google already stocks.**

Three moves make it different from a filter form:

1. **One spec line.** The engineer types `m3 x 8 pan torx stainless` (or pastes a McMaster part
   number). The same parser that reads Agile's messy descriptions reads the query, and shows it
   back as editable chips. No wizard.
2. **The fastener draws itself.** A live line drawing of the part (head shape, drive recess,
   thread, length dimension) updates as the spec changes. Click the head to change the head, the
   recess to change the drive. It doubles as a check: "is this what I meant?"
3. **One row per physical part.** Duplicate GPNs are folded into the part they describe, under
   its preferred GPN, with the others listed as aliases. The engineer sees four parts, not eleven
   GPNs, and is steered to the preferred one.

And when nothing fits, the tool **writes the standard description** for the new GPN from the
spec, so every new part is born searchable.

## 3. Who uses it, for what

| Person | Job | Screen |
|---|---|---|
| Design engineer | Find a part to reuse, or request a new one properly | **Find**, **New part** |
| Manufacturing engineer (Aviva) | Review duplicate groups, pick preferred parts, export decisions | **Clean up** |
| Manager (Christine) | See how big the problem is; argue for the standard | **Health**, **Standard** |

## 4. Features

### Find (the home screen)
- Spec line with instant parse into chips; each chip opens a picker listing real values with
  counts; unknown words are shown, not silently dropped.
- Family switch: screw / bolt, nut, washer (inferred from the text, changeable).
- Fastener drawing (SVG) for screws, nuts and washers, reflecting thread, length, head, drive,
  washer style; clickable regions open the matching chip.
- Results in three bands: **Ready to use** (every asked attribute stated and equal), **Close size**
  (a size within 0.25 mm; Google ruling 2), **Might fit** (description silent on something asked).
- Each result is a physical part: preferred GPN, aliases with their phase, lifecycle, suppliers,
  volume (dash until loaded), the verdict per attribute as marks, the original description.
- Part drawer: everything known, every GPN and supplier part number, why it's grouped, Agile rows.
- Compare any two parts side by side.
- Lifecycle scope (Production, Preliminary, Planning, Prototype; End of Production off by
  default), kits off by default.

### New part (when nothing fits)
- Standard description generated from the spec; missing required fields named.
- "Before you submit": the three closest parts and what disqualified each.
- Copy as text; nothing is sent.

### Clean up (manufacturing)
- Candidate groups by kind: likely duplicate, pack variant, near size, similar but different,
  conflicting records, with Google's rule shown for each kind.
- A suggested preferred part per group; the reviewer can change it and mark the group
  *consolidate / keep separate / needs check*. Decisions persist in this browser only and export
  as CSV.

### Health
- The size of the problem: in-scope parts, GPNs per physical part, share of vague descriptions
  by family, attribute coverage, duplicates found by kind.
- Volume drop-in: drag `volumes.csv` (GPN, Volume) onto the page; parsed in the browser, ranks
  and preferred parts update. Nothing is uploaded.

### Standard
- The proposed description standard per family, field order and vocabulary.
- Live before/after on real records: how many records the standard can rewrite fully today and
  which fields the rest are missing.

## 5. Architecture

- **Stack:** React 18 + Vite + TypeScript, Vitest. No router library (hash routes), no state
  library, no runtime network. Fonts bundled (IBM Plex Sans and Plex Mono).
- **Data pipeline (build time):** `scripts/build-catalog.ts` reads the xlsx directly (exceljs),
  merges both sheets by GPN, parses every description, builds clusters and physical parts,
  computes health metrics, and writes `src/generated/catalog.json`. Both the source data and the
  generated catalog are committed to the private repository.
- **Engine (pure functions, shared by build and app):** `parse` (text → Spec), `match` (Spec ×
  Part → verdicts), `rank`, `cluster`, `standardDescription`, `health`.
- **Style:** taste skill app-screen rules, achromatic-ledger style: ink chrome, one data hue
  (#1d5fbf) on matching values, steel-grey ground, no gradients, shadows only on floating
  layers.

## 6. Milestones

| # | Milestone | Done when |
|---|---|---|
| M0 | Scaffold + data pipeline | `npm run catalog` writes the catalog from the xlsx; counts match the known totals |
| M1 | Spec parser | Golden tests pass on real descriptions and typed queries, including every known bug |
| M2 | Catalog model | Clusters with kinds, physical parts with preferred GPN, health metrics; tests |
| M3 | Match + rank | Bands, near tolerance, volume ranking; tests |
| M4 | Shell + Find | Spec line, chips, pickers, results in bands, working end to end |
| M5 | Fastener drawing | Live SVG for screw / nut / washer, clickable regions |
| M6 | Part drawer + Compare | Every fact and alias visible; side-by-side compare |
| M7 | New part | Standard description writer + closest parts |
| M8 | Clean up + Health + Standard | Decisions with export; metrics; volume drop-in; before/after |
| M9 | Polish + verify | Style pass, keyboard, phone fold, empty/edge states, full test run, production build, every screen checked in the browser |
| M10 | Docs | README, handoff/security note, demo golden path |

## 7. Ground rules

- Parser output for a field the text doesn't state is `null`. Never inferred.
- Every number on screen is computed from the data; no invented figures.
- Real GPNs only with their real descriptions; no dummy data on real GPNs.
- The source xlsx and generated catalog never go to a remote; no network calls at runtime.

## 8. Design notes (UI research, Oct 28)

Sources: Anthropic's frontend-design skill, the installed taste skill's app-screen rules
(`~/.claude/skills/design-taste-frontend/references/app-screens.md`), and faceted-search research
(Baymard on applied filters; industrial-catalogue search write-ups).

- **One focal element only this product has:** the live fastener drawing. It sits on a dotted
  drafting sheet, with the standard description set as its title block. On the start screen the four
  blank drawings are the way in for someone who doesn't know what to type.
- **Dashed means "not stated", everywhere:** in the drawing, on chips not yet set (`+ material`),
  on check marks (`? head`), and in missing placeholders in the standard text.
- **Applied filters are always visible and removable** (Baymard): every understood detail is a chip
  with ×, plus "Clear all". Words the parser didn't understand are shown, never silently dropped.
- **No dead ends:** with no exact match the page offers "Without brass: 1 ready" (one click drops a
  detail), then the closest ruled-out parts with the reason, then the new-part request.
- **Records too vague to check** (stating none of what was asked) are folded into a collapsed band
  rather than padding "Might fit".
- **The job's output is a GPN:** every GPN has a one-click copy with a confirmation toast.
- **Type:** IBM Plex Sans (an engineering face with real tabular figures; the condensed width axis is
  used for drawing labels and standard text) plus IBM Plex Mono for IDs only. Bundled, so no network.
- **Colour on data only:** one blueprint blue for matches, the ready count and the completeness
  bars; amber for near sizes, red for conflicts; near-black for the one primary button. Light and dark.
- **Keyboard:** `/` focuses the search from any screen; Esc clears it or closes a panel.
- **Phone:** results come before the drawing; no horizontal scroll at 375 px.
