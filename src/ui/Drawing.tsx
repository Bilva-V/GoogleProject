// A live line drawing of the fastener being searched for. It redraws as the
// spec changes and doubles as a picker: click the head to change the head, the
// recess to change the drive. Anything not yet stated is drawn dashed with a "?".

import type { ReactNode } from 'react';
import type { Attr, Spec } from '../engine/types';
import { formatValue } from './format';

interface Props {
  spec: Spec;
  /** leave out for a picture that can't be clicked (inside another button) */
  onPick?: (attr: Attr) => void;
}

const INK = 'var(--ink)';
const FAINT = 'var(--faint)';

function Region({ attr, label, onPick, children }: { attr: Attr; label: string; onPick?: (a: Attr) => void; children: ReactNode }) {
  if (!onPick) return <g>{children}</g>;
  return (
    <g
      className="draw-region"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onPick(attr)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(attr);
        }
      }}
    >
      <title>{label}</title>
      {children}
    </g>
  );
}

const dash = (known: boolean) => (known ? undefined : '4 3');

// ---- drive recess, seen end-on ---------------------------------------------

function Recess({ drive, cx, cy, r }: { drive: string | null; cx: number; cy: number; r: number }) {
  const s = { stroke: INK, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const };
  const k = r * 0.55;
  switch (drive) {
    case 'phillips':
      return <path d={`M${cx - k} ${cy}H${cx + k}M${cx} ${cy - k}V${cy + k}`} {...s} />;
    case 'pozi':
      return (
        <g {...s}>
          <path d={`M${cx - k} ${cy}H${cx + k}M${cx} ${cy - k}V${cy + k}`} />
          <path d={`M${cx - k * 0.45} ${cy - k * 0.45}l${k * 0.25} ${k * 0.25}M${cx + k * 0.45} ${cy - k * 0.45}l${-k * 0.25} ${k * 0.25}M${cx - k * 0.45} ${cy + k * 0.45}l${k * 0.25} ${-k * 0.25}M${cx + k * 0.45} ${cy + k * 0.45}l${-k * 0.25} ${-k * 0.25}`} strokeWidth={1.2} />
        </g>
      );
    case 'combo':
      return <path d={`M${cx - k * 1.1} ${cy}H${cx + k * 1.1}M${cx} ${cy - k * 0.7}V${cy + k * 0.7}`} {...s} />;
    case 'slotted':
      return <path d={`M${cx - k * 1.1} ${cy}H${cx + k * 1.1}`} {...s} strokeWidth={3} />;
    case 'hex':
    case 'tamper': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i;
        return `${cx + k * 0.8 * Math.cos(a)},${cy + k * 0.8 * Math.sin(a)}`;
      }).join(' ');
      return (
        <g>
          <polygon points={pts} {...s} />
          {drive === 'tamper' ? <circle cx={cx} cy={cy} r={k * 0.2} fill={INK} /> : null}
        </g>
      );
    }
    case 'torx': {
      const pts: string[] = [];
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI / 6) * i - Math.PI / 2;
        const rr = i % 2 === 0 ? k * 0.85 : k * 0.5;
        pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`);
      }
      return <polygon points={pts.join(' ')} {...s} strokeLinejoin="round" />;
    }
    case 'square':
      return <rect x={cx - k * 0.55} y={cy - k * 0.55} width={k * 1.1} height={k * 1.1} {...s} />;
    default:
      return (
        <text x={cx} y={cy + 5} textAnchor="middle" className="draw-q">
          ?
        </text>
      );
  }
}

// ---- screw ------------------------------------------------------------------

function threadDiameter(thread: string | null): number {
  if (!thread) return 4;
  if (thread.startsWith('M')) return Number(thread.slice(1)) || 4;
  const frac = thread.match(/^(\d+)\/(\d+)-/);
  if (frac) return (Number(frac[1]) / Number(frac[2])) * 25.4;
  const num = thread.match(/^(\d+)-/);
  if (num) return (0.06 + 0.013 * Number(num[1])) * 25.4; // ASME number sizes
  return 4;
}

function headPath(head: string | null, x: number, cy: number, H: number, W: number): { d: string; hex?: boolean } {
  // the head sits left of x (the bearing face), height H along the axis, width W across it
  const top = cy - W / 2;
  const bot = cy + W / 2;
  switch (head) {
    case 'pan':
      return { d: `M${x} ${top}H${x - H * 0.6}Q${x - H * 1.15} ${top} ${x - H * 1.15} ${cy}Q${x - H * 1.15} ${bot} ${x - H * 0.6} ${bot}H${x}Z` };
    case 'truss':
      return { d: `M${x} ${top - W * 0.15}Q${x - H * 0.95} ${top - W * 0.15} ${x - H * 0.95} ${cy}Q${x - H * 0.95} ${bot + W * 0.15} ${x} ${bot + W * 0.15}Z` };
    case 'button':
      return { d: `M${x} ${top + W * 0.05}Q${x - H * 1.05} ${top + W * 0.05} ${x - H * 1.05} ${cy}Q${x - H * 1.05} ${bot - W * 0.05} ${x} ${bot - W * 0.05}Z` };
    case 'round':
      return { d: `M${x} ${top}A${H} ${W / 2} 0 0 0 ${x} ${bot}Z` };
    case 'flat':
      return { d: `M${x + H * 0.75} ${cy - W * 0.22}L${x - H * 0.25} ${top}H${x - H * 0.4}V${bot}H${x - H * 0.25}Z` };
    case 'oval':
      return { d: `M${x + H * 0.7} ${cy - W * 0.22}L${x - H * 0.2} ${top}Q${x - H * 0.75} ${cy} ${x - H * 0.2} ${bot}Z` };
    case 'socket':
    case 'cheese':
    case 'fillister':
      return { d: `M${x} ${top + W * 0.12}H${x - H * 1.2}V${bot - W * 0.12}H${x}Z` };
    case 'hex':
      return { d: `M${x} ${top}H${x - H}V${bot}H${x}Z`, hex: true };
    case 'flange':
      return { d: `M${x} ${top - W * 0.12}H${x - H * 0.3}V${top}H${x - H}V${bot}H${x - H * 0.3}V${bot + W * 0.12}H${x}Z` };
    case 'wafer':
    case 'low profile':
      return { d: `M${x} ${top - W * 0.1}H${x - H * 0.45}V${bot + W * 0.1}H${x}Z` };
    case 'knurled':
      return { d: `M${x} ${top - W * 0.25}H${x - H * 1.6}V${bot + W * 0.25}H${x}Z` };
    default:
      return { d: `M${x} ${top}H${x - H}V${bot}H${x}Z` };
  }
}

function ScrewDrawing({ spec, onPick }: Props) {
  const d = threadDiameter(spec.thread);
  const shankW = Math.max(20, Math.min(44, 14 + d * 2.8));
  const cy = 112;
  const x0 = 118; // bearing face of the head
  const lenKnown = spec.lengthMm !== null;
  const L = lenKnown ? Math.max(100, Math.min(200, 70 + spec.lengthMm! * 4)) : 150;
  const headH = shankW * 0.75;
  const headW = shankW * 1.9;
  const head = headPath(spec.head, x0, cy, headH, headW);
  const threadLines = [];
  for (let x = x0 + 10; x < x0 + L - 4; x += 7) {
    threadLines.push(<path key={x} d={`M${x} ${cy - shankW / 2}l4 ${shankW}`} stroke={spec.thread ? INK : FAINT} strokeWidth={1} opacity={0.55} />);
  }
  const washerKnown = spec.washer !== null;
  const tip = x0 + L;

  return (
    <svg viewBox="0 0 400 230" className="drawing" aria-label="Drawing of the screw being searched for">
      {/* shank */}
      <Region attr="thread" label={`Thread: ${spec.thread ?? 'not set'}. Click to change.`} onPick={onPick}>
        <path
          d={`M${x0} ${cy - shankW / 2}H${tip - 6}L${tip} ${cy - shankW / 4}V${cy + shankW / 4}L${tip - 6} ${cy + shankW / 2}H${x0}Z`}
          fill="var(--surface)"
          stroke={spec.thread ? INK : FAINT}
          strokeWidth={1.6}
          strokeDasharray={dash(!!spec.thread)}
        />
        {threadLines}
        <text x={x0 + L / 2} y={cy - shankW / 2 - 12} textAnchor="middle" className={spec.thread ? 'draw-label' : 'draw-label is-unknown'}>
          {spec.thread ? `${spec.thread}${spec.pitch ? ` × ${spec.pitch}` : ''}` : 'thread?'}
        </text>
      </Region>

      {/* built-in washer under the head */}
      {washerKnown ? (
        <Region attr="washer" label={`Built-in washer: ${spec.washer}. Click to change.`} onPick={onPick}>
          <rect x={x0 + 1} y={cy - headW * 0.48} width={5} height={headW * 0.96} fill="var(--surface)" stroke={INK} strokeWidth={1.4} />
          {spec.washer === 'split lock' ? <path d={`M${x0 + 1} ${cy - 3}h5`} stroke="var(--surface)" strokeWidth={4} /> : null}
          {spec.washer === 'external tooth' || spec.washer === 'internal tooth' ? (
            <path d={`M${x0 + 3.5} ${cy - headW * 0.48}v-4m0 ${headW * 0.96 + 4}v4`} stroke={INK} strokeWidth={1.4} />
          ) : null}
        </Region>
      ) : null}

      {/* head */}
      <Region attr="head" label={`Head: ${spec.head ?? 'not set'}. Click to change.`} onPick={onPick}>
        <path d={head.d} fill="var(--surface)" stroke={spec.head ? INK : FAINT} strokeWidth={1.8} strokeDasharray={dash(!!spec.head)} strokeLinejoin="round" />
        {head.hex ? <path d={`M${x0 - headH} ${cy - headW * 0.18}H${x0}M${x0 - headH} ${cy + headW * 0.18}H${x0}`} stroke={INK} strokeWidth={1} /> : null}
        <text x={x0 - headH / 2} y={cy + headW / 2 + 22} textAnchor="middle" className={spec.head ? 'draw-label' : 'draw-label is-unknown'}>
          {spec.head ? `${spec.head} head` : 'head?'}
        </text>
      </Region>

      {/* length dimension */}
      <Region attr="lengthMm" label={`Length: ${spec.lengthMm ?? 'not set'}. Click to change.`} onPick={onPick}>
        <g stroke={lenKnown ? INK : FAINT} strokeWidth={1}>
          <path d={`M${x0} ${cy + headW / 2 + 34}v12M${tip} ${cy + shankW / 2 + 8}v${headW / 2 - shankW / 2 + 38}`} />
          <path d={`M${x0 + 2} ${cy + headW / 2 + 40}H${tip - 2}`} strokeDasharray={dash(lenKnown)} />
          <path d={`M${x0 + 8} ${cy + headW / 2 + 36}l-6 4 6 4M${tip - 8} ${cy + headW / 2 + 36}l6 4-6 4`} fill="none" />
        </g>
        <rect x={x0} y={cy + headW / 2 + 30} width={L} height={20} fill="transparent" />
        <text x={x0 + L / 2} y={cy + headW / 2 + 62} textAnchor="middle" className={lenKnown ? 'draw-label' : 'draw-label is-unknown'}>
          {lenKnown ? formatValue('lengthMm', spec.lengthMm, spec) : 'length?'}
        </text>
      </Region>

      {/* end view: the drive */}
      <Region attr="drive" label={`Drive: ${spec.drive ?? 'not set'}. Click to change.`} onPick={onPick}>
        <circle cx={350} cy={56} r={30} fill="var(--surface)" stroke={spec.drive ? INK : FAINT} strokeWidth={1.6} strokeDasharray={dash(!!spec.drive)} />
        <Recess drive={spec.drive} cx={350} cy={56} r={30} />
        <text x={350} y={106} textAnchor="middle" className={spec.drive ? 'draw-label' : 'draw-label is-unknown'}>
          {spec.drive ?? 'drive?'}
        </text>
      </Region>
    </svg>
  );
}

// ---- nut ------------------------------------------------------------------

function NutDrawing({ spec, onPick }: Props) {
  const cx = 160;
  const cy = 112;
  const R = 70;
  const hex = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    return `${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`;
  }).join(' ');
  const t = spec.type;
  let body: ReactNode;
  if (t === 'cage') {
    body = (
      <g>
        <rect x={cx - 52} y={cy - 52} width={104} height={104} fill="var(--surface)" stroke={INK} strokeWidth={1.8} />
        <path d={`M${cx - 52} ${cy - 30}l-22 -10v80l22 -10M${cx + 52} ${cy - 30}l22 -10v80l-22 -10`} fill="none" stroke={INK} strokeWidth={1.6} />
      </g>
    );
  } else if (t === 'press-in' || t === 'broaching' || t === 'rivet nut') {
    body = (
      <g>
        <circle cx={cx} cy={cy} r={R} fill="var(--surface)" stroke={INK} strokeWidth={1.8} />
        <circle cx={cx} cy={cy} r={R * 0.75} fill="none" stroke={INK} strokeWidth={1} strokeDasharray="2 3" />
      </g>
    );
  } else {
    body = (
      <g>
        {t === 'flange' ? <circle cx={cx} cy={cy} r={R + 12} fill="var(--surface)" stroke={INK} strokeWidth={1.4} /> : null}
        <polygon points={hex} fill="var(--surface)" stroke={t ? INK : FAINT} strokeWidth={1.8} strokeDasharray={dash(!!t)} />
        {t === 'nylon lock' ? <circle cx={cx} cy={cy} r={R * 0.55} fill="none" stroke="var(--hue)" strokeWidth={4} opacity={0.5} /> : null}
        {t === 'kep' || spec.washer === 'external tooth' ? (
          <g stroke={INK} strokeWidth={1.4}>
            {Array.from({ length: 16 }, (_, i) => {
              const a = (Math.PI / 8) * i;
              return <path key={i} d={`M${cx + (R + 2) * Math.cos(a)} ${cy + (R + 2) * Math.sin(a)}L${cx + (R + 10) * Math.cos(a)} ${cy + (R + 10) * Math.sin(a)}`} />;
            })}
          </g>
        ) : null}
      </g>
    );
  }
  return (
    <svg viewBox="0 0 400 230" className="drawing" aria-label="Drawing of the nut being searched for">
      <Region attr="type" label={`Nut type: ${t ?? 'not set'}. Click to change.`} onPick={onPick}>
        {body}
        <text x={cx} y={cy + R + 34} textAnchor="middle" className={t ? 'draw-label' : 'draw-label is-unknown'}>
          {t ? `${t} nut` : 'type?'}
        </text>
      </Region>
      <Region attr="thread" label={`Thread: ${spec.thread ?? 'not set'}. Click to change.`} onPick={onPick}>
        <circle cx={cx} cy={cy} r={24} fill="var(--ground)" stroke={spec.thread ? INK : FAINT} strokeWidth={1.6} strokeDasharray={dash(!!spec.thread)} />
        <circle cx={cx} cy={cy} r={19} fill="none" stroke={spec.thread ? INK : FAINT} strokeWidth={0.8} strokeDasharray="3 2" />
        <text x={cx} y={cy + 5} textAnchor="middle" className={spec.thread ? 'draw-label' : 'draw-label is-unknown'}>
          {spec.thread ?? '?'}
        </text>
      </Region>
      <Region attr="material" label={`Material: ${spec.material ?? 'not set'}. Click to change.`} onPick={onPick}>
        <text x={300} y={100} className={spec.material ? 'draw-label' : 'draw-label is-unknown'}>{spec.material ?? 'material?'}</text>
        <text x={300} y={122} className={spec.finish ? 'draw-label' : 'draw-label is-unknown'}>{spec.finish ?? 'finish?'}</text>
      </Region>
    </svg>
  );
}

// ---- washer ----------------------------------------------------------------

function WasherDrawing({ spec, onPick }: Props) {
  const cx = 150;
  const cy = 108;
  const t = spec.type;
  const od = spec.odMm ?? (spec.idMm ? spec.idMm * 2.1 : null);
  const ratio = spec.idMm && od ? Math.min(0.8, Math.max(0.25, spec.idMm / od)) : t === 'fender' ? 0.32 : 0.5;
  const R = t === 'fender' ? 84 : 72;
  const r = R * ratio;
  const teeth = (outer: boolean) =>
    Array.from({ length: 14 }, (_, i) => {
      const a = ((Math.PI * 2) / 14) * i;
      const r1 = outer ? R : r;
      const r2 = outer ? R + 9 : r - 8;
      return <path key={i} d={`M${cx + r1 * Math.cos(a - 0.08)} ${cy + r1 * Math.sin(a - 0.08)}L${cx + r2 * Math.cos(a)} ${cy + r2 * Math.sin(a)}L${cx + r1 * Math.cos(a + 0.08)} ${cy + r1 * Math.sin(a + 0.08)}`} fill="none" stroke={INK} strokeWidth={1.3} />;
    });
  const thk = spec.thicknessMm;
  return (
    <svg viewBox="0 0 400 230" className="drawing" aria-label="Drawing of the washer being searched for">
      <Region attr="type" label={`Washer type: ${t ?? 'not set'}. Click to change.`} onPick={onPick}>
        <circle cx={cx} cy={cy} r={R} fill="var(--surface)" stroke={t ? INK : FAINT} strokeWidth={1.8} strokeDasharray={dash(!!t)} />
        {t === 'external tooth' ? teeth(true) : null}
        {t === 'belleville' ? <circle cx={cx} cy={cy} r={(R + r) / 2} fill="none" stroke={INK} strokeWidth={0.8} /> : null}
        {t === 'split lock' ? <path d={`M${cx + r - 2} ${cy - 3}L${cx + R + 2} ${cy + 3}`} stroke="var(--ground)" strokeWidth={7} /> : null}
        <text x={cx} y={cy + R + 26} textAnchor="middle" className={t ? 'draw-label' : 'draw-label is-unknown'}>
          {t ? `${t} washer` : 'type?'}
        </text>
      </Region>
      <Region attr="idMm" label={`Inner diameter: ${spec.idMm ?? 'not set'}. Click to change.`} onPick={onPick}>
        <circle cx={cx} cy={cy} r={r} fill="var(--ground)" stroke={INK} strokeWidth={1.6} strokeDasharray={dash(spec.idMm !== null)} />
        {t === 'internal tooth' ? teeth(false) : null}
        <text x={cx} y={cy - 4} textAnchor="middle" className={spec.fits ? 'draw-label' : 'draw-label is-unknown'}>
          {spec.fits ? `fits ${spec.fits}` : 'fits?'}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className={spec.idMm !== null ? 'draw-small' : 'draw-small is-unknown'}>
          {spec.idMm !== null ? `ID ${formatValue('idMm', spec.idMm)}` : 'ID?'}
        </text>
      </Region>
      <Region attr="odMm" label={`Outer diameter: ${spec.odMm ?? 'not set'}. Click to change.`} onPick={onPick}>
        <path d={`M${cx - R} ${cy - R - 12}H${cx + R}`} stroke={spec.odMm !== null ? INK : FAINT} strokeWidth={1} strokeDasharray={dash(spec.odMm !== null)} />
        <path d={`M${cx - R} ${cy - R - 18}v12M${cx + R} ${cy - R - 18}v12`} stroke={spec.odMm !== null ? INK : FAINT} strokeWidth={1} />
        <text x={cx} y={cy - R - 20} textAnchor="middle" className={spec.odMm !== null ? 'draw-small' : 'draw-small is-unknown'}>
          {spec.odMm !== null ? `OD ${formatValue('odMm', spec.odMm)}` : 'OD?'}
        </text>
      </Region>
      <Region attr="thicknessMm" label={`Thickness: ${thk ?? 'not set'}. Click to change.`} onPick={onPick}>
        <rect x={290} y={cy - R * 0.9} width={Math.max(5, Math.min(16, (thk ?? 1.5) * 5))} height={R * 1.8} fill="var(--surface)" stroke={thk !== null ? INK : FAINT} strokeWidth={1.6} strokeDasharray={dash(thk !== null)} />
        <text x={318} y={cy + 4} className={thk !== null ? 'draw-small' : 'draw-small is-unknown'}>
          {thk !== null ? `${formatValue('thicknessMm', thk)} thick` : 'thickness?'}
        </text>
      </Region>
    </svg>
  );
}

// ---- standoff --------------------------------------------------------------

function StandoffDrawing({ spec, onPick }: Props) {
  const cy = 108;
  const L = spec.lengthMm !== null ? Math.max(80, Math.min(220, spec.lengthMm * 6)) : 160;
  const x0 = 80;
  return (
    <svg viewBox="0 0 400 230" className="drawing" aria-label="Drawing of the standoff being searched for">
      <Region attr="type" label={`Standoff type: ${spec.type ?? 'not set'}`} onPick={onPick}>
        <rect x={x0} y={cy - 26} width={L} height={52} fill="var(--surface)" stroke={INK} strokeWidth={1.8} />
        {spec.type === 'hex' ? <path d={`M${x0} ${cy - 9}H${x0 + L}M${x0} ${cy + 9}H${x0 + L}`} stroke={INK} strokeWidth={1} /> : null}
      </Region>
      <Region attr="thread" label={`Thread: ${spec.thread ?? 'not set'}`} onPick={onPick}>
        <text x={x0 + L / 2} y={cy - 40} textAnchor="middle" className={spec.thread ? 'draw-label' : 'draw-label is-unknown'}>{spec.thread ?? 'thread?'}</text>
      </Region>
      <Region attr="lengthMm" label={`Length: ${spec.lengthMm ?? 'not set'}`} onPick={onPick}>
        <path d={`M${x0} ${cy + 46}H${x0 + L}`} stroke={INK} strokeWidth={1} />
        <text x={x0 + L / 2} y={cy + 66} textAnchor="middle" className={spec.lengthMm !== null ? 'draw-label' : 'draw-label is-unknown'}>
          {spec.lengthMm !== null ? formatValue('lengthMm', spec.lengthMm, spec) : 'length?'}
        </text>
      </Region>
    </svg>
  );
}

export function Drawing(props: Props) {
  switch (props.spec.family) {
    case 'nut': return <NutDrawing {...props} />;
    case 'washer': return <WasherDrawing {...props} />;
    case 'standoff': return <StandoffDrawing {...props} />;
    default: return <ScrewDrawing {...props} />;
  }
}
