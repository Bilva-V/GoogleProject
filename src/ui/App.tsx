// The shell: the mark, four places to go, and the state of the data.

import { useEffect, useRef } from 'react';
import { useStore, Route } from './store';
import { Find, SEARCH_INPUT_ID } from './Find';
import { NewPart } from './NewPart';
import { Cleanup } from './Cleanup';
import { HealthPage } from './Health';
import { StandardPage } from './Standard';
import { Toaster } from './toast';
import { Icon, IconName } from './Icon';

const NAV: { page: Route['page']; label: string; icon: IconName; to: Route }[] = [
  { page: 'find', label: 'Find', icon: 'manage_search', to: { page: 'find', q: '' } },
  { page: 'new', label: 'New part', icon: 'add_circle', to: { page: 'new', q: '' } },
  { page: 'cleanup', label: 'Clean up', icon: 'cleaning_services', to: { page: 'cleanup', kind: 'duplicate' } },
  { page: 'health', label: 'Health', icon: 'monitoring', to: { page: 'health' } },
  { page: 'standard', label: 'Standard', icon: 'rule', to: { page: 'standard' } },
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
  const { route, go, catalog, volumes, flagged, reviews } = useStore();
  // Groups sent from Find that nobody has decided yet.
  const waiting = flagged.filter((id) => !reviews[id]?.decision).length;
  // Find in the rail returns to the last search rather than wiping it.
  const lastFind = useRef('');
  if (route.page === 'find') lastFind.current = route.q;

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
        <p className="data-stamp">
          <span className="num">{catalog.health.inScope.toLocaleString('en-US')}</span> GPNs from the Oct 2026 Agile export
          <a href="#/health" onClick={(e) => { e.preventDefault(); go({ page: 'health' }); }} className={`stamp-chip${volumes.size ? ' is-loaded' : ''}`}>
            {volumes.size ? <Icon name="check" size={18} /> : null}
            {volumes.size ? `Volumes for ${volumes.size.toLocaleString('en-US')} GPNs` : 'No volumes loaded'}
          </a>
        </p>
      </header>
      {/* Navigation rail on wide screens, navigation bar at the bottom on phones. */}
      <nav className="rail" aria-label="Sections">
        {NAV.map((n) => {
          const current = route.page === n.page;
          return (
            <a
              key={n.page}
              href={`#/${n.page}`}
              aria-current={current ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                go(n.page === 'find' ? { page: 'find', q: lastFind.current } : n.to);
              }}
            >
              <span className="rail-pill">
                <Icon name={current ? (`${n.icon}-fill` as IconName) : n.icon} size={24} />
                {n.page === 'cleanup' && waiting ? (
                  <span className="rail-badge" aria-label={`${waiting} sent from Find`}>
                    {waiting}
                  </span>
                ) : null}
              </span>
              <span className="rail-label">{n.label}</span>
            </a>
          );
        })}
      </nav>
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
