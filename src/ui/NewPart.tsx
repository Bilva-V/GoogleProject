// New part: when nothing stocked will do, build the request so its description
// follows the standard, and show the closest stocked parts one last time.

import { useCallback, useMemo, useState } from 'react';
import { Icon } from './Icon';
import type { Attr, Family, Spec } from '../engine/types';
import { ATTR_LABEL } from '../engine/types';
import { parseQuery } from '../engine/parse';
import { DEFAULT_SCOPE, closest, search } from '../engine/search';
import { STANDARD, standardDescription } from '../engine/standard';
import { specToQuery, withAttr } from '../engine/query';
import { useStore } from './store';
import { Chip } from './Picker';
import { Drawing } from './Drawing';
import { StandardText } from './StandardText';
import { Gpn } from './Gpn';
import { Mark } from './Mark';
import { FAMILY_LABEL, formatValue, plural } from './format';
import { copyText } from './toast';
import { PartPanel, usePartPanel } from './PartDrawer';

const FAMILIES: Family[] = ['screw', 'nut', 'washer', 'standoff'];

export function NewPart({ q }: { q: string }) {
  const { catalog, go } = useStore();
  const [openAttr, setOpenAttr] = useState<Attr | null>(null);
  const panel = usePartPanel();
  const setDrawer = panel.open;
  const { spec } = useMemo(() => parseQuery(q), [q]);
  const family = spec.family;
  const setSpec = (next: Spec) => go({ page: 'new', q: specToQuery(next) }, true);
  const result = useMemo(() => search(catalog, spec, DEFAULT_SCOPE), [catalog, spec]);
  const countFor = useCallback(
    (a: Attr) => (v: string | number) => {
      const r = search(catalog, withAttr(spec, a, v), DEFAULT_SCOPE);
      return r.ready.length + r.close.length;
    },
    [catalog, spec]
  );
  const std = family ? standardDescription(spec) : null;

  if (!family) {
    return (
      <div className="newpart">
        <header className="page-head">
          <h1>Request a new part</h1>
          <p>Start with what kind of fastener it is. You'll fill in the rest field by field.</p>
        </header>
        <div className="family-cards">
          {FAMILIES.map((f) => (
            <button key={f} type="button" className="family-card" onClick={() => setSpec({ ...spec, family: f })}>
              <Drawing spec={{ ...parseQuery('').spec, family: f }} />
              <span>{FAMILY_LABEL[f]}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const { required, optional } = STANDARD[family];
  const val = (a: Attr) => (spec as unknown as Record<string, string | number | null>)[a];
  const nRequired = required.filter((a) => val(a) !== null).length;
  const ready = result.ready;
  // Parts that match at least one detail; records that state nothing can't be compared.
  // Nearest first: a part that differs in one detail beats one that states almost nothing.
  const close = closest(result, 3);

  const field = (a: Attr, isRequired: boolean) => (
    <div key={a} className={`field-row${isRequired && val(a) === null ? ' is-empty' : ''}`}>
      <span className="field-label">{ATTR_LABEL[a]}</span>
      <Chip
        catalog={catalog}
        family={family}
        attr={a}
        spec={spec}
        open={openAttr === a}
        onOpen={(o) => setOpenAttr(o ? a : null)}
        onSet={(v) => setSpec(withAttr(spec, a, v))}
        countFor={countFor(a)}
      />
    </div>
  );

  return (
    <div className="newpart">
      <header className="page-head">
        <button type="button" className="link back" onClick={() => go({ page: 'find', q })}>
          <Icon name="arrow_back" size={18} /> Back to the search
        </button>
        <h1>Request a new {FAMILY_LABEL[family].toLowerCase()}</h1>
        <p>Fill in the fields and copy the description into the Agile request. It's written to the standard, so the next engineer can find this part.</p>
      </header>

      <div className="newpart-grid">
        <section className="form-card" aria-label="Fields">
          <div className="form-progress">
            <span>
              <strong className="num">{nRequired}</strong> of {required.length} required fields
            </span>
            <span className="meter" aria-hidden="true">
              <span style={{ width: `${(nRequired / required.length) * 100}%` }} />
            </span>
          </div>
          <h2>Required</h2>
          {required.map((a) => field(a, true))}
          <h2>If it matters</h2>
          {optional.filter((a) => a !== 'pitch' || spec.thread).map((a) => field(a, false))}
        </section>

        <div className="newpart-side">
          <section className="draft">
            <h2>Description to submit</h2>
            <p className="draft-text">{std ? <StandardText text={std.text} /> : null}</p>
            {std && !std.complete ? (
              <p className="draft-missing">Still needed: {std.missing.map((a) => ATTR_LABEL[a].toLowerCase()).join(', ')}.</p>
            ) : null}
            <button
              type="button"
              className={`btn${std?.complete ? ' btn-primary' : ''}`}
              disabled={!std}
              onClick={() =>
                std &&
                copyText(
                  std.text,
                  std.complete ? 'the description' : `a draft. It still needs ${std.missing.map((a) => ATTR_LABEL[a].toLowerCase()).join(', ')}`
                )
              }
            >
              <Icon name="content_copy" size={18} /> {std?.complete ? 'Copy description' : 'Copy draft'}
            </button>
            <div className="draft-drawing">
              <Drawing spec={spec} onPick={(a) => setOpenAttr(a)} />
            </div>
          </section>

          <section className={`stocked${ready.length ? ' is-warning' : ''}`}>
            {ready.length ? (
              <>
                <h2>{ready.length === 1 ? 'This is already stocked' : `${plural(ready.length, 'stocked part')} already match`}</h2>
                <p>Use {ready.length === 1 ? 'it' : 'one of these'} instead of creating a new GPN.</p>
                <ul className="stocked-list">
                  {ready.slice(0, 3).map((h) => (
                    <li key={h.part.id}>
                      <Gpn gpn={h.part.preferred} />
                      <button type="button" className="link" onClick={() => setDrawer(h.part.id)}>
                        {h.preferred.description}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h2>Nothing stocked states all of this</h2>
                <p>{close.length ? "Closest stocked parts, and what doesn't line up:" : 'No stocked part comes close.'}</p>
                <ul className="stocked-list">
                  {close.map((h) => (
                    <li key={h.part.id}>
                      <Gpn gpn={h.part.preferred} />
                      <button type="button" className="link" onClick={() => setDrawer(h.part.id)}>
                        {h.preferred.description}
                      </button>
                      <span className="hit-checks">
                        {h.checks.filter((c) => c.verdict !== 'match').map((c) => (
                          <Mark key={c.attr} check={c} spec={h.part.spec} />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
                {result.excluded.length && !close.length ? (
                  <p className="meta-note">
                    Nearest ruled-out part: <code>{result.excluded[0].part.preferred}</code>,{' '}
                    {result.excluded[0].checks
                      .filter((c) => c.verdict === 'differs')
                      .map((c) => `${ATTR_LABEL[c.attr].toLowerCase()} ${formatValue(c.attr, c.found, result.excluded[0].part.spec)}`)
                      .join(', ')}
                    .
                  </p>
                ) : null}
              </>
            )}
          </section>
        </div>
      </div>
      <PartPanel panel={panel} asked={spec} />
    </div>
  );
}
