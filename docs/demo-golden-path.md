# Fastener Finder: demo golden path

A three-part demo for Google's team, about 12 minutes plus questions. Each part has one presenter. Every click, GPN and count below was checked against the running app on the October 2026 export (28 Oct 2026).

| Part | Presenter | Story | Time |
|---|---|---|---|
| 1. Finding a part before creating one | **Bilva** | The engineer's workflow: describe it, refine it, see which GPN to use, and what happens when nothing fits | ~4.5 min |
| 2. Part numbers and cleaning up the catalogue | **Valentina** | Searching by part number, a conflicting record, and the review queue for Google's team | ~4 min |
| 3. Volumes, near sizes and the standard | **Ishan** | Google's 5.4 vs 5.5 ruling, high runners once volumes arrive, and the description standard; then the close | ~3.5 min |

**How to read each step.** **Do** is what to click. **Expect** is what should appear; if it doesn't, see *If something goes wrong* at the end. **Say** is the script, in quotes. **Why it matters** is background for the presenter, not to read out.

The parts run in order on one laptop, and each part relies on what the one before left behind (Part 1 sends a group to Clean up; Part 2 decides it). Whoever presents drives, or one person drives for everyone; agree which before the call.

---

## Before the call (10 minutes, whoever is hosting)

1. From the repo root, install and start the app:
   ```bash
   npm install
   ```
   ```bash
   npm run dev
   ```
2. Open `http://127.0.0.1:5180` in a window at least 1280 px wide, light mode.
3. Check the starting state:
   - the chip at the top right reads **No volumes loaded**;
   - **Clean up** says **None reviewed yet**, and there's no red number on Clean up in the left rail.

   If either is off, see *Reset* at the end.
4. Have `data/demo-volumes.csv` open in a Finder window, ready to drag in Part 3.
5. Each presenter: keep your part of this document open on a second screen.
6. Agree on who answers which questions (table at the end).

---

# Part 1 · Bilva: finding a part before creating one (~4.5 min)

### 1.1 Open: the problem (30 s, no clicks)

**Expect:** the start screen. The search bar, example searches, four blank fastener drawings, three steps, and three figures at the bottom: **1,155 · 1,093 · 62**.

**Say:**
> "Today, an engineer who needs a fastener has two options: search Agile's free-text descriptions, or grab something from McMaster and create a new GPN. Creating one takes two minutes, so that's what happens. Nobody checks first.
>
> That's how Agile ended up with 1,155 fastener GPNs for 1,093 actual parts: 62 GPNs repeat a part Google already stocks. Every repeat splits the volume and makes bulk pricing harder.
>
> This tool makes checking first faster than creating a new part. I'll show the engineer's side; Valentina will show the review side for your team, and Ishan will show volumes and the description standard."

**Why it matters:** the 3.2 feedback asked us to frame this as *today vs where we're going*. This opening is the "today".

### 1.2 Describe it the way you'd say it (1 min)

**Do:** Click the example **`m3 x 8 pan phillips`**.

**Expect:**
- Blue chips: *Thread M3 · Length 8 mm · Head pan head · Drive phillips*. Dashed chips (`+ type`, `+ material`…) for what you haven't said.
- The drawing on the left becomes an M3 × 8 mm pan-head Phillips screw.
- *Written to the standard*: `SCREW, PAN HEAD, PHILLIPS, M3 X 8 MM, material?`
- Counts: **3 ready to use · 0 close size · 2 might fit · 15 too vague · 213 ruled out**.
- Ready to use: **07022596**, **07052664**, **1094168** (Prototype, tagged *variant*).

**Say:**
> "The engineer types it the way they'd say it. No forms, no dropdowns. The tool reads it back as chips, so you can see exactly what it understood, and the drawing is a quick 'is this what I meant?'
>
> Each row is one *physical* part, not one GPN. Duplicates are folded together. Every green tick is something the description actually states. Three parts are ready to use. Two *might fit*: their descriptions don't say the head or the length, so you'd check the datasheet. And fifteen descriptions are so vague we can't tell, so they're folded away."

**Why it matters:** an unknown is never treated as a match. That's the rule that keeps the results trustworthy.

### 1.3 Refine by pointing at the drawing (45 s)

**Do:** Click the **drive circle** at the right of the drawing (the round end view). A menu opens.

**Expect:** the menu lists drives with how many parts would fit: **phillips 3 fit**, **torx 1 fit**, the rest *none fit*.

**Say:**
> "You can refine by pointing. Click the drive, and before you choose, it tells you how many stocked parts each choice leaves you with."

**Do:** Pick **torx**.

**Expect:** the search line rewrites itself to `screw M3 x 8mm pan head torx`; **1 ready to use: 1106617**, tagged **+1 duplicate** and **variant**.

**Say:**
> "Typing and pointing are the same thing. The search line and the drawing always agree."

### 1.4 Which GPN to use, and why (1.5 min)

**Do:** Click the **1106617** row. A panel slides in from the right.

**Expect:**
- At the top, in a blue box: **1106617**, *Production*.
- Underneath: *"Use this GPN: it is in Production. 1 other GPN repeats the same part."*
- *What the descriptions state*: each field, with ✓ *matches* beside the ones you asked for.
- *Filed under 2 GPNs*: **1106617** (Production, *Use this one*) and **1249277** (Prototype), each with suppliers and source rows in the spreadsheet.

**Say:**
> "This is the answer the engineer actually needs: which GPN to use. This part is in Agile twice. 1249277 is the same screw, still in Prototype. That's your first ruling: same part, different lifecycle, so it's a duplicate, and we point everyone to the Production GPN."

**Do:** Scroll down to *Could be confused with*.

**Expect:** a **variant** tag, *"Supplier part numbers both start G721-03007-01; the drive differs"*, and **1094168** below it.

**Say:**
> "And here's something we found in your data. 1094168's supplier part number is almost identical, but it's the Phillips version. Same base number, real difference, so we flag it rather than merge it."

**Do:** Click **1094168**. It opens in the same panel. Then click **Back**.

**Do:** Click the **copy icon** next to **1106617** at the top.

**Expect:** *"Copied 1106617"* at the bottom left.

**Say:**
> "One click, and the engineer has the GPN."

**Do:** Scroll to the bottom of the panel. Under **Clean up**, on the **duplicate** row (1106617, 1249277), press **Send to Clean up**.

**Expect:** the row now reads *In the queue*, and a red **1** appears on **Clean up** in the left rail.

**Say:**
> "If the engineer thinks these should be consolidated, they send the group to your team's review queue. Valentina will pick that up in a minute."

**Do:** Press **Esc** to close the panel.

### 1.5 When nothing fits (1 min)

**Do:** Click the dashed **`+ material`** chip, type `bra`, and press **Enter** (brass).

**Expect:** **0 ready to use**. Instead of a dead end, a suggestion: **Without brass · 1 ready**.

**Say:**
> "Say the engineer needs brass. Nothing stocked is an exact fit, but the tool doesn't stop at 'no results'. It tells you which detail to drop to find something you already have."

**Do:** Scroll down and click **Request a new part**.

**Expect:**
- *5 of 5 required fields*.
- *Description to submit*: `SCREW, PAN HEAD, TORX, M3 X 8 MM, BRASS`.
- *Nothing stocked states all of this*: closest is **1106617**, marked **✕ steel**.

**Say:**
> "If they really do need a new part, the description is written to a standard, so the next engineer's search will find it. And it still shows the closest stocked part, which here is the same screw in steel."

**Do:** Click **×** on **Material**.

**Expect:** the description now ends `material?`, the progress shows **4 of 5**, the button changes to **Copy draft**, and the panel on the right turns blue: **This is already stocked: 1106617**.

**Say:**
> "And if they leave the material off, it catches that the part already exists. Creating a GPN is fine. Creating a duplicate shouldn't be possible by accident."

**Handoff (Bilva):**
> "So that's the engineer's side. Valentina will show what happens when you search by part number, and the review queue for your team."

---

# Part 2 · Valentina: part numbers and cleaning up the catalogue (~4 min)

### 2.1 Search by part number (1 min)

**Do:** Click **Find** in the left rail. Clear the search (×) and type **`90317A111`**.

**Expect:** a band *That part number* with two GPNs, **07070024** and **07082586**, both tagged **conflicting record**.

**Say:**
> "Engineers often start from a McMaster part number they already know. Paste it in and you get every GPN filed under it. This one turned up something interesting."

**Do:** Click **07070024**.

**Expect:** the GPN sits in a **red** box, with: *"Check before using. 07082586 cites the same supplier part number (90317A111) but describes it differently: material, built-in washer. One record is wrong."*

**Say:**
> "Two GPNs cite the same McMaster part, but one says zinc-plated steel with a square-cone washer and the other says stainless with a tooth washer. They can't both be right. The tool won't pick a winner. It tells the engineer to check the datasheet first."

**Do:** Press **Esc**.

### 2.2 Partial numbers and dropped zeros (45 s)

**Do:** Clear the search and type **`91114`**.

**Expect:** a band *Part numbers starting with 91114*, with two washers: **04100607** (#10) and **07002501** (3/8). Their supplier numbers are 91114A011 and 91114A031.

**Say:**
> "If you only remember the start of a number, it still helps. It finds every part whose supplier number starts with it."

**Do:** Clear the search and type **`7070024`**.

**Expect:** *"No GPN 7070024. Did you mean 07070024? Spreadsheets often drop the leading zero."*

**Say:**
> "And because GPNs get copied through spreadsheets, leading zeros go missing. We suggest the right one rather than guessing, because in your data some GPNs really do differ only by a leading zero."

**Why it matters:** 7018362 and 07018362 are different GPNs in the export, so matching automatically would be wrong.

### 2.3 The review queue (1.5 min)

**Do:** Click **Clean up** in the left rail (it shows the red **1**).

**Expect:**
- Tabs: **Duplicates 53 · Pack sizes 5 · Near sizes 8 · Variants 2 · Conflicting records 1**.
- A blue bar with *Google's rule* for this kind: *"The same part entered more than once. Consolidate onto the preferred GPN, even when the lifecycle phases differ."*
- First card, tagged **Sent from Find**: **1106617** and **1249277**, with **1106617** selected under *Keep*.

**Say:**
> "This side is for your team: 69 groups of GPNs that look like the same part, sorted by your three rulings plus two cases we found in the data. Each group has a suggested GPN to keep. The group Bilva sent from Find is at the top."

**Do:** On that card, press **Needs a check**.

**Expect:** a checklist appears: *Agile supplier part number for each GPN · Datasheet or catalog spec · Engineering sign-off*. The red 1 on the rail disappears.

**Do:** Tick **Engineering sign-off**.

**Say:**
> "When a reviewer isn't ready to decide, they record what they need to see first, and it goes into the export."

**Do:** Press **Next group →**.

**Expect:** the page scrolls to the next undecided group, **2006186 / 2006200** (two identical descriptions, both Prototype).

**Do:** Under *Keep*, select **2006186**. Press **Consolidate**. Type a short note, e.g. `keep the older GPN`.

**Expect:** the progress bar reads **2 of 53 reviewed**.

**Say:**
> "Next group, decide, add a note. Your team can work through the list without hunting for the next one."

### 2.4 Decisions flow back, and pack sizes (45 s)

**Do:** Click **Find**, search **`2006186`**, and open the row.

**Expect:** *"Use this GPN: chosen in Clean up."*

**Say:**
> "Once your team decides, engineers immediately get pointed at the GPN you chose."

**Do:** Press **Esc**. Click **Clean up**, then the **Pack sizes** tab.

**Expect:** the first group is four GPNs for one rack screw: **07016397** and **07035144** (*pack of 100*), and **07090971** and **1017592-01** (single).

**Say:**
> "Your third ruling: single and bulk packs stay as separate GPNs, but we treat them as one part and add their volumes together."

**Do (optional):** **Export decisions** downloads a CSV for the Agile change request.

**Handoff (Valentina):**
> "That's the clean-up side. Ishan will show your 5.4 versus 5.5 ruling, and what changes once vendor volumes come in."

---

# Part 3 · Ishan: volumes, near sizes and the standard (~3.5 min)

### 3.1 Near sizes: Google's 5.4 vs 5.5 ruling (1 min)

**Do:** Click **Find**. Clear the search and type **`m5 washer 5.4 id`**.

**Expect:**
- Chips: *Fits screw M5 · Inner diameter 5.4 mm*. Counts: **4 ready to use · 11 close size**.
- **1247551** (5.4 mm) is in *Ready to use*, tagged **near size**.
- In *Close size*, press **Show 6 more**: **1192976** (5.5 mm) is there, also tagged **near size**, marked **≈ 5.5 mm**.

**Say:**
> "In the last call you told us a 5.4 and a 5.5 millimetre part shouldn't be merged, but the engineer should see both and pick. That's what *close size* does. Anything within a quarter of a millimetre, or 3% on bigger sizes, shows up instead of being hidden as different. These two even share a manufacturer part number, which is exactly the case you described."

**Why it matters:** the tolerance scales with size, so a 22.2 mm washer OD counts as close to 22.7 mm in the same way.

### 3.2 How complete the descriptions are (45 s)

**Do:** Click **Health** in the left rail.

**Expect:**
- *"56% of fastener descriptions state every key field."*
- Figures: **1,155** GPNs · **1,093** physical parts · **62** repeats · **101** filed under another part type.
- Completeness bars: screws **62%** complete, nuts **54%**, washers **55%**, standoffs **20%**.

**Say:**
> "You asked how many descriptions are too vague to search. Just over half state every key field. The rest are why engineers can't find parts. And 101 fasteners are filed under the wrong part type entirely, so a search by type would never show them."

### 3.3 Volumes: the high runners (1 min)

**Do:** Drag **`data/demo-volumes.csv`** onto *Order volumes* (or click *choose a file*).

**Expect:** *"Read 5 rows from demo-volumes.csv; 5 GPNs matched the catalogue."* The chip at the top right reads **Volumes for 5 GPNs**.

**Say:**
> "We're still waiting on your vendor volumes, so these five numbers are made up, just to show the mechanism. When the real file arrives, you drop it in here, and nothing leaves the browser."

**Do:** Click **Find** and search **`m3 x 8 pan phillips`**.

**Expect:**
- Above the results: *"07052664 takes 76% of the 6,300 ordered across 3 parts that fit"*, with a bar split three ways.
- **07052664** now ranks first, tagged **High runner**, *4,800 ordered*.

**Say:**
> "Now results rank by volume within each lifecycle phase, and the high runners stand out. For this spec, one GPN carries three-quarters of the orders. That's the consolidation case in one picture: the other two are candidates to retire."

**Do:** Search **`m3 x 8 pan torx`**.

**Expect:** **1106617** shows **3,050 ordered**.

**Say:**
> "And because duplicates are folded together, their volume is too: 950 on the Production GPN plus 2,100 on the Prototype one."

### 3.4 The description standard (30 s)

**Do:** Click **Standard** in the left rail.

**Expect:** the field order for screws (*SCREW*, head, drive, thread, length, material, then type, pitch, finish, built-in washer, strength) and *Real records, rewritten*: six current descriptions, each with its standard version and the missing fields marked with a dashed box.

**Say:**
> "The long-term fix is a standard: every description states the same fields, in the same order. Here are real records from your export, rewritten. The dashed boxes are what the engineer would have to supply. The New part form Bilva showed writes descriptions this way automatically."

### 3.5 Close (30 s)

**Say:**
> "So: today there's no process, and engineers default to a new GPN. With this, they check first, see which GPN to use, and when they do create one, it's findable from day one.
>
> What we need from you: the vendor volumes, Henry's screw catalog to compare against this list, and your security review. On security: there's no backend and no network calls. The data is a static file built into the app, and nothing typed leaves the browser.
>
> Happy to take questions."

---

## Questions, and who answers

| Question | Who | Answer |
|---|---|---|
| Is this live Agile data? | Bilva | No. It's the October 2026 export, bundled into the app. An independent check confirms all 1,155 parts match the spreadsheet exactly. Hooking up an internal feed later is a contained change. |
| How does it read the descriptions? | Bilva | Fixed rules, no AI model. 63 automated tests cover them, including every bug found in demos. |
| Why are some details "not stated"? | Ishan | The description doesn't say them. 44% of fastener descriptions miss a key field; that's the case for the standard. |
| Does it decide what's interchangeable? | Valentina | No. It labels candidates; an engineer or your team makes the call in Clean up. |
| Where do decisions go? | Valentina | They stay in the browser until exported as a CSV for the Agile change request. Nothing is written back to Agile. |
| Why does volume say "not loaded"? | Ishan | We're waiting on vendor volumes. Ranking already uses them as soon as a CSV is dropped in, as you saw. |
| Could this be a Gemini agent? | Bilva | Yes. The matching logic is plain functions that could sit behind an agent as a tool. We'd wait on the security review first. |
| Can it handle kits? | Valentina | Kits are excluded from search by default and can be switched on under *Active parts*. We're waiting on Christine's kit details. |

## Don't

- **Don't expand *Too vague to check*.** It's a long list of records that state almost nothing.
- **Don't call the demo volumes real.** `data/demo-volumes.csv` is made up. Don't save it as `data/volumes.csv`, or the next catalogue rebuild will bake those numbers in.
- **Don't run Part 2 or 3 on their own without Part 1 first.** Part 2 picks up the group Part 1 sends to Clean up.

## If something goes wrong

| Symptom | Fix |
|---|---|
| Counts don't match this script | Volumes or decisions from a rehearsal are still loaded. Reset (below). |
| No red **1** on Clean up in Part 2 | Part 1's **Send to Clean up** was skipped. Open 1106617 in Find and send it from the panel, or carry on and present the queue without it. |
| A search shows *"Not understood… Did you mean…?"* | A typo. Click the suggestion. |
| The page looks cramped | The window is under 1280 px wide. Widen it. |

## Reset between runs

- **Volumes:** reload the page; they're held in memory only.
- **Clean-up decisions and sent groups:** clear the site's data in the browser, or run this in the console:
  ```js
  localStorage.clear()
  ```
