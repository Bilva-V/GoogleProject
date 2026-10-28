// One quiet confirmation at a time ("Copied 07070024"), announced to screen readers.

import { useEffect, useState } from 'react';

const EVENT = 'fastener-finder:toast';

export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

export async function copyText(text: string, label = text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API blocked (insecure context, old browser): fall back to a hidden field.
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    el.remove();
  }
  toast(`Copied ${label}`);
}

export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const on = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setMessage(null), 2200);
    };
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener(EVENT, on);
      window.clearTimeout(timer);
    };
  }, []);
  return (
    <div className="toast-slot" role="status" aria-live="polite">
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}
