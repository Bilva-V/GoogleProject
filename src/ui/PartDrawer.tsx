// Everything about one physical part: which GPN to use and why, what its
// descriptions state, every GPN it is filed under, and the parts it could be
// confused with.

import type { Attr, PartRecord } from '../engine/types';
import { ATTRS_BY_FAMILY, ATTR_LABEL } from '../engine/types';
import type { Check, Hit } from '../engine/search';
import { standardDescription } from '../engine/standard';
import { useStore } from './store';
import { Sheet } from './Sheet';
import { Gpn } from './Gpn';
import { StandardText } from './StandardText';
import { FAMILY_LABEL, formatValue, plural } from './format';
import { KIND_ONE, KIND_RULE, groupSummary } from './rules';
import { Mark } from './Mark';

export function PartDrawer({ hit, onClose }: { hit: Hit; onClose: () => void }) {
  const { catalog, go } = useStore();
  const { part, preferred, members } = hit;
  const spec = part.spec;
  const std = standardDescription(spec);
  const family = spec.family!;
  const checks = new Map<Attr, Check>(hit.checks.map((c) => [c.attr, c]));
  const related = catalog.groups.filter((g) => g.kind !== 'duplicate' && g.kind !== 'pack' && g.gpns.some((x) => part.gpns.includes(x)));
  const others = members.filter((m) => m.gpn !== preferred.gpn);
  const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));

  return (
    <Sheet label={`Part ${part.preferred}`} onClose={onClose}>
      <header className="drawer-head">
        <p className="drawer-family">{FAMILY_LABEL[family]}</p>
        <h2>{std ? <StandardText text={std.text} /> : preferred.description}</h2>
        <div className="drawer-use">
          <Gpn gpn={part.preferred} size="lg" />
          <PhasePill phase={preferred.phase} />
        </div>
        <p className="drawer-why">{whyPreferred(preferred, others)}</p>
      </header>

      <section className="drawer-section">
        <h3>What the descriptions state</h3>
        <table className="kv">
          <tbody>
            {ATTRS_BY_FAMILY[family].map((a) => {
              const v = (spec as unknown as Record<string, string | number | null>)[a];
              const c = checks.get(a);
              return (
                <tr key={a}>
                  <th scope="row">{ATTR_LABEL[a]}</th>
                  <td className={v === null ? 'is-missing' : ''}>{v === null ? 'not stated' : formatValue(a, v, spec)}</td>
                  <td className="kv-mark">{c ? <Mark check={c} spec={spec} compact /> : null}</td>
                </tr>
              );
            })}
            {spec.packQty && spec.packQty > 1 ? (
              <tr>
                <th scope="row">Pack</th>
                <td>{spec.packQty.toLocaleString('en-US')} pieces</td>
                <td />
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="drawer-section">
        <h3>{members.length > 1 ? `Filed under ${plural(members.length, 'GPN')}` : 'In Agile'}</h3>
        <ul className="records">
          {members.map((m) => (
            <li key={m.gpn} className={`record${m.gpn === preferred.gpn ? ' is-preferred' : ''}`}>
              <div className="record-top">
                <Gpn gpn={m.gpn} />
                <span className="record-meta">
                  <span>{m.phase}</span>
                  {m.spec.packQty && m.spec.packQty > 1 ? <span>Pack of {m.spec.packQty.toLocaleString('en-US')}</span> : null}
                  <span>{m.volume === null ? 'Volume not loaded' : `${m.volume.toLocaleString('en-US')} ordered`}</span>
                </span>
                {m.gpn === preferred.gpn && members.length > 1 ? <span className="tag">Use this one</span> : null}
              </div>
              <p className="record-desc">{m.description}</p>
              {m.suppliers.length ? (
                <p className="record-sup">
                  {m.suppliers.map((s) => (
                    <span key={s.name + s.partNumber}>
                      {s.name} <code>{s.partNumber}</code>
                    </span>
                  ))}
                </p>
              ) : null}
              <p className="record-src">Source: {m.sources.map((s) => `${s.sheet} row ${s.row}`).join(', ')}</p>
            </li>
          ))}
        </ul>
      </section>

      {related.length ? (
        <section className="drawer-section">
          <h3>Could be confused with</h3>
          {related.map((g) => (
            <div key={g.id} className={`related related-${g.kind}`}>
              <p className="related-kind">
                <span className={`tag tag-${g.kind}`}>{KIND_ONE[g.kind]}</span> {groupSummary(g)}
              </p>
              <p className="related-rule">{KIND_RULE[g.kind]}</p>
              <ul className="related-list">
                {g.gpns
                  .filter((x) => !part.gpns.includes(x))
                  .map((x) => (
                    <li key={x}>
                      <button type="button" className="link" onClick={() => { onClose(); go({ page: 'find', q: x }); }}>
                        <code>{x}</code>
                      </button>
                      <span>{byGpn.get(x)?.description}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </Sheet>
  );
}

function whyPreferred(p: PartRecord, others: PartRecord[]): string {
  if (!others.length) return 'The only GPN for this part.';
  const n = others.length;
  const reason =
    p.volume !== null && others.every((o) => (o.volume ?? -1) <= p.volume!)
      ? 'it is the most ordered'
      : p.phase === 'Production' && others.some((o) => o.phase !== 'Production')
        ? 'it is in Production'
        : 'it is the furthest along in its lifecycle';
  return `Use this GPN: ${reason}. ${plural(n, 'other GPN')} ${n === 1 ? 'repeats' : 'repeat'} the same part.`;
}

export function PhasePill({ phase }: { phase: string }) {
  return <span className={`phase${phase === 'Production' ? ' is-prod' : phase === 'End of Production' ? ' is-eop' : ''}`}>{phase}</span>;
}
