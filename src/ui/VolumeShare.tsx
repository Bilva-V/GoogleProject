// How a spec's orders split across the GPNs that fit it (after Ishan's volume-share
// strip). The consolidation case at a glance: one part usually carries most of it.

import type { Hit } from '../engine/search';
import { plural } from './format';

const SHOWN = 4;

export function VolumeShare({ hits }: { hits: Hit[] }) {
  const withVolume = hits.filter((h) => (h.volume ?? 0) > 0).sort((a, b) => b.volume! - a.volume!);
  if (withVolume.length < 2) return null;
  const total = withVolume.reduce((n, h) => n + h.volume!, 0);
  const top = withVolume.slice(0, SHOWN);
  const rest = withVolume.slice(SHOWN).reduce((n, h) => n + h.volume!, 0);
  const share = (n: number) => `${Math.round((n / total) * 100)}%`;
  const segments = [...top.map((h, i) => ({ key: h.part.id, label: h.part.preferred, qty: h.volume!, step: i })), ...(rest ? [{ key: 'rest', label: 'Others', qty: rest, step: SHOWN }] : [])];

  return (
    <section className="vshare" aria-label="How orders split across these parts">
      <p className="vshare-head">
        <strong>{top[0].part.preferred}</strong> takes {share(top[0].volume!)} of the {total.toLocaleString('en-US')} ordered across{' '}
        {plural(withVolume.length, 'part')} that fit.
      </p>
      <div className="vshare-strip" aria-hidden="true">
        {segments.map((s) => (
          <span key={s.key} className={`vshare-seg vshare-${Math.min(s.step, 4)}`} style={{ flexGrow: s.qty }} title={`${s.label}: ${s.qty.toLocaleString('en-US')} (${share(s.qty)})`} />
        ))}
      </div>
      <ul className="vshare-legend">
        {segments.map((s) => (
          <li key={s.key}>
            <span className={`swatch vshare-${Math.min(s.step, 4)}`} />
            <code>{s.label}</code>
            <span className="num">{s.qty.toLocaleString('en-US')}</span>
            <span className="num vshare-pct">{share(s.qty)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
