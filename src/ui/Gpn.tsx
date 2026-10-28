// A GPN in mono with a one-click copy: copying the number is the whole point of a find.

import { Icon } from './Icon';
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
        <Icon name="content_copy" size={18} />
      </button>
    </span>
  );
}
