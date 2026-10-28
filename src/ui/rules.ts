// What each kind of group means and what Google said to do about it, in the
// words the Find drawer and the Clean-up queue both use.

import type { Group, GroupKind } from '../engine/types';
import { ATTR_LABEL } from '../engine/types';

export const KIND_LABEL: Record<GroupKind, string> = {
  duplicate: 'Duplicates',
  pack: 'Pack sizes',
  near: 'Near sizes',
  variant: 'Variants',
  conflict: 'Conflicting records',
};

export const KIND_ONE: Record<GroupKind, string> = {
  duplicate: 'duplicate',
  pack: 'pack size',
  near: 'near size',
  variant: 'variant',
  conflict: 'conflicting record',
};

/** Google's ruling, one sentence each (from the Week 3 meeting). */
export const KIND_RULE: Record<GroupKind, string> = {
  duplicate: 'The same part entered more than once. Consolidate onto the preferred GPN, even when the lifecycle phases differ.',
  pack: 'The same part sold singly and in bulk. Keep both GPNs and count their volume together.',
  near: 'Sizes within 0.25 mm of each other. An engineer decides whether one can replace the other; the more-ordered part is shown first.',
  variant: 'Supplier part numbers share a base, but the descriptions state a real difference. Treat them as different parts unless the datasheet says otherwise.',
  conflict: 'The same supplier part number, yet the descriptions disagree. One record is wrong; check the datasheet before using either.',
};

export const KIND_DEFAULT: Record<GroupKind, 'consolidate' | 'separate' | 'check'> = {
  duplicate: 'consolidate',
  pack: 'separate',
  near: 'check',
  variant: 'separate',
  conflict: 'check',
};

export function groupSummary(g: Group): string {
  const diffs = g.differences.map((a) => ATTR_LABEL[a].toLowerCase());
  switch (g.kind) {
    case 'duplicate':
      return g.detail ? `Same supplier part number ${g.detail}` : `Same description, ${g.evidence === 'same description' ? 'word for word' : 'apart from wording'}`;
    case 'pack':
      return 'Same part, different pack quantity';
    case 'near':
      if (g.evidence === 'same specs except one size') return g.detail ?? 'One size differs slightly';
      return `Same supplier part number ${g.detail}; one size differs slightly`;
    case 'variant':
      return `Base ${g.detail ?? ''}; differ in ${diffs.join(', ') || 'detail'}`.trim();
    case 'conflict':
      return `Both cite ${g.detail ?? 'one part number'}; disagree on ${diffs.join(', ') || 'detail'}`;
  }
}
