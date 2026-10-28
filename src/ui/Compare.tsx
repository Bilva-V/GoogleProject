// Two or three parts side by side, with the rows where they differ marked.

import type { Attr, PartRecord, Spec } from '../engine/types';
import { ATTRS_BY_FAMILY, ATTR_LABEL } from '../engine/types';
import { standardDescription } from '../engine/standard';
import { useStore } from './store';
import { Sheet } from './Sheet';
import { Gpn } from './Gpn';
import { StandardText } from './StandardText';
import { formatValue } from './format';
import { PhasePill } from './PartDrawer';

export function Compare({ ids, asked, onClose }: { ids: string[]; asked: Spec; onClose: () => void }) {
  const { catalog } = useStore();
  const byGpn = new Map(catalog.parts.map((p) => [p.gpn, p]));
  const parts = ids.map((id) => catalog.physical.find((p) => p.id === id)).filter((p) => p !== undefined);
  const records = parts.map((p) => byGpn.get(p.preferred) as PartRecord);
  const attrs: Attr[] = [...new Set(parts.flatMap((p) => (p.spec.family ? ATTRS_BY_FAMILY[p.spec.family] : [])))];
  const val = (s: Spec, a: Attr) => (s as unknown as Record<string, string | number | null>)[a];

  const rows = attrs.map((a) => {
    const values = parts.map((p) => val(p.spec, a));
    const stated = values.filter((v) => v !== null);
    const differs = new Set(stated.map(String)).size > 1;
    const silent = stated.length > 0 && stated.length < values.length;
    return { a, values, differs, silent };
  });
  const nDiff = rows.filter((r) => r.differs).length;
  const silent = rows.filter((r) => r.silent && !r.differs).map((r) => ATTR_LABEL[r.a].toLowerCase());
  const gaps = silent.length ? `${silent.join(', ')} ${silent.length === 1 ? 'is' : 'are'} stated for only some of them; check before treating them as the same.` : '';

  return (
    <Sheet label="Compare parts" onClose={onClose} variant="center">
      <header className="compare-head">
        <h2>Compare {parts.length} parts</h2>
        <p>
          {nDiff ? `They differ on ${nDiff} ${nDiff === 1 ? 'detail' : 'details'}, highlighted below.` : silent.length ? 'No stated values conflict.' : 'Nothing the descriptions state tells them apart.'}{' '}
          {gaps ? gaps.charAt(0).toUpperCase() + gaps.slice(1) : ''}
        </p>
      </header>
      <div className="compare-scroll">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col" />
              {parts.map((p, i) => (
                <th scope="col" key={p.id}>
                  <Gpn gpn={p.preferred} />
                  <span className="compare-std">
                    <StandardText text={standardDescription(p.spec)?.text ?? records[i].description} quiet />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.a} className={r.differs ? 'is-diff' : r.silent ? 'is-silent' : ''}>
                <th scope="row">
                  {ATTR_LABEL[r.a]}
                  {val(asked, r.a) !== null ? <span className="compare-asked">asked {formatValue(r.a, val(asked, r.a))}</span> : null}
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className={v === null ? 'is-missing' : ''}>
                    {v === null ? 'not stated' : formatValue(r.a, v, parts[i].spec)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Phase</th>
              {records.map((m) => (
                <td key={m.gpn}><PhasePill phase={m.phase} /></td>
              ))}
            </tr>
            <tr>
              <th scope="row">Ordered</th>
              {records.map((m) => (
                <td key={m.gpn} className={m.volume === null ? 'is-missing num' : 'num'}>
                  {m.volume === null ? '—' : m.volume.toLocaleString('en-US')}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Suppliers</th>
              {records.map((m) => (
                <td key={m.gpn} className="compare-sup">
                  {m.suppliers.length ? m.suppliers.map((s) => <span key={s.name + s.partNumber}>{s.name} <code>{s.partNumber}</code></span>) : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">As written</th>
              {records.map((m) => (
                <td key={m.gpn} className="compare-desc">{m.description}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}
