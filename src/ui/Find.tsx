// Find: describe the fastener in one line, see the parts Google already stocks.

import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Icon } from './Icon';
import type { Attr, Catalog, Family, Spec } from '../engine/types';
import { ATTRS_BY_FAMILY, ATTR_LABEL, PHASES } from '../engine/types';
import { parseQuery, suggestWord } from '../engine/parse';
import { DEFAULT_SCOPE, Hit, Scope, askedAttrs, hitFor, numberMatches, numberPrefixMatches, numberSuggestions, search } from '../engine/search';
import { standardDescription } from '../engine/standard';
import { specToQuery, withAttr } from '../engine/query';
import { useStore } from './store';
import { Chip } from './Picker';
import { Drawing } from './Drawing';
import { FAMILY_LABEL, formatValue, plural } from './format';
import { PartPanel, PhasePill, usePartPanel } from './PartDrawer';
import { Compare } from './Compare';
import { StandardText } from './StandardText';
import { Gpn } from './Gpn';
import { Mark } from './Mark';
import { KIND_ONE } from './rules';
import { VolumeShare } from './VolumeShare';

const EXAMPLES: string[] = [
  'm3 x 8 pan phillips',
  '#6-32 x 1/4 flat',
  'm4 socket head stainless',
  '10-32 cage nut',
  'm3 hex nut',
  'm5 split lock washer',
  'flat washer #8',
  'm3 standoff 10 mm',
];

const FAMILIES: Family[] = ['screw', 'nut', 'washer', 'standoff'];
const MAX_COMPARE = 3;

export const SEARCH_INPUT_ID = 'spec-input';

export function Find({ q }: { q: string }) {
  const { catalog, go } = useStore();
  const [scope, setScope] = useState<Scope>(DEFAULT_SCOPE);
  const [openAttr, setOpenAttr] = useState<Attr | null>(null);
  const panel = usePartPanel();
  const drawer = panel.top;
  const setDrawer = panel.open;
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const deferred = useDeferredValue(q);
  // While the deferred search catches up with the typing, hold back messages about it.
  const settled = deferred === q;

  const read = useMemo(() => parseQuery(deferred), [deferred]);
  const spec = read.spec;
  const result = useMemo(() => search(catalog, spec, scope, deferred), [catalog, spec, scope, deferred]);
  const numbers = useMemo(() => numberMatches(catalog, deferred), [catalog, deferred]);
  const zeroHints = useMemo(() => (numbers.parts.length ? [] : numberSuggestions(catalog, deferred)), [catalog, numbers, deferred]);
  // A word that found a GPN or supplier part number was understood.
  // When a whole number finds nothing, parts whose number starts with it are a lead.
  const partial = useMemo(() => {
    if (numbers.parts.length || read.spec.family) return { hits: [] as Hit[], words: new Set<string>() };
    const m = numberPrefixMatches(catalog, deferred);
    const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));
    return { hits: m.parts.map((pp) => hitFor(catalog, pp, null, byGpn)), words: m.words };
  }, [catalog, numbers, read, deferred]);
  const unread = read.unread.filter((w) => !numbers.words.has(w) && !partial.words.has(w) && !zeroHints.some((z) => z.typed === w));
  const family = spec.family;

  const setQuery = (text: string) => go({ page: 'find', q: text }, true);
  const replaceWord = (from: string, to: string) => setQuery(q.replace(from, to));
  // How many parts each value of a chip would leave ready or close, given the rest of the search.
  const countFor = useCallback(
    (a: Attr) => (v: string | number) => {
      const r = search(catalog, withAttr(spec, a, v), scope);
      return r.ready.length + r.close.length;
    },
    [catalog, spec, scope]
  );
  const setSpec = (next: Spec) => setQuery(specToQuery(next));
  const setFamily = (f: Family) => setSpec({ ...spec, family: f });
  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-MAX_COMPARE)));

  const hits = [...result.ready, ...result.close, ...result.maybe];
  // A record that states none of what was asked can't be checked; keep it out of the way.
  const checkable = (h: Hit) => h.checks.some((c) => c.verdict === 'match' || c.verdict === 'near');
  const maybe = result.maybe.filter(checkable);
  const silent = result.maybe.filter((h) => !checkable(h));
  const empty = !q.trim();
  const standard = family ? standardDescription(spec) : null;
  const asked = family ? askedAttrs(spec) : [];
  const unset = family ? ATTRS_BY_FAMILY[family].filter((a) => !asked.includes(a) && a !== 'pitch') : [];

  const chip = (a: Attr) =>
    family ? (
      <Chip
        key={a}
        catalog={catalog}
        family={family}
        attr={a}
        spec={spec}
        open={openAttr === a}
        onOpen={(o) => setOpenAttr(o ? a : null)}
        onSet={(v) => setSpec(withAttr(spec, a, v))}
        countFor={countFor(a)}
      />
    ) : null;

  return (
    <div className="find">
      <h1 className="sr-only">Find a fastener</h1>
      <div className={`spec-line${empty ? ' is-empty' : ''}`}>
        <Icon name="search" size={22} className="spec-icon" />
        <input
          id={SEARCH_INPUT_ID}
          className="spec-input"
          value={q}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && q) setQuery('');
          }}
          placeholder="Describe the fastener, or paste a GPN or supplier part number"
          aria-label="Describe the fastener, or paste a part number"
          spellCheck={false}
          autoComplete="off"
          autoFocus
        />
        {q ? (
          <button type="button" className="icon-btn spec-clear" onClick={() => setQuery('')} aria-label="Clear the search" title="Clear (Esc)">
            <Icon name="close" size={20} />
          </button>
        ) : (
          <kbd className="spec-kbd" title="Press / to search from anywhere">/</kbd>
        )}
      </div>

      {empty ? (
        <Start
          onPick={(text) => {
            setQuery(text);
            // Put the caret after the example so typing adds to it.
            requestAnimationFrame(() => {
              const el = document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null;
              el?.focus();
              el?.setSelectionRange(text.length, text.length);
            });
          }}
        />
      ) : (
        <div className="read-back">
          {!family && (result.byNumber.length || partial.hits.length || zeroHints.length || !settled) ? null : (
          <div className="family-switch" role="radiogroup" aria-label="Kind of fastener">
            {FAMILIES.map((f) => (
              <button key={f} type="button" role="radio" aria-checked={family === f} className={family === f ? 'is-current' : ''} onClick={() => setFamily(f)}>
                {family === f ? <Icon name="check" size={18} /> : null}
                {FAMILY_LABEL[f]}
              </button>
            ))}
          </div>
          )}
          {family ? (
            <div className="chips" aria-label="What the search understood">
              {asked.map(chip)}
              {unset.map(chip)}
              {asked.length > 1 ? (
                <button type="button" className="link chips-clear" onClick={() => setSpec({ ...parseQuery('').spec, family })}>
                  Clear all
                </button>
              ) : null}
            </div>
          ) : null}
          {settled && unread.length ? (
            <p className="unread">
              Not understood, so not searched on: {unread.map((w, i) => <q key={i}>{w}</q>)}
              {unread.map((w) => {
                const s = suggestWord(w);
                return s ? (
                  <button key={`s-${w}`} type="button" className="suggest-btn suggest-inline" onClick={() => replaceWord(w, s)}>
                    Did you mean <strong>{s}</strong>?
                  </button>
                ) : null;
              })}
            </p>
          ) : null}
          {settled && read.notRecorded.length ? (
            <p className="unread">
              Not searched on: {read.notRecorded.map((w, i) => <q key={i}>{w}</q>)} Agile descriptions don't record this, so it can't narrow the results.
            </p>
          ) : null}
          {settled && zeroHints.length ? (
            <p className="unread">
              {zeroHints.map((z) => (
                <span key={z.typed}>
                  No GPN <q>{z.typed}</q>.{' '}
                  <button type="button" className="suggest-btn suggest-inline" onClick={() => replaceWord(z.typed, z.gpn)}>
                    Did you mean <strong>{z.gpn}</strong>?
                  </button>{' '}
                  Spreadsheets often drop the leading zero.
                </span>
              ))}
            </p>
          ) : null}
        </div>
      )}

      {result.byNumber.length ? (
        <section className="band band-number">
          <header className="band-head">
            <h2>That part number</h2>
            <p>The GPN or supplier part number you typed is filed under {result.byNumber.length === 1 ? 'this part' : 'these parts'}.</p>
          </header>
          <div className="hits">
            {result.byNumber.map((h) => (
              <HitRow key={h.part.id} hit={h} active={drawer === h.part.id} onOpen={() => setDrawer(h.part.id)} compare={compare} onCompare={toggleCompare} />
            ))}
          </div>
        </section>
      ) : null}

      {partial.hits.length ? (
        <section className="band band-number">
          <header className="band-head">
            <h2>Part numbers starting with {[...partial.words].join(', ')}</h2>
            <p>No GPN or supplier part number is exactly that. These start with it; check the full number before using one.</p>
          </header>
          <div className="hits">
            {partial.hits.map((h) => (
              <HitRow key={h.part.id} hit={h} active={drawer === h.part.id} onOpen={() => setDrawer(h.part.id)} compare={compare} onCompare={toggleCompare} />
            ))}
          </div>
        </section>
      ) : null}

      {family ? (
        <div className="find-grid">
          <aside className="spec-panel" aria-label="The part you described">
            <div className="drawing-card">
              <Drawing spec={spec} onPick={(a) => setOpenAttr(a)} />
              <p className="spec-caption">Dashed means not stated yet. Click any part of the drawing to set it.</p>
            </div>
            {standard ? (
              <div className="spec-standard">
                <h2>Written to the standard</h2>
                <StandardText text={standard.text} />
                {standard.missing.length ? <p className="spec-missing">Missing {standard.missing.map((a) => ATTR_LABEL[a].toLowerCase()).join(', ')}.</p> : null}
              </div>
            ) : null}
          </aside>

          <div className="results" aria-live="polite">
            <div className="tally-row">
              <div className="tally">
                <Tally n={result.ready.length} label="ready to use" hue />
                <Tally n={result.close.length} label="close size" />
                <Tally n={maybe.length} label="might fit" />
                <Tally n={silent.length} label="too vague" faint />
                <Tally n={result.excluded.length} label="ruled out" faint />
              </div>
              <ScopeMenu scope={scope} onChange={setScope} hidden={result.outOfScope} />
            </div>

            {hits.length === 0 ? (
              <DeadEnd q={q} spec={spec} scope={scope} excluded={result.excluded} onOpen={setDrawer} onSpec={setSpec} />
            ) : (
              <>
                {result.ready.length === 0 ? <Loosen spec={spec} scope={scope} onSpec={setSpec} /> : null}
                <VolumeShare hits={[...result.ready, ...result.close]} />
                <Band title="Ready to use" note="States everything you asked for." hits={result.ready} drawer={drawer} onOpen={setDrawer} compare={compare} onCompare={toggleCompare} collapseAfter={8} />
                <Band
                  title="Close size"
                  note="One size is within 0.25 mm of what you asked. Check it suits the application."
                  hits={result.close}
                  drawer={drawer}
                  onOpen={setDrawer}
                  compare={compare}
                  onCompare={toggleCompare}
                  collapseAfter={5}
                />
                <Band title="Might fit" note={mightFitNote(maybe)} hits={maybe} drawer={drawer} onOpen={setDrawer} compare={compare} onCompare={toggleCompare} collapseAfter={5} />
                <Band
                  title="Too vague to check"
                  note="These descriptions state none of what you asked. Shown in case one is the part you need."
                  hits={silent}
                  drawer={drawer}
                  onOpen={setDrawer}
                  compare={compare}
                  onCompare={toggleCompare}
                  collapseAfter={0}
                />
                <div className="new-cta">
                  <p>
                    <strong>None of these right?</strong> Request a new part and get its description written to the standard.
                  </p>
                  <button type="button" className="btn" onClick={() => go({ page: 'new', q })}>
                    <Icon name="add" size={18} /> Request a new part
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : settled && !empty && !result.byNumber.length && !partial.hits.length && !zeroHints.length ? (
        <p className="hint">
          Say what kind of fastener it is, or start with a size like M3 or 10-32. Or pick one:{' '}
          {FAMILIES.map((f, i) => (
            <span key={f}>
              <button type="button" className="link" onClick={() => setFamily(f)}>
                {FAMILY_LABEL[f].toLowerCase()}
              </button>
              {i < FAMILIES.length - 1 ? ', ' : '.'}
            </span>
          ))}
        </p>
      ) : null}

      {compare.length ? (
        <div className="compare-bar" role="region" aria-label="Compare">
          <span>
            {plural(compare.length, 'part')} picked{compare.length < 2 ? '. Pick one more to compare.' : ''}
          </span>
          <button type="button" className="btn btn-primary" disabled={compare.length < 2} onClick={() => setComparing(true)}>
            Compare
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setCompare([])}>
            Clear
          </button>
        </div>
      ) : null}

      <PartPanel panel={panel} asked={spec} />
      {comparing && compare.length >= 2 ? <Compare ids={compare} asked={spec} onClose={() => setComparing(false)} /> : null}
    </div>
  );
}

function Start({ onPick }: { onPick: (q: string) => void }) {
  const { catalog } = useStore();
  const h = catalog.health;
  return (
    <div className="start">
      <div className="examples">
        <p className="examples-label">Try one</p>
        <div className="examples-list">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="example" onClick={() => onPick(e)}>
              {e}
            </button>
          ))}
          <button type="button" className="example is-number" onClick={() => onPick('90317A111')}>
            90317A111
          </button>
        </div>
      </div>
      <p className="start-number">
        Have a part number? Paste a GPN or a supplier or McMaster number, whole or just the start of it (try{' '}
        <button type="button" className="link" onClick={() => onPick('91114')}>
          91114
        </button>
        ).
      </p>

      <div className="kinds">
        <p className="examples-label">Or start from the kind</p>
        <div className="family-cards">
          {FAMILIES.map((f) => (
            <button key={f} type="button" className="family-card" onClick={() => onPick(f)}>
              <Drawing spec={{ ...parseQuery('').spec, family: f }} />
              <span className="family-card-label">
                {FAMILY_LABEL[f]}
                <span className="num">{h.byFamily[f].toLocaleString('en-US')} GPNs</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <ol className="how">
        <li>
          <strong>Describe it</strong>
          <span>Size, head, drive, material, in any order and your own words. Paste a GPN or supplier part number if you have one.</span>
        </li>
        <li>
          <strong>Check what's stocked</strong>
          <span>One row per physical part, ready ones first. A tick means it matches; a dashed “?” means the description doesn't say.</span>
        </li>
        <li>
          <strong>Use it, or request a new one</strong>
          <span>Copy the preferred GPN. If nothing fits, the new-part form writes the description to the standard.</span>
        </li>
      </ol>

      <dl className="facts">
        <div>
          <dt>Fastener GPNs in Agile</dt>
          <dd className="num">{h.inScope.toLocaleString('en-US')}</dd>
        </div>
        <div>
          <dt>Distinct physical parts</dt>
          <dd className="num">{h.physicalParts.toLocaleString('en-US')}</dd>
        </div>
        <div>
          <dt>GPNs that repeat a stocked part</dt>
          <dd className="num">{(h.inScope - h.physicalParts).toLocaleString('en-US')}</dd>
        </div>
      </dl>
      <p className="start-note">Runs entirely in this browser. Nothing you type is sent anywhere.</p>
    </div>
  );
}

function mightFitNote(maybe: Hit[]): string {
  const counts = new Map<Attr, number>();
  for (const h of maybe) for (const c of h.checks) if (c.verdict === 'unknown') counts.set(c.attr, (counts.get(c.attr) ?? 0) + 1);
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([a]) => ATTR_LABEL[a].toLowerCase());
  return top.length ? `The description doesn't state the ${top.join(' or ')}. Check the datasheet before using one.` : "The description doesn't state everything you asked.";
}

function Tally({ n, label, hue, faint }: { n: number; label: string; hue?: boolean; faint?: boolean }) {
  return (
    <div className={`tally-cell${hue && n ? ' is-hue' : ''}${faint ? ' is-faint' : ''}`}>
      <strong className="num">{n.toLocaleString('en-US')}</strong>
      <span>{label}</span>
    </div>
  );
}

function ScopeMenu({ scope, onChange, hidden }: { scope: Scope; onChange: (s: Scope) => void; hidden: number }) {
  const [open, setOpen] = useState(false);
  const isDefault = scope.phases.length === DEFAULT_SCOPE.phases.length && scope.phases.every((p) => DEFAULT_SCOPE.phases.includes(p)) && !scope.kits;
  return (
    <div className="scope">
      <button type="button" className={`btn btn-quiet scope-toggle${isDefault ? '' : ' is-changed'}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="tune" size={18} />
        {isDefault ? 'Active parts' : `${plural(scope.phases.length, 'phase')}${scope.kits ? ' + kits' : ''}`}
      </button>
      {open ? (
        <div className="pop scope-pop">
          <p className="pop-title">Search parts in</p>
          {PHASES.map((p) => (
            <label key={p} className="check">
              <input
                type="checkbox"
                checked={scope.phases.includes(p)}
                onChange={(e) => onChange({ ...scope, phases: e.target.checked ? [...scope.phases, p] : scope.phases.filter((x) => x !== p) })}
              />
              {p}
            </label>
          ))}
          <label className="check">
            <input type="checkbox" checked={scope.kits} onChange={(e) => onChange({ ...scope, kits: e.target.checked })} />
            Kits and assortments
          </label>
          <p className="pop-foot">{hidden ? `${plural(hidden, 'part')} of this kind hidden by these settings.` : 'Nothing of this kind is hidden.'}</p>
        </div>
      ) : null}
    </div>
  );
}

interface RowProps {
  hit: Hit;
  active?: boolean;
  onOpen: () => void;
  compare: string[];
  onCompare: (id: string) => void;
}

export function HitRow({ hit, active, onOpen, compare, onCompare }: RowProps) {
  const { catalog, tiers } = useStore();
  const tier = tiers.get(hit.part.id);
  const std = standardDescription(hit.part.spec);
  const aliases = hit.part.gpns.length - 1;
  const flag = catalog.groups.find((g) => g.kind !== 'duplicate' && g.kind !== 'pack' && g.gpns.some((x) => hit.part.gpns.includes(x)));
  const picked = compare.includes(hit.part.id);
  return (
    <article className={`hit${picked ? ' is-picked' : ''}${active ? ' is-active' : ''}`}>
      <label className="hit-pick" title={picked ? 'Remove from comparison' : 'Add to comparison'}>
        <input type="checkbox" checked={picked} onChange={() => onCompare(hit.part.id)} aria-label={`Compare ${hit.part.preferred}`} />
      </label>
      <button type="button" className="hit-body" onClick={onOpen}>
        {/* A record too vague to rewrite reads better as written. */}
        <span className="hit-title">{std && std.missing.length < 3 ? <StandardText text={std.text} quiet /> : hit.preferred.description}</span>
        {hit.checks.length ? (
          <span className="hit-checks">
            {hit.checks.map((c) => (
              <Mark key={c.attr} check={c} spec={hit.part.spec} />
            ))}
          </span>
        ) : null}
        {std && std.missing.length < 3 ? <span className="hit-desc">{hit.preferred.description}</span> : null}
      </button>
      <div className="hit-meta">
        <Gpn gpn={hit.part.preferred} />
        <span className="hit-sub">
          {hit.preferred.phase !== 'Production' ? <PhasePill phase={hit.preferred.phase} /> : null}
          {aliases ? <span className="meta-note">+{plural(aliases, 'duplicate')}</span> : null}
          {tier === 'high' ? <span className="tag tag-high">High runner</span> : null}
          {hit.volume !== null ? <span className="meta-note num">{hit.volume.toLocaleString('en-US')} ordered</span> : null}
          {tier === 'low' ? <span className="meta-note">low runner</span> : null}
          {flag ? <span className={`tag tag-${flag.kind}`}>{KIND_ONE[flag.kind]}</span> : null}
        </span>
      </div>
    </article>
  );
}

function Band({
  title,
  note,
  hits,
  drawer,
  onOpen,
  compare,
  onCompare,
  collapseAfter,
}: {
  title: string;
  note: string;
  hits: Hit[];
  drawer: string | null;
  onOpen: (id: string) => void;
  compare: string[];
  onCompare: (id: string) => void;
  collapseAfter?: number;
}) {
  const [all, setAll] = useState(false);
  if (!hits.length) return null;
  const shown = collapseAfter !== undefined && !all ? hits.slice(0, collapseAfter) : hits;
  return (
    <section className="band">
      <header className="band-head">
        <h2>
          {title} <span className="band-n num">{hits.length}</span>
        </h2>
        <p>{note}</p>
      </header>
      {shown.length ? (
        <div className="hits">
          {shown.map((h) => (
            <HitRow key={h.part.id} hit={h} active={drawer === h.part.id} onOpen={() => onOpen(h.part.id)} compare={compare} onCompare={onCompare} />
          ))}
        </div>
      ) : null}
      {shown.length < hits.length ? (
        <button type="button" className="btn btn-quiet show-all" onClick={() => setAll(true)}>
          {shown.length ? `Show ${hits.length - shown.length} more` : `Show ${plural(hits.length, 'part')}`}
        </button>
      ) : null}
    </section>
  );
}

/** For each detail asked, how many parts would be ready or close without it. */
function loosen(catalog: Catalog, spec: Spec, scope: Scope) {
  return askedAttrs(spec)
    .filter((a) => a !== 'pitch')
    .map((a) => {
      const next = withAttr(spec, a, null);
      const r = search(catalog, next, scope);
      return { attr: a, next, ready: r.ready.length, close: r.close.length };
    })
    .filter((x) => x.ready + x.close > 0)
    .sort((x, y) => y.ready - x.ready || y.close - x.close)
    .slice(0, 3);
}

function useLoosened(spec: Spec, scope: Scope) {
  const { catalog } = useStore();
  return useMemo(() => loosen(catalog, spec, scope), [catalog, spec, scope]);
}

function Loosen({ spec, scope, onSpec }: { spec: Spec; scope: Scope; onSpec: (s: Spec) => void }) {
  const options = useLoosened(spec, scope);
  if (!options.length) return null;
  return (
    <div className="loosen">
      <p>Nothing states all of that. Loosen one detail:</p>
      <Suggestions options={options} spec={spec} onSpec={onSpec} />
    </div>
  );
}

function Suggestions({ options, spec, onSpec }: { options: ReturnType<typeof loosen>; spec: Spec; onSpec: (s: Spec) => void }) {
  return (
    <ul className="suggest">
      {options.map((o) => (
        <li key={o.attr}>
          <button type="button" className="suggest-btn" onClick={() => onSpec(o.next)}>
            <span>
              Without <s>{formatValue(o.attr, (spec as unknown as Record<string, string | number>)[o.attr], spec)}</s>
            </span>
            <span className="suggest-n">{o.ready ? `${o.ready} ready` : `${o.close} close`}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function DeadEnd({ q, spec, scope, excluded, onOpen, onSpec }: { q: string; spec: Spec; scope: Scope; excluded: Hit[]; onOpen: (id: string) => void; onSpec: (s: Spec) => void }) {
  const { go } = useStore();
  const options = useLoosened(spec, scope);
  const closest = excluded.slice(0, 5);
  return (
    <section className="dead-end">
      <h2>Nothing in Agile fits all of that.</h2>
      {options.length ? (
        <>
          <p>Loosen one detail to see what's stocked:</p>
          <Suggestions options={options} spec={spec} onSpec={onSpec} />
        </>
      ) : null}
      {closest.length ? (
        <>
          <h3>Closest, and why each was ruled out</h3>
          <ul className="misses">
            {closest.map((h) => (
              <li key={h.part.id}>
                <button type="button" className="miss" onClick={() => onOpen(h.part.id)}>
                  <code className="gpn">{h.part.preferred}</code>
                  <span className="miss-why">
                    {h.checks
                      .filter((c) => c.verdict === 'differs')
                      .map((c) => `${ATTR_LABEL[c.attr].toLowerCase()} is ${formatValue(c.attr, c.found, h.part.spec)}, not ${formatValue(c.attr, c.asked)}`)
                      .join('; ')}
                  </span>
                  <span className="miss-desc">{h.preferred.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="new-cta">
        <p>
          <strong>Really need a new part?</strong> The form writes its description to the standard so the next person finds it.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => go({ page: 'new', q })}>
          <Icon name="add" size={18} /> Request a new part
        </button>
      </div>
    </section>
  );
}
