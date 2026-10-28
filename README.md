# Bilva's Fastener Finder

Find the fastener Google already stocks before creating a new GPN. Type it the way you'd say it
(`m3 x 8 pan phillips`) or paste a GPN or supplier part number. If nothing fits, the app writes the
new part's description to a standard.

Runs entirely in the browser on the October 2026 Agile export. This repo contains Google data, so
keep it private.

## Run it

Needs Node 20+.

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:5180>.

| Command | Does |
|---|---|
| `npm run dev` | Dev server on port 5180 |
| `npm test` | 60 unit tests (parser, Google's rulings, search, standard writer, every real part round-tripped) |
| `npm run catalog` | Rebuild `src/generated/catalog.json` from `data/source.xlsx` (plus `data/volumes.csv` if present) |
| `npm run audit:data` | Re-check every catalogue part against the spreadsheet; should end `PROBLEMS: none` |
| `npm run build` | Static site in `dist/` (no backend) |

## Using it

The rail on the left has five screens.

- **Find.** Type a description or a part number. What it understood shows as chips; change a chip,
  or click the drawing (head, drive, length), to refine. Results come one row per physical part:
  - **Ready to use**: states everything you asked for.
  - **Close size**: a size within 0.25 mm.
  - **Might fit**: the description doesn't state something you asked.
  - **Too vague to check**: states none of it (collapsed).

  Click a row for the part panel, which says which GPN to use and why, every GPN it's filed under,
  and anything it could be confused with. The copy icon copies a GPN. Tick up to three rows to
  **Compare**. When nothing fits, the page suggests which detail to drop.
- **New part.** Fill the required fields and copy a description written to the standard. It shows
  the closest stocked parts first, so you can check one more time.
- **Clean up.** Every group of GPNs that look like the same part, by kind, with Google's rule for
  that kind. Pick the GPN to keep, choose *Consolidate / Keep separate / Needs a check*, add a note,
  then **Export decisions** (CSV). Find follows your choice. Decisions are saved in this browser only.
- **Health.** How complete descriptions are by family, which fields they state, and groups to clean
  up. Drop a `GPN,Volume` CSV here to load vendor volumes (`data/demo-volumes.csv` has made-up
  numbers for demos).
- **Standard.** The proposed field order per family, with real records rewritten to it.

Shortcuts: `/` jumps to the search, `Esc` clears it or closes a panel.

## Week 3.2 changes and how they're built

| Asked for in 3.2 | How it's implemented |
|---|---|
| **Recommend parts to consolidate** | `src/engine/groups.ts` finds groups from four kinds of evidence: the same supplier part number, the same description, the same description apart from pack size, and supplier part numbers sharing a base. Each group gets a suggested preferred GPN. **Clean up** lists them for Google to decide, and the reviewer's pick becomes the GPN Find recommends (`withReviews` in `src/ui/store.tsx`). |
| **Add volume** | `rank()` in `src/engine/search.ts` orders each band by lifecycle phase, then volume, then fewest unknowns, then supplier count. The preferred GPN follows the same order. Until vendor volumes arrive, the app shows "volume not loaded" rather than inventing numbers. Volumes load from `data/volumes.csv` at build time, or by dropping a CSV on Health. |
| **Fix the demo bugs** | `src/engine/parse.ts` now reads: a bare PAN head, ST for steel, "square cone washer" (as a washer, not a square drive), M3x5 lengths, and no fake 4.22 mm pitch. Oct 28 additions: lengths like "3/8 IN. LENGTH" and `0.25"`, sizes like `No. 8` and `5/16 x 1-1/2`, `PN PH`, plastic washers, nyloc. Each has a test in `tests/`. |
| **Show near-matches (5.4 vs 5.5 mm)** | A size within `NEAR_MM = 0.25` is *near*, not different. Those parts land in **Close size** with their volume, and as **Near sizes** groups in Clean up. The engineer decides. |
| **Label duplicates by type** | Google's three rulings become kinds: **duplicate** (same part, any lifecycle phase), **pack size** (single vs bulk: kept as separate GPNs, one physical part, volumes summed) and **near size**. Two more cover cases the data threw up: **variant** (supplier numbers share a base but a stated detail differs) and **conflict** (the same supplier part number with contradictory descriptions). |
| **Catch shared part-number prefixes** (1106617 / 1094168) | Prefix matching (`mpnPrefix` in `groups.ts`) groups them. Because their descriptions differ in drive (torx vs Phillips), they're labelled a *variant*, not folded into one part. |
| **Security note for Christine** | No backend and no network calls. The catalogue is a static JSON file built at compile time and bundled into the app, along with the fonts and icons. Typed searches and dropped CSVs stay in the tab; Clean-up decisions are kept in `localStorage` until exported. |
| **Pitch: today vs where we're going** | The Find start screen walks through the target flow: describe it, check what's stocked, use it or request a new one. |
| **Add tests** | 60 Vitest tests, plus `npm run audit:data`, an independent Python check that every catalogue part matches the spreadsheet. |
| *New scope:* **vague descriptions** | **Health** splits each family into complete, partial and vague. Screws, for example, are 62% complete and 20% vague. |
| *New scope:* **description standard** | `src/engine/standard.ts` sets the field order per family. It drives the **Standard** page, the "Written to the standard" box in Find, and the New part form. |
| *New scope:* **kits** | Kits are excluded from search by default; turn them on under **Active parts**. |
| *Waiting on Google* | Not built yet: the screw catalog cross-reference, real vendor volumes, and the Gemini agent. |

## Demo path (about 10 minutes)

The full script, with what to say at each step and answers to likely questions, is in
[docs/demo-golden-path.md](docs/demo-golden-path.md).

1. **Find:** click the example `m3 x 8 pan phillips`. You get 3 ready to use and 2 might fit, and
   the drawing and "Written to the standard" fill in.
2. Click the drive circle on the drawing and pick **torx** (the menu shows "1 fit"). That leaves
   1 ready: **1106617**.
3. Open it. It says to use this GPN because it's in Production, and 1249277 is a Prototype
   duplicate. Under "could be confused with", click the variant **1094168**, then **Back**. Copy
   the GPN.
4. Add `+ material` **brass**. Nothing is ready, and the page offers "Without brass: 1 ready".
   Click **Request a new part**.
5. **New part:** 5 of 5 fields filled. The closest part is 1106617, marked ✕ steel. Remove
   Material: the button changes to **Copy draft**, and the panel shows *already stocked: 1106617*.
6. **Find** `90317A111`: two **conflicting records**. Open one to see the red *Check before using*
   box. Optionally search `7070024` to show "Did you mean 07070024?".
7. Back on `m3 x 8 pan phillips`, tick two ready rows and **Compare**.
8. **Clean up:** on the first duplicate group, keep **2006186**, press **Consolidate** and add a
   note. Searching `2006186` in Find now says *chosen in Clean up*. **Export decisions**.
9. **Health:** 56% of descriptions are complete. Drop `data/demo-volumes.csv` on *Order volumes*.
   In Find, 07052664 now ranks first (4,800 ordered), and the torx part shows 3,050 (both duplicate
   GPNs combined).
10. **Standard:** the field order, and real records rewritten to it.

To reset between runs, reload the page (volumes are held in memory) and clear site data, which
removes any Clean-up decisions.

## Data

- **Spreadsheet.** `data/source.xlsx` is the file Google shared, *Copy of GPNs list-Oct 2026.xlsx*,
  byte for byte. Its two tabs hold 11,844 GPNs.
- **What's in scope.** Screws and bolts, nuts, washers and standoffs: 1,155 GPNs, which fold into
  1,093 physical parts and 69 groups.
- **What's left out.** Cable ties, hooks, pins, anchors, hinges, rivets and retainers. Kits are
  hidden by default.
- **Known Agile error.** 07025700 is a cable-duct cover filed as a standoff.

## Layout

```
data/            source.xlsx, demo-volumes.csv
scripts/         build-catalog.ts (xlsx → catalog), audit-data.py (independent check)
src/engine/      parser, grouping, search, standard, health (pure TypeScript)
src/ui/          React screens: Find, NewPart, Cleanup, Health, Standard, part panel, drawing
src/styles/      Material 3 styling (Google Sans, light and dark)
tests/           Vitest suites
docs/            demo-golden-path.md (demo script), BUILD_GUIDE.md (plan, milestones, design notes)
```
