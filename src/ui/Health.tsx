// Health: how findable the fastener catalogue is, and where the volumes come in.

import { useRef, useState } from 'react';
import { Icon } from './Icon';
import type { Attr, Family, GroupKind } from '../engine/types';
import { ATTR_LABEL } from '../engine/types';
import { KEY_FIELDS } from '../engine/health';
import { useStore, parseVolumes } from './store';
import { FAMILY_LABEL, pct, plural } from './format';
import { KIND_LABEL } from './rules';

const FAMILIES: Family[] = ['screw', 'nut', 'washer', 'standoff'];
const KINDS: GroupKind[] = ['duplicate', 'pack', 'near', 'variant', 'conflict'];
const COVERAGE_ATTRS: Attr[] = ['thread', 'lengthMm', 'head', 'drive', 'type', 'fits', 'material', 'finish'];

export function HealthPage() {
  const { catalog, go } = useStore();
  const h = catalog.health;
  const dupGpns = h.inScope - h.physicalParts;
  const totalComplete = FAMILIES.reduce((s, f) => s + h.completeness[f].complete, 0);

  return (
    <div className="health">
      <header className="page-head">
        <h1>Catalogue health</h1>
        <p>
          {pct(totalComplete / h.inScope)} of fastener descriptions state every key field. Built from the Oct 2026 Agile export on{' '}
          {new Date(catalog.builtAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
        </p>
      </header>

      <dl className="kpis">
        <div>
          <dt>Fastener GPNs</dt>
          <dd className="num">{h.inScope.toLocaleString('en-US')}</dd>
        </div>
        <div>
          <dt>Physical parts</dt>
          <dd className="num">{h.physicalParts.toLocaleString('en-US')}</dd>
        </div>
        <div>
          <dt>GPNs that repeat a part</dt>
          <dd className="num">{dupGpns.toLocaleString('en-US')}</dd>
        </div>
        <div>
          <dt>Filed under another part type</dt>
          <dd className="num">{h.misfiled.toLocaleString('en-US')}</dd>
        </div>
      </dl>

      <div className="health-grid">
        <section className="panel">
          <header className="panel-head">
            <h2>Description completeness</h2>
            <p>Key fields stated, by kind of fastener</p>
          </header>
          <ul className="stack-list">
            {FAMILIES.map((f) => {
              const c = h.completeness[f];
              const seg = (n: number) => `${(n / c.total) * 100}%`;
              return (
                <li key={f}>
                  <div className="stack-label">
                    <span>{FAMILY_LABEL[f]}</span>
                    <span className="num">
                      {pct(c.complete / c.total)} complete, of {plural(c.total, 'GPN')}
                    </span>
                  </div>
                  <div className="stack" role="img" aria-label={`${FAMILY_LABEL[f]}: ${c.complete} complete, ${c.partial} partial, ${c.vague} vague`}>
                    {c.complete ? <span className="seg seg-1" style={{ width: seg(c.complete) }} title={`Complete: ${c.complete} (${pct(c.complete / c.total)})`} /> : null}
                    {c.partial ? <span className="seg seg-2" style={{ width: seg(c.partial) }} title={`Partial: ${c.partial} (${pct(c.partial / c.total)})`} /> : null}
                    {c.vague ? <span className="seg seg-3" style={{ width: seg(c.vague) }} title={`Vague: ${c.vague} (${pct(c.vague / c.total)})`} /> : null}
                  </div>
                  <p className="stack-note">
                    Key fields: {KEY_FIELDS[f].map((a) => ATTR_LABEL[a].toLowerCase()).join(', ')}
                  </p>
                </li>
              );
            })}
          </ul>
          <ul className="legend">
            <li><span className="swatch seg-1" />Complete, every key field</li>
            <li><span className="swatch seg-2" />Partial</li>
            <li><span className="swatch seg-3" />Vague, under half</li>
          </ul>
        </section>

        <div className="health-side">
        <section className="panel">
          <header className="panel-head">
            <h2>Groups to clean up</h2>
            <p>{plural(h.gpnsInGroups, 'GPN')} sit in a group</p>
          </header>
          <ul className="group-list">
            {KINDS.map((k) => (
              <li key={k}>
                <a
                  href={`#/cleanup?kind=${k}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go({ page: 'cleanup', kind: k });
                  }}
                >
                  {KIND_LABEL[k]}
                </a>
                <span className="num">{h.groupsByKind[k]}</span>
              </li>
            ))}
          </ul>
        </section>
          <Volumes />
        </div>
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2>Which fields descriptions state</h2>
          <p>Share of GPNs whose description states each field. A dash means the field doesn't apply.</p>
        </header>
        <div className="table-scroll">
          <table className="coverage">
            <thead>
              <tr>
                <th scope="col" />
                {COVERAGE_ATTRS.map((a) => (
                  <th key={a} scope="col" className="num">
                    {ATTR_LABEL[a]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FAMILIES.map((f) => (
                <tr key={f}>
                  <th scope="row">{FAMILY_LABEL[f]}</th>
                  {COVERAGE_ATTRS.map((a) => {
                    const v = h.coverage[f][a];
                    return (
                      <td key={a} className={`num${v === undefined ? ' is-missing' : ''}`}>
                        {v === undefined ? (
                          '—'
                        ) : (
                          <span className="cov" title={`${FAMILY_LABEL[f]}, ${ATTR_LABEL[a].toLowerCase()}: ${pct(v)}`}>
                            {pct(v)}
                            <span className="cov-bar" aria-hidden="true">
                              <span style={{ width: `${v * 100}%` }} />
                            </span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}

function Volumes() {
  const { volumes, setVolumes, catalog } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const known = new Set(catalog.parts.map((p) => p.gpn));

  const load = async (file: File | undefined) => {
    if (!file) return;
    const { volumes: v, skipped } = parseVolumes(await file.text());
    const matched = [...v.keys()].filter((g) => known.has(g)).length;
    setVolumes(v);
    setStatus(
      `Read ${plural(v.size, 'row')} from ${file.name}; ${plural(matched, 'GPN')} matched the catalogue${skipped ? `, ${skipped} rows skipped` : ''}.`
    );
  };

  return (
    <section className="panel volumes">
      <header className="panel-head">
        <h2>Order volumes</h2>
        <p>
          When volumes are loaded, the most-ordered GPN becomes the one to use, and close sizes list the busier part first. The file stays in this
          browser.
        </p>
      </header>
      <div
        className={`drop${over ? ' is-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          load(e.dataTransfer.files[0]);
        }}
      >
        <Icon name="upload" size={20} />
        <p>
          Drop a CSV with two columns, <code>GPN,Volume</code>, or{' '}
          <button type="button" className="link" onClick={() => input.current?.click()}>
            choose a file
          </button>
          .
        </p>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => load(e.target.files?.[0])} />
      </div>
      {status ? <p className="volumes-status">{status}</p> : null}
      {volumes.size ? (
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            setVolumes(new Map());
            setStatus(null);
            if (input.current) input.current.value = '';
          }}
        >
          Remove volumes
        </button>
      ) : null}
    </section>
  );
}
