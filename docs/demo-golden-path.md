# Fastener Finder: demo golden path

About 8 minutes. Six stops: **find a part → open it → a near size → no dead ends → a conflict → clean up and volumes**. Every click, GPN and count below was checked against the running app on the October 2026 export (28 Oct 2026).

---

## Before you start

1. From the repo root, install and start the app:
   ```bash
   npm install
   ```
   ```bash
   npm run dev
   ```
2. Open `http://127.0.0.1:5180` in a window at least 1280 px wide. The chip at the top right should read **No volumes loaded**, and **Clean up** should say **None reviewed yet**. Anything else is left over from a rehearsal (see *Reset* at the bottom).
3. Have `data/demo-volumes.csv` ready in a Finder window for Stop 6.
4. Keep this page open on a second screen.

---

## Stop 0: the problem (30 s, no clicks)

> "Today an engineer who needs a fastener either searches Agile with Ducky, or pulls something from McMaster and creates a new GPN, because that takes two minutes. Nobody checks first, so Agile has 1,155 fastener GPNs for 1,093 actual parts. This tool makes checking first faster than creating a new part."

Point at the three figures at the bottom of the start screen, and the four blank drawings: "Dashed means unknown. As you describe the part, the drawing fills in."

---

## Stop 1: find an existing screw (1.5 min)

**Do:** Click the example **`m3 x 8 pan phillips`**.

**Expect:**
- Chips: *Thread M3 · Length 8 mm · Head pan head · Drive phillips*, plus dashed `+ material`, `+ finish`…
- The drawing shows an M3 × 8 pan-head Phillips screw.
- *Written to the standard*: `SCREW, PAN HEAD, PHILLIPS, M3 X 8 MM, material?`
- Counts: **3 ready to use · 0 close size · 2 might fit · 15 too vague · 213 ruled out**.

| GPN | Band | Tag |
|---|---|---|
| 07022596 | Ready to use | |
| 07052664 | Ready to use | |
| 1094168 | Ready to use | Prototype, variant |

> "Type it the way you'd say it. One row per physical part, not per GPN. Every green tick is something the description actually states. *Might fit* means the description is silent on something you asked, so check the datasheet. Records that state none of it are folded away."

**Do:** Click the **drive circle** on the right of the drawing. The drive menu shows *phillips 3 fit, torx 1 fit*. Pick **torx**.

**Expect:** The search line rewrites itself to `screw M3 x 8mm pan head torx`. Now **1 ready to use: 1106617**, tagged **+1 duplicate** and **variant**.

> "Typing and pointing are the same thing. The menu tells you how many parts each choice leaves, before you pick it."

---

## Stop 2: which GPN to use, and why (1.5 min)

**Do:** Click the **1106617** row. The part panel slides in.

**Expect:**
- In the blue box: **1106617** (Production). Underneath: *"Use this GPN: it is in Production. 1 other GPN repeats the same part."*
- *Filed under 2 GPNs*: 1106617 and **1249277**, the same captive-washer screw in Prototype.
- *Could be confused with*: **variant 1094168**. *"Supplier part numbers both start G721-03007-01; the drive differs."*

> "This is your first ruling: same part, different lifecycle, so it's a duplicate and we steer to one GPN."

**Do:** Click **1094168** in the panel. It opens in place. Click **Back**.

> "1094168 and 1106617 have nearly the same supplier part number, but one is Phillips and one is Torx. They aren't duplicates, so we call them a variant. They're a candidate if Google wants to standardise on one drive."

**Do:** Click the **copy icon** next to 1106617. *"Copied 1106617"* appears. Press **Esc**.

---

## Stop 3: a near size (1 min)

**Do:** Clear the search (×) and type **`m5 washer 5.4 id`**.

**Expect:** Chips *Fits screw M5 · Inner diameter 5.4 mm*. Counts: **4 ready to use · 11 close size**.
- **1247551** (5.4 mm) is in *Ready to use*, tagged **near size**.
- **1192976** (5.5 mm) is in *Close size*, also tagged **near size**. The marks read *≈ 5.5 mm*.

> "This is your 5.4 versus 5.5 ruling. A size within a quarter of a millimetre isn't hidden as different. It shows as a close size so the engineer decides, and once volumes arrive they'll see which is ordered more. These two share a manufacturer part number, exactly the case you described."

---

## Stop 4: no dead ends, and a new part done properly (1.5 min)

**Do:** Search **`m3 x 8 pan torx brass`**.

**Expect:** **0 ready to use**. The page offers **"Without brass: 1 ready"** instead of a dead end.

> "When nothing fits, it tells you which detail to drop to find something stocked."

**Do:** Scroll down and click **Request a new part**.

**Expect:**
- *5 of 5 required fields*. *Description to submit*: `SCREW, PAN HEAD, TORX, M3 X 8 MM, BRASS`.
- *Nothing stocked states all of this*. The closest part is **1106617**, marked **✕ steel**.

**Do:** Click × on **Material**.

**Expect:** The description shows `material?`, the progress drops to 4 of 5, the button changes to **Copy draft**, and the panel turns blue: **This is already stocked: 1106617**.

> "If they really need a new part, the description is written to the standard, so the next search finds it. And if they leave a detail out, it catches that the part already exists."

---

## Stop 5: paste a part number, find a conflict (45 s)

**Do:** Click **Find** in the rail. Search **`90317A111`** (a McMaster part number).

**Expect:** Two GPNs, **07070024** and **07082586**, both tagged **conflicting record**.

**Do:** Open **07070024**.

**Expect:** A red box: *"Check before using. 07082586 cites the same supplier part number (90317A111) but describes it differently: material, built-in washer. One record is wrong."*

> "Same McMaster part, two contradictory records: zinc-plated steel with a square-cone washer, and stainless with a tooth washer. The tool won't pick a winner."

**Optional:** Search **`7070024`**. It offers *"Did you mean 07070024? Spreadsheets often drop the leading zero."*

---

## Stop 6: clean up and volumes, for Google's team (2 min)

**Do:** Click **Clean up** in the rail.

**Expect:** Tabs **Duplicates 53 · Pack sizes 5 · Near sizes 8 · Variants 2 · Conflicting records 1**, with *Google's rule* in the blue bar above each.

> "This list is for your team, not the engineer: 69 groups of GPNs that may be the same fastener, each with a suggested GPN to keep."

**Do:** Click **Pack sizes**. The first group is four GPNs for one rack screw: **07016397** and **07035144** (pack of 100), **07090971** and **1017592-01** (single).

> "Per your guidance, single and bulk stay separate GPNs, but we treat them as one part and add their volumes together."

**Do:** Click **Duplicates**. On the first group, select **2006186** under *Keep*, press **Consolidate**, and type a note. The progress bar moves to 1 of 53.

**Do:** Click **Find** and search **`2006186`**. Open it.

**Expect:** *"Use this GPN: chosen in Clean up."*

> "Your team's decision flows straight back to the engineer. **Export decisions** gives you the CSV for the Agile change request."

**Do:** Click **Health**. Point at **56%** of descriptions stating every key field. Drag **`data/demo-volumes.csv`** onto *Order volumes*. Say: *these are made-up numbers to show the mechanism.*

**Expect:** The chip at the top right reads **Volumes for 5 GPNs**.

**Do:** Click **Find** and search **`m3 x 8 pan phillips`**.

**Expect:** **07052664 (4,800 ordered)** now ranks first. On `m3 x 8 pan torx`, 1106617 shows **3,050 ordered**: both duplicate GPNs combined.

> "That's your preference for high runners, applied the moment the vendor volumes arrive."

---

## Close (30 s)

**Optional:** Click **Standard** for the proposed field order and real records rewritten to it.

> "Next: real vendor volumes to pick the preferred parts, Henry's screw catalog to compare against this list, and your security review. There's no backend and no network calls; the catalogue is a static file bundled into the app."

---

## If they ask

| Question | Answer |
|---|---|
| Is this live Agile data? | No. It's the October 2026 export, bundled into the app. An independent check confirms all 1,155 parts match the spreadsheet exactly. |
| How does it read the specs? | Fixed rules on the description text, no AI model. Covered by 60 tests. |
| Why are some details "not stated"? | The description doesn't say them. 44% of fastener descriptions miss a key field; that's the case for the description standard. |
| Does it decide what's interchangeable? | No. It labels candidates; an engineer or Google makes the call. |
| Why does volume say "not loaded"? | We're waiting on vendor volumes. The ranking already uses volume when it's there, as Stop 6 shows. |
| Could this be a Gemini agent? | Yes. The matching engine is plain functions that could sit behind an agent as a tool. We'd wait on the security review first. |

## Avoid during the demo

- **Don't expand *Too vague to check*.** It's a long list of records that state almost nothing.
- **Don't call the demo volumes real.** `data/demo-volumes.csv` is made up. Don't save it as `data/volumes.csv` either, or the next catalogue rebuild will bake the made-up numbers in.

## Reset between runs

- **Volumes:** reload the page; they're held in memory only.
- **Clean-up decisions:** clear the site's data in the browser, or run `localStorage.removeItem('fastener-finder.reviews.v1')` in the console.
