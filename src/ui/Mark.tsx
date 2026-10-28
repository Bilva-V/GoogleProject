// How one attribute of a part compares with what was asked. The same visual
// language as the drawing: solid when stated, dashed when the record is silent.

import type { Spec } from '../engine/types';
import { ATTR_LABEL } from '../engine/types';
import type { Check } from '../engine/search';
import { formatValue } from './format';

const GLYPH = { match: '✓', near: '≈', unknown: '?', differs: '✕' } as const;
const WORD = { match: 'matches', near: 'close', unknown: 'not stated', differs: 'differs' } as const;

export function Mark({ check: c, spec, compact }: { check: Check; spec: Spec; compact?: boolean }) {
  const label = ATTR_LABEL[c.attr].toLowerCase();
  const found = formatValue(c.attr, c.found, spec);
  const text = compact
    ? WORD[c.verdict]
    : c.verdict === 'unknown'
      ? `${label}?`
      : c.verdict === 'match'
        ? found
        : `${found}`;
  return (
    <span
      className={`mark mark-${c.verdict}`}
      title={`${ATTR_LABEL[c.attr]}: you asked for ${formatValue(c.attr, c.asked)}; ${c.verdict === 'unknown' ? 'the description does not say' : `the part is ${found}`}`}
    >
      <span className="mark-glyph" aria-hidden="true">{GLYPH[c.verdict]}</span>
      {text}
    </span>
  );
}
