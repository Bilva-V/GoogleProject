// A panel that floats over the page: the part details slide in from the right,
// the comparison opens in the middle. Escape or the backdrop closes it, and focus
// goes back to whatever opened it.

import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  label: string;
  onClose: () => void;
  children: ReactNode;
  variant?: 'side' | 'center';
}

export function Sheet({ label, onClose, children, variant = 'side' }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('has-sheet');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('has-sheet');
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={`sheet-wrap sheet-${variant}`}>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={panel}>
        <button type="button" className="icon-btn sheet-close" onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}
