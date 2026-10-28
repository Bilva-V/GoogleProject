// A chip for one attribute of the search, with a popover listing the values the
// catalogue really holds and, given the rest of the search, how many parts each
// choice would leave ready to use or close.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Attr, Catalog, Family, Spec } from '../engine/types';
import { ATTR_LABEL, NUMERIC_ATTRS } from '../engine/types';
import { valueCounts } from '../engine/search';
import { formatValue } from './format';

interface Props {
  catalog: Catalog;
  family: Family;
  attr: Attr;
  spec: Spec;
  open: boolean;
  onOpen: (open: boolean) => void;
  onSet: (value: string | number | null) => void;
  /** parts ready or close if this value were chosen, with the rest of the search unchanged */
  countFor?: (value: string | number) => number;
}

export function Chip({ catalog, family, attr, spec, open, onOpen, onSet, countFor }: Props) {
  const value = (spec as unknown as Record<string, string | number | null>)[attr];
  const set = value !== null && value !== undefined;
  const ref = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [filter, setFilter] = useState('');
  const options = useMemo(() => valueCounts(catalog, family, attr), [catalog, family, attr]);
  const numeric = NUMERIC_ATTRS.has(attr);
  // Only worked out while the menu is open: one search per value.
  const fits = useMemo(
    () => (open && countFor ? new Map(options.map((o) => [o.value, countFor(o.value)])) : null),
    [open, countFor, options]
  );

  useEffect(() => {
    if (!open) return;
    setFilter('');
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpen]);

  const shown = options.filter((o) => !filter || formatValue(attr, o.value).toLowerCase().includes(filter.toLowerCase()));
  const typed = numeric && /^\d*\.?\d+$/.test(filter.trim()) ? Number(filter) : null;

  return (
    <div className={`chip${set ? ' is-set' : ' is-unset'}${open ? ' is-open' : ''}`} ref={ref}>
      <button
        ref={button}
        type="button"
        className="chip-btn"
        onClick={() => onOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={set ? `${ATTR_LABEL[attr]}: ${formatValue(attr, value, spec)}. Change` : `Add ${ATTR_LABEL[attr].toLowerCase()}`}
      >
        {set ? (
          <>
            <span className="chip-k">{ATTR_LABEL[attr]}</span>
            <span className="chip-v">{formatValue(attr, value, spec)}</span>
          </>
        ) : (
          <span className="chip-k">+ {ATTR_LABEL[attr].toLowerCase()}</span>
        )}
      </button>
      {set ? (
        <button
          type="button"
          className="chip-x"
          aria-label={`Remove ${ATTR_LABEL[attr]}`}
          onClick={() => {
            onSet(null);
            // Keep focus (and the scroll position) on this field rather than losing it with the × button.
            requestAnimationFrame(() => button.current?.focus({ preventScroll: true }));
          }}
        >
          ×
        </button>
      ) : null}
      {open ? (
        <div className="pop" role="dialog" aria-label={ATTR_LABEL[attr]}>
          <input
            autoFocus
            className="pop-filter"
            placeholder={numeric ? 'Type a size in mm, or pick one' : `Filter ${ATTR_LABEL[attr].toLowerCase()}`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (typed !== null) onSet(typed);
                else if (shown[0]) onSet(shown[0].value);
                onOpen(false);
              }
            }}
          />
          <ul className="pop-list" role="listbox">
            {typed !== null && !options.some((o) => o.value === typed) ? (
              <li>
                <button type="button" className="pop-opt is-custom" onClick={() => { onSet(typed); onOpen(false); }}>
                  <span>Search for {typed} mm</span>
                  <span className="pop-count">sizes within 0.25 mm shown too</span>
                </button>
              </li>
            ) : null}
            {shown.map((o) => (
              <li key={String(o.value)}>
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  className={`pop-opt${o.value === value ? ' is-current' : ''}`}
                  onClick={() => { onSet(o.value); onOpen(false); }}
                >
                  <span>{formatValue(attr, o.value)}</span>
                  {fits ? (
                    <span className={`pop-count${fits.get(o.value) ? '' : ' is-zero'}`}>{fits.get(o.value) ? `${fits.get(o.value)} fit` : 'none fit'}</span>
                  ) : (
                    <span className="pop-count">{o.count}</span>
                  )}
                </button>
              </li>
            ))}
            {!shown.length && typed === null ? <li className="pop-empty">No part states that.</li> : null}
          </ul>
          <p className="pop-foot">
            {fits ? 'How many parts would be ready or close with this choice and the rest of your search.' : 'Counts are parts whose description states the value.'}
          </p>
        </div>
      ) : null}
    </div>
  );
}
