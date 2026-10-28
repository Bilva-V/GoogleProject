// The shell: the mark, four places to go, and the state of the data.

import { useEffect } from 'react';
import { useStore, Route } from './store';
import { Find, SEARCH_INPUT_ID } from './Find';
import { NewPart } from './NewPart';
import { Cleanup } from './Cleanup';
import { HealthPage } from './Health';
import { StandardPage } from './Standard';
import { Toaster } from './toast';

const NAV: { page: Route['page']; label: string; to: Route }[] = [
  { page: 'find', label: 'Find', to: { page: 'find', q: '' } },
  { page: 'new', label: 'New part', to: { page: 'new', q: '' } },
  { page: 'cleanup', label: 'Clean up', to: { page: 'cleanup', kind: 'duplicate' } },
  { page: 'health', label: 'Health', to: { page: 'health' } },
  { page: 'standard', label: 'Standard', to: { page: 'standard' } },
];

export function Mark() {
  return (
    <svg className="brand-mark" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="12.5" fill="var(--ink)" />
      <path d="M14 7.5v13M7.5 14h13" stroke="var(--surface)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function App() {
  const { route, go, catalog, volumes } = useStore();

  // "/" jumps to the search from anywhere, as in most search tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      if (route.page !== 'find') go({ page: 'find', q: '' });
      requestAnimationFrame(() => (document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null)?.focus());
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [route.page, go]);

  useEffect(() => {
    const titles: Record<Route['page'], string> = {
      find: 'Find',
      new: 'New part',
      cleanup: 'Clean up',
      health: 'Health',
      standard: 'Standard',
    };
    document.title = `${titles[route.page]} · Fastener Finder`;
  }, [route.page]);

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <a className="brand" href="#/find" onClick={(e) => { e.preventDefault(); go({ page: 'find', q: '' }); }}>
          <Mark />
          <span>Fastener Finder</span>
        </a>
        <nav className="nav" aria-label="Sections">
          {NAV.map((n) => (
            <a
              key={n.page}
              href={`#/${n.page}`}
              aria-current={route.page === n.page ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(n.to);
              }}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <p className="data-stamp">
          <span className="num">{catalog.health.inScope.toLocaleString('en-US')}</span> GPNs from the Oct 2026 Agile export
          <span className="data-sep" aria-hidden="true" />
          <a href="#/health" onClick={(e) => { e.preventDefault(); go({ page: 'health' }); }} className={volumes.size ? 'is-loaded' : ''}>
            {volumes.size ? `Volumes for ${volumes.size.toLocaleString('en-US')} GPNs` : 'No volumes loaded'}
          </a>
        </p>
      </header>
      <main id="main" className={`page page-${route.page}`}>
        {route.page === 'find' ? <Find q={route.q} /> : null}
        {route.page === 'new' ? <NewPart q={route.q} /> : null}
        {route.page === 'cleanup' ? <Cleanup kind={route.kind} /> : null}
        {route.page === 'health' ? <HealthPage /> : null}
        {route.page === 'standard' ? <StandardPage /> : null}
      </main>
      <Toaster />
    </>
  );
}
