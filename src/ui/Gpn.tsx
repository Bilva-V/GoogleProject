// A GPN in mono with a one-click copy: copying the number is the whole point of a find.

import { Copy } from 'lucide-react';
import { copyText } from './toast';

export function Gpn({ gpn, size = 'md' }: { gpn: string; size?: 'md' | 'lg' }) {
  return (
    <span className={`gpn-copy gpn-${size}`}>
      <code className="gpn">{gpn}</code>
      <button
        type="button"
        className="icon-btn"
        aria-label={`Copy GPN ${gpn}`}
        title="Copy GPN"
        onClick={(e) => {
          e.stopPropagation();
          copyText(gpn);
        }}
      >
        <Copy size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </span>
  );
}
