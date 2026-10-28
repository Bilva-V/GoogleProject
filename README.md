# Fastener Finder

**Describe the fastener the way you'd say it; see the part Google already stocks.**

A browser tool for Google's mechanical manufacturing team (DiversaTech × Google, fall 2026). It answers
one question before an engineer creates a new GPN: *is this fastener already in Agile?* If it is, the
tool shows which GPN to use. If it isn't, it writes the new part's description to a standard, so the
next engineer can find it.

It runs entirely in the browser. There is no backend, no account, and nothing is sent anywhere, which
keeps Google's security review simple.

---

## Contents

1. [The problem](#the-problem)
2. [What the tool does](#what-the-tool-does)
3. [Golden path: a 10-minute demo](#golden-path-a-10-minute-demo)
4. [Getting started](#getting-started)
5. [How it works](#how-it-works)
6. [Google's rulings, as implemented](#googles-rulings-as-implemented)
7. [Project layout](#project-layout)
8. [Data and security](#data-and-security)
9. [Known limits and next steps](#known-limits-and-next-steps)

---

## The problem

Design engineers can't find an existing fastener in Agile quickly, so they create a new GPN, which
takes about two minutes. Descriptions are typed by hand with no standard, so the same physical part
ends up under several GPNs, bought from several suppliers, at small volumes.

From the October 2026 export (`data/source.xlsx`, 11,844 GPNs):

| | |
|---|---|
| Fastener GPNs (screws, bolts, nuts, washers, standoffs) | **1,155** |
| Distinct physical parts once duplicates are folded | **1,093** |
| GPNs that repeat a part already in Agile | **62** |
| Groups of GPNs that look like the same part | **69** (53 duplicates, 5 pack sizes, 8 near sizes, 2 variants, 1 conflict) |
| Descriptions stating every key field | **55%** |
| Fastener GPNs filed under a non-fastener part type | **101** |

Every figure on screen is computed from the data when the catalogue is built; none are typed in by hand.

## What the tool does

Five screens, in the order people use them:

| Screen | For | What it does |
|---|---|---|
| **Find** | Design engineers | Type a fastener in plain words (`m3 x 8 pan phillips`) or paste a GPN or supplier part number. The search reads it back as editable chips and a live drawing, then lists one row per physical part: **Ready to use**, **Close size**, **Might fit**. |
| **New part** | Design engineers | When nothing fits: fill in the fields and copy a description written to the standard. It shows the closest stocked parts one last time. |
| **Clean up** | Manufacturing engineers | Reviews every group of GPNs that look like the same part, with Google's rule for each kind. You pick the GPN to keep, record a decision and export the decisions as CSV. |
| **Health** | Managers | Shows how findable the catalogue is: completeness by family, which fields descriptions state, and groups to clean up. Drop in vendor volumes here. |
| **Standard** | Everyone | The proposed description standard: field order, rules, and real records rewritten to it. |

### Design choices worth knowing

- **One search line, not a form.** The same parser that reads Agile's messy descriptions reads what
  the engineer types, so `#6-32 x 1/4 flat` and `SCREW, FLAT HEAD, 6-32 X 1/4 IN` mean the same thing.
- **The fastener draws itself.** The drawing updates as you type. Click the head, the drive recess
  or the length dimension to change it.
- **Dashed means "not stated", everywhere.** The same convention runs through the drawing, unset
  chips (`+ material`), the per-part checks (`? head`) and gaps in the standard text (`material?`).
- **An unknown is never a match.** A part whose description doesn't state the length is never
  called ready for an 8 mm request; it goes under *Might fit*.
- **The tool never declares parts interchangeable.** It shows evidence, and an engineer decides.
- **No dead ends.** When nothing matches, it offers one-click fixes ("Without brass: 1 ready"), the
  closest parts with the reason each was ruled out, and the new-part form.
- **Copying the GPN is one click.** The GPN is what the engineer leaves with.

Keyboard: `/` jumps to the search from any screen; `Esc` clears it or closes a panel.

---

## Golden path: a 10-minute demo

Run the app (`npm run dev`) and open <http://127.0.0.1:5180>. Use a window at least 1280 px wide.
Each step has **what to click**, **what to say**, and **what the audience should see**. The numbers
are from the October 2026 export.

### 0. The hook (Find, empty): 30 seconds

**Say:** "Today an engineer who needs a screw can either search Agile's free-text descriptions or
make a new GPN in two minutes. They make the GPN. That's how 1,155 fastener GPNs became 1,093 actual
parts, and why Google buys the same screw from several suppliers at small volumes."

**Show:** the three figures at the bottom of the start screen, and the four blank drawings. "Dashed
means unknown. As you describe the part, the drawing fills in."

### 1. Describe it the way you'd say it: 90 seconds

**Click** the example **`m3 x 8 pan phillips`** (or type it).

**Show:**
- The chips read back what was understood: *Thread M3, Length 8 mm, Head pan head, Drive phillips*.
  Dashed `+ material`, `+ finish` chips are details you haven't given yet.
- The drawing now shows an M3 × 8 pan-head Phillips screw.
- *Written to the standard*: `SCREW, PAN HEAD, PHILLIPS, M3 X 8 MM, material?`. The standard says
  what's still missing.
- The tally: **3 ready to use, 4 might fit**.

**Say:** "One row per physical part, not per GPN. Every tick is a field the description actually
states. Rows tagged *Might fit* are silent on something, here the head or length, so we'd check the
datasheet. Records that state none of it are folded away under *Too vague to check*."

### 2. Refine by touching the drawing: 60 seconds

**Click** the drive circle on the right of the drawing and pick **torx**. The search line rewrites
itself to `screw M3 x 8mm pan head torx`.

**Show:** **1 ready to use**: GPN **1106617**, tagged **+1 duplicate** and **variant**.

**Say:** "Typing and pointing are the same thing; the line and the drawing stay in sync."

### 3. Open the part: which GPN to use, and why: 90 seconds

**Click** the row for 1106617. The part panel slides in.

**Show:**
- **"Use this GPN: it is in Production. 1 other GPN repeats the same part."** That other GPN is
  **1249277**, the same captive-washer screw in Prototype.
- *What the descriptions state*, field by field, with "matches" next to what you asked for.
- *Filed under 2 GPNs*: both records, their phases, suppliers and source rows in the spreadsheet.
- *Could be confused with*: a **variant**, **1094168**, which shares the supplier base
  `G721-03007-01` but has a Phillips drive. Google's rule for variants is shown in one sentence.

**Click** the copy icon next to **1106617**. A "Copied 1106617" confirmation appears.

**Say:** "This is Google's first ruling in action: same part, different lifecycle, so it's a
duplicate and we steer to one GPN."

Press `Esc` to close.

### 4. No dead ends: 60 seconds

**Click** `+ material` and pick **brass** (or type `m3 x 8 pan torx brass`).

**Show:** **0 ready**. The page doesn't stop there. It offers **"Without brass: 1 ready"**, then
anything that might fit.

**Click** *Request a new part* at the bottom.

### 5. New part: born searchable: 60 seconds

**Show:**
- *5 of 5 required fields*, and *Description to submit*: `SCREW, PAN HEAD, TORX, M3 X 8 MM, BRASS`.
- Remove a field (× on *Material*): the description shows `material?` and the progress drops to 4 of 5.
- *Nothing stocked states all of this*, with the closest stocked parts and what doesn't line up.

**Say:** "If they really need a new part, the description is written to the standard, so the next
engineer's search finds it. Two minutes to make a GPN is fine, as long as the GPN is findable."

### 6. Paste a part number: a conflict: 45 seconds

Go back to **Find** and search **`90317A111`** (a McMaster-Carr part number; it's also an example button).

**Show:** two GPNs, **07070024** and **07082586**, both tagged **conflicting record**. Open one: both
cite the same supplier part number, yet one says *steel, square cone washer* and the other
*stainless steel, internal tooth washer*.

**Say:** "Same supplier part, two contradictory descriptions. One record is wrong. The tool won't
pick a winner; it flags it for a datasheet check."

### 7. Compare side by side: 45 seconds

Search **`m3 x 8 pan phillips`** again. Tick the boxes on the first two *Ready to use* rows, then
press **Compare** in the bar at the bottom.

**Show:** no stated value conflicts, but the comparison calls out the details only one of them
states (pitch, material, finish, the split lock washer), outlined dashed. Rows that do conflict are
highlighted in amber; try it with a *Might fit* row.

### 8. Clean up: the manufacturing view: 90 seconds

**Click** **Clean up** in the top bar.

**Show:**
- Tabs by kind: **Duplicates 53, Pack sizes 5, Near sizes 8, Variants 2, Conflicting records 1**.
- *Google's rule* above each tab, for example on **Near sizes**: "Sizes within 0.25 mm of each other.
  An engineer decides whether one can replace the other." (The 5.4 mm vs 5.5 mm washers are here.)
- On a duplicate group: choose the GPN to keep (radio), press **Consolidate** (the suggested
  decision is marked), add a note. The progress bar moves.
- **Export decisions** downloads a CSV for the Agile change request.

**Say:** "Decisions stay in this browser until exported. Nothing is written back to Agile."

### 9. Health and volumes: 60 seconds

**Click** **Health**.

**Show:** **55%** of fastener descriptions state every key field; the completeness bars by family;
the coverage table (screws: thread 81%, length 75%, head 69%...).

**Drag** `data/demo-volumes.csv` onto *Order volumes* (or *choose a file*). *These are made-up
numbers to show the mechanism; the real file comes from the vendors.*

**Show:** the top bar now says *Volumes for 5 GPNs*. Back on **Find** with `m3 x 8 pan phillips`,
**07052664 (4,800 ordered)** now ranks first. On `m3 x 8 pan torx`, the part shows **3,050 ordered**:
the volume of both duplicate GPNs combined.

**Say:** "That's Google's preference for parts ordered in bulk, applied the moment the vendor
volumes arrive."

### 10. The standard: 30 seconds

**Click** **Standard**.

**Show:** the field order for screws (noun, head, drive, thread, length, material, then optional
fields), the example, and *Real records, rewritten*: current descriptions next to the standard
version, with the missing fields marked.

**Close:** "Today: no process, free text, duplicates. In future: describe, check what's stocked,
reuse, or create a part that's findable from day one."

### If something goes wrong in the demo

- **Results look wrong after a volume drop:** reload the page; volumes are held in memory only.
- **Clean-up decisions from a rehearsal are showing:** they're kept in this browser's local storage.
  Clear the site data, or run `localStorage.removeItem('fastener-finder.reviews.v1')` in the console.
- **Port 5180 is busy:** the dev server uses a fixed port; stop the other process first.

---

## Getting started

Requirements: **Node 20 or newer** (developed on Node 26) and npm.

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5180>.

The repository includes the source spreadsheet (`data/source.xlsx`) and the catalogue built from it
(`src/generated/catalog.json`), so the app runs straight after `npm install`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on 127.0.0.1:5180 |
| `npm run catalog` | Rebuild `src/generated/catalog.json` from `data/source.xlsx` (and `data/volumes.csv` if present) |
| `npm test` | Unit tests: parser, Google's rulings, search bands, standard writer, and a round trip over every real part |
| `npm run build` | Type-check and build a static site into `dist/` |
| `npm run preview` | Serve the built site |

### Updating the data

1. Replace `data/source.xlsx` with a newer Agile export. It needs the same two tabs, *Set 01* and
   *Set 02*, with the same columns.
2. Optional: add `data/volumes.csv` with two columns, `GPN,Volume`, to bake volumes into the catalogue.
3. Run `npm run catalog`. It prints a summary: GPNs read, fasteners in scope, physical parts, groups by kind.
4. Run `npm test`. The round-trip test checks every real part against the parser.

Volumes can also be dropped in at runtime on the **Health** screen without rebuilding. That's
useful for a quick look, but they're forgotten on reload.

### Deploying

`npm run build` produces a static site in `dist/` (HTML, JS and fonts; the catalogue is inside the
JS bundle). Host it on any internal static host or open it from a file share. It makes no network
requests.

---

## How it works

```
data/source.xlsx ──► scripts/build-catalog.ts ──► src/generated/catalog.json ──► the app
                     (parse, group, fold,           (parts, groups, physical      (search, rank,
                      health; build time)            parts, health)                draw; in browser)
```

The **engine** (`src/engine/`) is pure TypeScript with no React, shared by the build script and the app:

| Module | Job |
|---|---|
| `vocab.ts` | Vocabulary tables: heads, drives, materials, finishes, washer and nut types, with the spellings found in Agile (`PHP`, `BELLVILLE`, `SWRCH`, `w/`...) |
| `parse.ts` | Text → spec, for both Agile descriptions and typed searches. Reads metric (`M3-0.5`), numbered (`#6-32`) and fractional (`1/4-20`) threads, lengths in mm or inches, and IDs/ODs/thicknesses. A field the text doesn't state stays `null` and is never guessed. |
| `groups.ts` | Finds groups of GPNs that look like the same part, using four kinds of evidence: shared supplier part number, same description, same description apart from pack size, and a shared supplier base number. Then classifies each group (see below), picks a preferred GPN, and folds duplicates and pack sizes into **physical parts**. |
| `search.ts` | Compares a search against each physical part, field by field: *match*, *near* (a size within 0.25 mm), *unknown* (not stated) or *differs*. Puts each part in a band and ranks by lifecycle phase, then volume, then fewest unknowns, then most suppliers. |
| `standard.ts` | Writes the standard description from a spec and names the required fields that are missing. |
| `query.ts` | Writes a spec back to a search line, so editing a chip or the drawing rewrites what's typed. |
| `health.ts` | Completeness (complete / partial / vague by key fields), field coverage, group counts. |

The **UI** (`src/ui/`) is React 18 with hash routes (`#/find?q=…`, `#/new`, `#/cleanup?kind=…`,
`#/health`, `#/standard`), so any search can be bookmarked or shared as a link. There is no router or
state library.

### Bands on the Find screen

| Band | Rule |
|---|---|
| **Ready to use** | Every detail you asked for is stated and equal |
| **Close size** | Every detail is stated; one size is within 0.25 mm (Google's 5.4 vs 5.5 mm ruling) |
| **Might fit** | Nothing contradicts the search, at least one detail matches, and some are not stated |
| **Too vague to check** | Nothing contradicts it, but the description states none of what was asked (collapsed) |
| *Ruled out* | A stated detail differs. Counted, and shown with reasons only when nothing else fits |

Scope defaults to active parts (Production, Preliminary, Planning, Prototype), with End of
Production and kits excluded; change it with **Active parts** next to the tally.

## Google's rulings, as implemented

From the week 3 meeting with Google:

| Situation | Ruling | Kind in the tool | Result |
|---|---|---|---|
| Same part, different lifecycle phase | Duplicate: consolidate | **Duplicate** | Folded into one physical part under the preferred GPN |
| Same part, single vs bulk pack | Keep both GPNs, combine their volume | **Pack size** | One physical part, both GPNs listed, volumes summed |
| 5.4 mm vs 5.5 mm | Not a duplicate; the engineer decides, shown with volume | **Near size** | Kept apart; appears under *Close size* |
| Shared supplier base, a real stated difference | (Our addition) Treat as different parts | **Variant** | Kept apart; flagged on both |
| Same supplier part number, descriptions disagree | (Our addition) One record is wrong | **Conflict** | Kept apart; no preferred GPN; flagged for a datasheet check |

**Preferred GPN** order: lifecycle phase (Production first), then volume, then number of
suppliers, then the most complete description.

## Project layout

```
data/
  source.xlsx              Agile export, Oct 2026 (Set 01 and Set 02)
  demo-volumes.csv         Made-up volumes for the demo, five GPNs
docs/
  BUILD_GUIDE.md           Plan, milestones and design notes for this build
scripts/
  build-catalog.ts         xlsx → catalog.json
src/
  engine/                  Parser, grouping, search, standard, health (pure functions)
  generated/catalog.json   Built catalogue (committed)
  ui/                      React screens and components
    App.tsx                Shell, navigation, keyboard shortcut
    Find.tsx               Search screen
    Drawing.tsx            Live SVG drawings of screw, nut, washer, standoff
    Picker.tsx             Chip with a value picker
    PartDrawer.tsx         Part details panel
    Compare.tsx            Side-by-side comparison
    NewPart.tsx            New-part request
    Cleanup.tsx            Group review and CSV export
    Health.tsx             Catalogue health and volume drop-in
    Standard.tsx           The description standard
    store.tsx              Catalogue, volumes, review decisions, route
  styles/app.css           All styling, light and dark
tests/                     Vitest suites
```

## Data and security

- **No network at runtime.** No API calls, analytics or web fonts; fonts are bundled. Everything
  typed stays in the tab.
- **Volumes** dropped on the Health screen are read in the browser and held in memory only.
- **Clean-up decisions** are kept in the browser's local storage
  (`fastener-finder.reviews.v1`) until exported as CSV.
- **This repository contains Google-internal data** (`data/source.xlsx`, `src/generated/catalog.json`,
  real GPNs in tests and docs). Keep it **private**, and don't fork it to a public account.

## Known limits and next steps

- **Volumes are pending from vendors.** Until they arrive, ranking falls back to lifecycle phase and
  supplier count.
- **The parser reads what's written.** About 45% of descriptions miss a key field, so many parts land
  under *Might fit*. Adopting the standard is what fixes this; the tool only makes the gap visible.
- **Kits and assortments** are excluded by default because they hide many fasteners under one GPN.
- **Decisions don't write back to Agile.** Export the CSV and raise the change request as usual.
- **Possible next step:** rebuild inside Google's environment, for example as a Gemini Enterprise
  agent. The engine has no dependencies and could be ported or reused as is.
