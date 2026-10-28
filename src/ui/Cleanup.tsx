// Clean up: every group of GPNs that look like the same part, sorted by what
// Google decided to do with that kind. A reviewer confirms or overrides each one;
// decisions stay in this browser and export as CSV for the Agile change request.

import { Download } from 'lucide-react';
import type { Group, GroupKind, PartRecord } from '../engine/types';
import { ATTR_LABEL } from '../engine/types';
import { useStore, Decision, Review } from './store';
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
  const { catalog, reviews, go } = useStore();
  const groups = catalog.groups.filter((g) => g.kind === kind);
  const reviewed = (g: Group) => Boolean(reviews[g.id]?.decision);
  const done = groups.filter(reviewed).length;
  const allDone = catalog.groups.filter(reviewed).length;

  const exportCsv = () => {
    const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));
    const rows: (string | number | null)[][] = [['Group', 'Kind', 'Evidence', 'GPNs', 'Keep GPN', 'Decision', 'Reviewed', 'Note', 'Descriptions']];
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
          <Download size={15} strokeWidth={1.75} aria-hidden="true" /> Export decisions
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

      {groups.length ? (
        <div className="groups">
          {groups.map((g) => (
            <GroupCard key={g.id} group={g} review={reviews[g.id]} />
          ))}
        </div>
      ) : (
        <p className="empty-box">No groups of this kind in the current data.</p>
      )}
    </div>
  );
}

function GroupCard({ group: g, review }: { group: Group; review?: Review }) {
  const { catalog, setReview } = useStore();
  const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));
  const members = g.gpns.map((x) => byGpn.get(x)).filter((p): p is PartRecord => Boolean(p));
  const keep = review?.preferred ?? g.preferred;
  const decision = review?.decision ?? null;
  const suggested = KIND_DEFAULT[g.kind];

  return (
    <article className={`group-card${decision ? ' is-done' : ''}`}>
      <header className="group-head">
        <h2>{groupSummary(g)}</h2>
      </header>

      <table className="members">
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
      </footer>
    </article>
  );
}
