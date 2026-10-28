// Standard: the proposed description standard, and what it does to real records.

import { useMemo, useState } from 'react';
import type { Family } from '../engine/types';
import { ATTR_LABEL } from '../engine/types';
import { STANDARD, standardDescription } from '../engine/standard';
import { completeness } from '../engine/health';
import { useStore } from './store';
import { StandardText } from './StandardText';
import { FAMILY_LABEL } from './format';

const FAMILIES: Family[] = ['screw', 'nut', 'washer', 'standoff'];

export function StandardPage() {
  const { catalog } = useStore();
  const [family, setFamily] = useState<Family>('screw');
  const s = STANDARD[family];

  // Real records whose description is partial: the standard shows what's missing.
  const samples = useMemo(() => {
    const seen = new Set<string>();
    return catalog.parts
      .filter((p) => p.spec.family === family && !p.spec.kit && completeness(p) !== 'complete')
      // Partly complete records first: the rewrite shows the fix, not a row of blanks.
      .sort((a, b) => (completeness(a) === 'partial' ? 0 : 1) - (completeness(b) === 'partial' ? 0 : 1))
      .filter((p) => {
        const k = p.description.slice(0, 18);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 6);
  }, [catalog, family]);

  return (
    <div className="standard">
      <header className="page-head">
        <h1>Description standard</h1>
        <p>Every fastener description states the same fields, in the same order and words, so a search for the part finds it.</p>
      </header>

      <nav className="tabs" aria-label="Kind of fastener">
        {FAMILIES.map((f) => (
          <button key={f} type="button" aria-current={f === family ? 'page' : undefined} onClick={() => setFamily(f)}>
            {FAMILY_LABEL[f]}
          </button>
        ))}
      </nav>

      <div className="standard-grid">
        <section className="panel">
          <header className="panel-head">
            <h2>Field order</h2>
          </header>
          <ol className="field-order">
            <li className="is-noun">
              <span>{family.toUpperCase()}</span>
              <span className="field-req">noun first</span>
            </li>
            {s.required.map((a) => (
              <li key={a}>
                <span>{ATTR_LABEL[a]}</span>
                <span className="field-req">required</span>
              </li>
            ))}
            {s.optional.map((a) => (
              <li key={a} className="is-optional">
                <span>{ATTR_LABEL[a]}</span>
                <span className="field-req">when it applies</span>
              </li>
            ))}
          </ol>
          <h3>Example</h3>
          <p className="std-example">
            <StandardText text={s.example} />
          </p>
          <h3>Rules</h3>
          <ul className="std-rules">
            <li>Upper case, fields separated by a comma and a space.</li>
            <li>Metric threads as M3-0.5; inch threads as #6-32 or 1/4-20.</li>
            <li>Lengths in the thread's own unit: 8 MM, or 1/4 IN as a fraction.</li>
            <li>Name the built-in washer, the pack quantity and the strength only when there is one.</li>
            <li>Supplier part numbers go in the supplier fields, not the description.</li>
          </ul>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2>Real records, rewritten</h2>
            <p>From the current export. Highlighted words are fields the record doesn't state; the engineer supplies them.</p>
          </header>
          <ul className="before-after">
            {samples.map((p) => {
              const std = standardDescription(p.spec);
              return (
                <li key={p.gpn}>
                  <p className="ba-before">
                    <code>{p.gpn}</code>
                    {p.description}
                  </p>
                  <p className="ba-after">{std ? <StandardText text={std.text} /> : null}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
