// Clean up: every group of GPNs that look like the same part, sorted by what
// Google decided to do with that kind. A reviewer confirms or overrides each one;
// decisions stay in this browser and export as CSV for the Agile change request.

import { useState } from 'react';
import { Icon } from './Icon';
import type { Group, GroupKind, PartRecord } from '../engine/types';
import { ATTR_LABEL } from '../engine/types';
import { useStore, Decision, Review, EVIDENCE_NEEDED } from './store';
import { toast } from './toast';
import { Gpn } from './Gpn';
import { downloadCsv, formatValue, plural } from './format';
import { KIND_DEFAULT, KIND_LABEL, KIND_RULE, groupSummary } from './rules';
import { PhasePill } from './PartDrawer';

const KINDS: GroupKind[] = ['duplicate', 'pack', 'near', 'variant', 'conflict'];
const DECISIONS: { id: Decision; label: string }[] = [
  { id: 'consolidate', label: 'Consolidate' },
  { id: 'separate', label: 'Keep separate' },
  { id: 'check', label: 'Needs a check' },
];

export function Cleanup({ kind }: { kind: GroupKind }) {
  const { catalog, reviews, flagged, go } = useStore();
  const reviewed = (g: Group) => Boolean(reviews[g.id]?.decision);
  // Groups an engineer sent from Find come first, and stay there once decided so the card
  // being worked on doesn't jump away.
  const sentFirst = (g: Group) => (flagged.includes(g.id) ? flagged.indexOf(g.id) : Infinity);
  const groups = catalog.groups
    .filter((g) => g.kind === kind)
    .map((g, i) => ({ g, i }))
    .sort((a, b) => sentFirst(a.g) - sentFirst(b.g) || a.i - b.i)
    .map(({ g }) => g);
  const done = groups.filter(reviewed).length;
  // Groups decided while the filter is on stay in view until the filter is turned off,
  // so a decision doesn't make the card jump away under the pointer.
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const shown = unreviewedOnly ? groups.filter((g) => !reviewed(g) || seen.has(g.id)) : groups;
  const allDone = catalog.groups.filter(reviewed).length;

  /** Move to the next group without a decision: later in this tab, else the next tab that has one. */
  const next = (from: Group) => {
    const here = groups.slice(groups.indexOf(from) + 1).find((g) => !reviewed(g) && g.id !== from.id);
    if (here) {
      const el = document.getElementById(`group-${here.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el?.querySelector<HTMLButtonElement>('.segmented button')?.focus({ preventScroll: true });
      return;
    }
    const order = KINDS.slice(KINDS.indexOf(kind) + 1).concat(KINDS.slice(0, KINDS.indexOf(kind) + 1));
    const other = order.find((k) => catalog.groups.some((g) => g.kind === k && !reviewed(g) && g.id !== from.id));
    if (other && other !== kind) {
      go({ page: 'cleanup', kind: other }, true);
      window.scrollTo({ top: 0 });
      toast(`On to ${KIND_LABEL[other].toLowerCase()}`);
    } else toast('Every group has a decision. Export them when you’re ready.');
  };

  const exportCsv = () => {
    const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));
    const rows: (string | number | null)[][] = [
      ['Group', 'Kind', 'Evidence', 'GPNs', 'Keep GPN', 'Decision', 'Reviewed', 'Evidence needed', 'Sent from Find', 'Note', 'Descriptions'],
    ];
    for (const g of catalog.groups) {
      const r = reviews[g.id];
      rows.push([
        g.id,
        g.kind,
        g.evidence,
        g.gpns.join(' '),
        r?.preferred ?? g.preferred,
        r?.decision ?? KIND_DEFAULT[g.kind],
        r?.decision ? 'yes' : 'no',
        r?.decision === 'check' ? (r.evidence ?? []).join('; ') : '',
        flagged.includes(g.id) ? 'yes' : 'no',
        r?.note ?? '',
        g.gpns.map((x) => `${x}: ${byGpn.get(x)?.description ?? ''}`).join(' | '),
      ]);
    }
    downloadCsv('fastener-cleanup-decisions.csv', rows);
  };

  return (
    <div className="cleanup">
      <header className="page-head page-head-row">
        <div>
          <h1>Clean up</h1>
          <p>
            {plural(catalog.groups.length, 'group')} of GPNs that look like the same part. {allDone ? `${allDone} reviewed so far.` : 'None reviewed yet.'}
          </p>
        </div>
        <button type="button" className="btn" onClick={exportCsv}>
          <Icon name="download" size={18} /> Export decisions
        </button>
      </header>

      <nav className="tabs" aria-label="Kinds of group">
        {KINDS.map((k) => {
          const n = catalog.groups.filter((g) => g.kind === k).length;
          return (
            <a
              key={k}
              href={`#/cleanup?kind=${k}`}
              aria-current={k === kind ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                go({ page: 'cleanup', kind: k }, true);
              }}
            >
              {KIND_LABEL[k]} <span className="num tab-n">{n}</span>
              {catalog.groups.some((g) => g.kind === k && flagged.includes(g.id) && !reviewed(g)) ? (
                <span className="tab-sent" title="Has groups sent from Find" />
              ) : null}
            </a>
          );
        })}
      </nav>

      <div className="rule-bar">
        <p>
          <strong>Google's rule.</strong> {KIND_RULE[kind]}
        </p>
        <p className="rule-progress">
          <span>
            <span className="num">{done}</span> of {groups.length} reviewed
          </span>
          <span className="meter" aria-hidden="true">
            <span style={{ width: groups.length ? `${(done / groups.length) * 100}%` : '0%' }} />
          </span>
        </p>
      </div>

      {groups.length > 3 ? (
        <label className="check filter-toggle">
          <input
            type="checkbox"
            checked={unreviewedOnly}
            onChange={(e) => {
              setUnreviewedOnly(e.target.checked);
              setSeen(new Set(groups.filter((g) => !reviewed(g)).map((g) => g.id)));
            }}
          />
          Unreviewed only
        </label>
      ) : null}

      {unreviewedOnly && !shown.length ? (
        <p className="empty-box">Every group of this kind has a decision. Export them, or turn off the filter to change one.</p>
      ) : groups.length ? (
        <div className="groups">
          {shown.map((g) => (
            <GroupCard key={g.id} group={g} review={reviews[g.id]} sent={flagged.includes(g.id)} onNext={() => next(g)} />
          ))}
        </div>
      ) : (
        <p className="empty-box">No groups of this kind in the current data.</p>
      )}
    </div>
  );
}

function GroupCard({ group: g, review, sent, onNext }: { group: Group; review?: Review; sent: boolean; onNext: () => void }) {
  const { catalog, setReview } = useStore();
  const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));
  const members = g.gpns.map((x) => byGpn.get(x)).filter((p): p is PartRecord => Boolean(p));
  const keep = review?.preferred ?? g.preferred;
  const decision = review?.decision ?? null;
  const suggested = KIND_DEFAULT[g.kind];

  return (
    <article className={`group-card${decision ? ' is-done' : ''}`} id={`group-${g.id}`}>
      <header className="group-head">
        {sent ? <span className="tag tag-sent">Sent from Find</span> : null}
        <h2>{groupSummary(g)}</h2>
      </header>

      <table className="members">
        <colgroup>
          <col className="col-keep" />
          <col className="col-gpn" />
          <col />
          <col className="col-phase" />
          <col className="col-ordered" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="col-keep">Keep</th>
            <th scope="col">GPN</th>
            <th scope="col">Description</th>
            <th scope="col">Phase</th>
            <th scope="col" className="num">Ordered</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.gpn} className={m.gpn === keep ? 'is-keep' : ''}>
              <td className="col-keep">
                <input
                  type="radio"
                  name={`keep-${g.id}`}
                  checked={m.gpn === keep}
                  onChange={() => setReview(g.id, { preferred: m.gpn })}
                  aria-label={`Keep ${m.gpn}`}
                />
              </td>
              <td>
                <Gpn gpn={m.gpn} />
              </td>
              <td className="member-desc">
                {m.description}
                {g.differences.length ? (
                  <span className="member-diff">
                    {g.differences.map((a) => {
                      const v = (m.spec as unknown as Record<string, string | number | null>)[a];
                      return (
                        <span key={a} className="tag">
                          {ATTR_LABEL[a].toLowerCase()}: {v === null ? 'not stated' : formatValue(a, v, m.spec)}
                        </span>
                      );
                    })}
                  </span>
                ) : null}
                {m.spec.packQty && m.spec.packQty > 1 ? <span className="tag">pack of {m.spec.packQty.toLocaleString('en-US')}</span> : null}
              </td>
              <td>
                <PhasePill phase={m.phase} />
              </td>
              <td className={`num${m.volume === null ? ' is-missing' : ''}`}>{m.volume === null ? '—' : m.volume.toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="group-foot">
        <div className="segmented" role="radiogroup" aria-label="Decision">
          {DECISIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={decision === d.id}
              className={decision === d.id ? 'is-current' : ''}
              onClick={() => setReview(g.id, { decision: decision === d.id ? null : d.id, preferred: keep })}
            >
              {decision === d.id ? <Icon name="check" size={18} /> : null}
              {d.label}
              {d.id === suggested && !decision ? <span className="suggested"> (suggested)</span> : null}
            </button>
          ))}
        </div>
        <input
          className="note"
          placeholder="Note for the change request (optional)"
          value={review?.note ?? ''}
          onChange={(e) => setReview(g.id, { note: e.target.value })}
          aria-label="Note"
        />
        <button type="button" className="btn btn-quiet next-group" onClick={onNext}>
          Next group <Icon name="arrow_forward" size={18} />
        </button>
        {decision === 'check' ? (
          <fieldset className="evidence">
            <legend>What's needed before deciding?</legend>
            {EVIDENCE_NEEDED.map((e) => {
              const have = review?.evidence ?? [];
              return (
                <label key={e} className="check">
                  <input
                    type="checkbox"
                    checked={have.includes(e)}
                    onChange={(ev) => setReview(g.id, { evidence: ev.target.checked ? [...have, e] : have.filter((x) => x !== e) })}
                  />
                  {e}
                </label>
              );
            })}
          </fieldset>
        ) : null}
      </footer>
    </article>
  );
}
