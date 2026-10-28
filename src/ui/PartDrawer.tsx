// Everything about one physical part: which GPN to use and why, what its
// descriptions state, every GPN it is filed under, and the parts it could be
// confused with.

import { useMemo, useState } from 'react';
import type { Attr, PartRecord, PhysicalPart, Spec } from '../engine/types';
import { ATTRS_BY_FAMILY, ATTR_LABEL } from '../engine/types';
import { hitFor } from '../engine/search';
import type { Check, Hit } from '../engine/search';
import { standardDescription } from '../engine/standard';
import { useStore } from './store';
import { Sheet } from './Sheet';
import { Gpn } from './Gpn';
import { StandardText } from './StandardText';
import { FAMILY_LABEL, formatValue, plural } from './format';
import { KIND_ONE, KIND_RULE, groupSummary } from './rules';
import { Mark } from './Mark';
import { Icon } from './Icon';

/** The open part panel, as a stack: opening a related part pushes it, Back returns. */
export function usePartPanel() {
  const [stack, setStack] = useState<string[]>([]);
  return {
    top: stack[stack.length - 1] ?? null,
    depth: stack.length,
    open: (id: string) => setStack([id]),
    push: (id: string) => setStack((s) => [...s, id]),
    back: () => setStack((s) => s.slice(0, -1)),
    close: () => setStack([]),
  };
}

/** Renders the panel for whatever part is on top of the stack, checked against the search. */
export function PartPanel({ panel, asked }: { panel: ReturnType<typeof usePartPanel>; asked: Spec | null }) {
  const { catalog } = useStore();
  const byGpn = useMemo(() => new Map(catalog.parts.map((p) => [p.gpn, p])), [catalog]);
  const part = panel.top ? catalog.physical.find((p) => p.id === panel.top) : undefined;
  if (!part) return null;
  const hit = hitFor(catalog, part, asked?.family ? asked : null, byGpn);
  const openGpn = (gpn: string) => {
    const pp: PhysicalPart | undefined = catalog.physical.find((p) => p.gpns.includes(gpn));
    if (pp) panel.push(pp.id);
  };
  return <PartDrawer key={part.id} hit={hit} onClose={panel.close} onOpenGpn={openGpn} onBack={panel.depth > 1 ? panel.back : undefined} />;
}

interface DrawerProps {
  hit: Hit;
  onClose: () => void;
  onOpenGpn: (gpn: string) => void;
  onBack?: () => void;
}

export function PartDrawer({ hit, onClose, onOpenGpn, onBack }: DrawerProps) {
  const { catalog, flagged, flag, reviews, go } = useStore();
  const { part, preferred, members } = hit;
  const spec = part.spec;
  const std = standardDescription(spec);
  const family = spec.family!;
  const checks = new Map<Attr, Check>(hit.checks.map((c) => [c.attr, c]));
  const related = catalog.groups.filter((g) => g.kind !== 'duplicate' && g.kind !== 'pack' && g.gpns.some((x) => part.gpns.includes(x)));
  const groups = catalog.groups.filter((g) => g.gpns.some((x) => part.gpns.includes(x)));
  const others = members.filter((m) => m.gpn !== preferred.gpn);
  const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));
  const conflict = related.find((g) => g.kind === 'conflict');
  const conflictOthers = conflict ? conflict.gpns.filter((x) => !part.gpns.includes(x)) : [];

  return (
    <Sheet label={`Part ${part.preferred}`} onClose={onClose}>
      <header className="drawer-head">
        {onBack ? (
          <button type="button" className="link back" onClick={onBack}>
            <Icon name="arrow_back" size={18} /> Back
          </button>
        ) : null}
        <p className="drawer-family">{FAMILY_LABEL[family]}</p>
        <h2>{std ? <StandardText text={std.text} /> : preferred.description}</h2>
        {conflict ? (
          <div className="drawer-use is-conflict" role="alert">
            <Gpn gpn={part.preferred} size="lg" />
            <PhasePill phase={preferred.phase} />
          </div>
        ) : (
          <div className="drawer-use">
            <Gpn gpn={part.preferred} size="lg" />
            <PhasePill phase={preferred.phase} />
          </div>
        )}
        <p className={`drawer-why${conflict ? ' is-conflict' : ''}`}>
          {conflict
            ? `Check before using. ${conflictOthers.join(', ')} cites the same supplier part number (${conflict.detail}) but describes it differently: ${conflict.differences.map((a) => ATTR_LABEL[a].toLowerCase()).join(', ')}. One record is wrong.`
            : whyPreferred(preferred, others, part.chosenInReview)}
        </p>
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
                      <button type="button" className="link" onClick={() => onOpenGpn(x)}>
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
      {groups.length ? (
        <section className="drawer-section">
          <h3>Clean up</h3>
          <p className="related-rule">Think these GPNs should be consolidated, or one record is wrong? Send the group to the review queue.</p>
          <ul className="review-list">
            {groups.map((g) => {
              const decided = reviews[g.id]?.decision;
              const sent = flagged.includes(g.id);
              return (
                <li key={g.id}>
                  <span className={`tag tag-${g.kind}`}>{KIND_ONE[g.kind]}</span>
                  <span className="review-what">{g.gpns.join(', ')}</span>
                  {decided ? (
                    <span className="meta-note">Reviewed</span>
                  ) : sent ? (
                    <span className="meta-note">
                      <Icon name="check" size={16} /> In the queue
                    </span>
                  ) : (
                    <button type="button" className="btn btn-quiet" onClick={() => flag(g.id)}>
                      Send to Clean up
                    </button>
                  )}
                  <button
                    type="button"
                    className="link"
                    onClick={() => {
                      onClose();
                      go({ page: 'cleanup', kind: g.kind });
                    }}
                  >
                    Open
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </Sheet>
  );
}

function whyPreferred(p: PartRecord, others: PartRecord[], chosen?: boolean): string {
  if (!others.length) return 'The only GPN for this part.';
  if (chosen) return `Use this GPN: chosen in Clean up. ${plural(others.length, 'other GPN')} ${others.length === 1 ? 'repeats' : 'repeat'} the same part.`;
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
