import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { getAllRoutes } from './router-utils';

export default function AppLayout() {
  const [open, setOpen] = useState(false);

  const navigation = getAllRoutes().flatMap(route => {
    const label = route.handle?.label;
    return route.handle?.showInNavigation === true && route.fullPath !== undefined && typeof label === 'string'
      ? [{ path: route.fullPath, label }]
      : [];
  });

  const linkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      'inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-ink-soft transition-colors hover:text-ink',
      isActive && 'bg-ink text-paper hover:text-paper'
    );

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-ink/15 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <span
              aria-hidden
              className="grid size-8 place-items-center rounded-md bg-ink font-display text-lg font-semibold text-paper shadow-[3px_3px_0_var(--color-signal)]"
            >
              F
            </span>
            <span className="font-display text-lg font-semibold leading-none">
              Fin Card Studio
              <span className="mt-0.5 block font-sans text-[0.68rem] font-medium uppercase tracking-[0.16em] text-ink-soft">
                Ask Fin cards
              </span>
            </span>
          </Link>
          <nav aria-label="Studio" className="hidden items-center gap-1 md:flex">
            {navigation.map(item => (
              <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setOpen(value => !value)}
            className="grid size-11 place-items-center rounded-md text-ink hover:bg-paper-deep md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Studio" className="flex flex-col gap-1 border-t border-ink/10 px-4 py-3 md:hidden">
            {navigation.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <div id="main" className="flex-1">
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}
