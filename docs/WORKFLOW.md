# Fastener Finder: workflow

How an engineer finds a part, how Google's team cleans up the catalogue, and where the data comes from. Everything runs in the browser: no backend, and nothing typed or loaded leaves the tab.

```mermaid
flowchart LR
    %% Build time: the Agile export becomes a catalogue bundled into the app
    subgraph DATA["Data (built once, bundled into the app)"]
        direction TB
        X["Agile export<br/>Oct 2026 xlsx<br/>11,844 GPNs"] --> B["Build step<br/>read every description,<br/>find groups,<br/>fold duplicates"]
        B --> C[("Catalogue<br/>1,155 fastener GPNs<br/>1,093 physical parts<br/>69 groups")]
        V["Vendor volumes CSV<br/>(dropped in on Health)"] -.-> C
    end

    %% The design engineer: check before creating
    subgraph ENG["Design engineer: check before creating"]
        direction TB
        N(["Needs a fastener"]) --> S["Find: describe it<br/>'m3 x 8 pan phillips'<br/>or paste a part number"]
        S --> R{"What's stocked?"}
        R -- "Ready to use /<br/>Close size / Might fit" --> P["Part panel<br/>which GPN to use and why,<br/>duplicates, look-alikes"]
        P --> U(["Copy the GPN<br/>and reuse it"])
        R -- "Nothing fits" --> L["Drop a detail?<br/>'Without brass: 1 ready'"]
        L -- "Found one" --> P
        L -- "Still nothing" --> NP["New part<br/>description written<br/>to the standard"]
        NP --> A(["Request a new GPN<br/>in Agile, findable<br/>from day one"])
    end

    %% Google's manufacturing team: consolidate
    subgraph REV["Google's team: clean up the catalogue"]
        direction TB
        Q["Clean up queue<br/>groups by Google's rules:<br/>duplicate, pack size, near size,<br/>variant, conflict"] --> D{"Decide"}
        D -- "Consolidate /<br/>Keep separate" --> E["Export decisions<br/>CSV"]
        D -- "Needs a check" --> EV["Evidence needed:<br/>supplier numbers,<br/>datasheet, sign-off"]
        EV --> E
        E --> AC(["Agile<br/>change request"])
    end

    %% Linking the groups (not individual boxes) keeps each column laid out top to bottom.
    %% One two-way link between the columns keeps them in order: data, engineer, review team.
    DATA --> ENG
    ENG <-- "→ Send to Clean up from a part panel<br/>← the kept GPN becomes the one Find recommends" --> REV
    DATA --> REV

    classDef data fill:#e9eef6,stroke:#747775,color:#1f1f1f
    classDef step fill:#ffffff,stroke:#747775,color:#1f1f1f
    classDef endpoint fill:#d3e3fd,stroke:#0b57d0,color:#041e49
    classDef decision fill:#c2e7ff,stroke:#0b57d0,color:#001d35
    class X,B,C,V data
    class S,P,L,NP,Q,E,EV step
    class N,U,A,AC endpoint
    class R,D decision
```

**Reading it**, left to right:

- **Data.** The Agile export is read once at build time: every description is parsed, GPNs that look like the same part are grouped, and duplicates are folded into physical parts. Vendor volumes, once Google sends them, are dropped in on the Health screen (dotted, because they're optional).
- **Design engineer.** Find shows what's already stocked, one row per physical part. The part panel says which GPN to use and why. If nothing fits, the page suggests which detail to drop, and only then offers a new part, with its description written to the standard.
- **Google's team.** Clean up lists every group by Google's rulings. Each decision is exported as a CSV for the Agile change request.
- **How the two connect** (the two-way arrow). An engineer can send a group from a part panel to the review queue. Once the team picks a GPN to keep, Find recommends that GPN to every engineer.
