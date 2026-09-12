/**
 * The shell: who you are, where you can go, and what happens when the session
 * ends underneath you.
 *
 * Navigation is filtered by the permissions the server returned. That is a
 * courtesy, not a control — every one of these routes is refused again on the
 * server. Hiding them stops the panel offering buttons that only ever produce a
 * 403, which is the difference between a tool that feels considered and one
 * that feels broken.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import { api, session, whenSessionLost } from './api';
import { CommandPalette, openCommandPalette, type Command } from './CommandPalette';
import { SignIn } from './SignIn';
import type { Me } from './types';
import { Loading, ToastHost, useToast } from './ui';
import { Admins } from './views/Admins';
import { Audit } from './views/Audit';
import { Dashboard } from './views/Dashboard';
import { Payments } from './views/Payments';
import { Reports } from './views/Reports';
import { TableRow as TableRowView, Tables, TableRows } from './views/Tables';

interface NavEntry {
  to: string;
  label: string;
  need: string;
  badge?: 'payments' | 'reports';
}

const NAV: { head: string; items: NavEntry[] }[] = [
  {
    head: 'Navbat',
    items: [
      { to: '/', label: 'Boshqaruv', need: 'dashboard.view' },
      { to: '/payments', label: 'Toʻlovlar', need: 'payments.view', badge: 'payments' },
      { to: '/reports', label: 'Shikoyatlar', need: 'reports.view', badge: 'reports' },
    ],
  },
  { head: 'Maʼlumot', items: [{ to: '/tables', label: 'Jadvallar', need: 'tables.view' }] },
  {
    head: 'Boshqaruv',
    items: [
      { to: '/admins', label: 'Administratorlar', need: 'admins.manage' },
      { to: '/audit', label: 'Audit', need: 'audit.view' },
    ],
  },
];

export function App() {
  return (
    <ToastHost>
      <Authenticated />
    </ToastHost>
  );
}

function Authenticated() {
  const [me, setMe] = useState<Me | null>(null);
  const [checking, setChecking] = useState(true);
  const toast = useToast();

  // A token in sessionStorage is a claim, not proof. Ask the server whether it
  // is still worth anything before drawing a panel around it: the account may
  // have been demoted, or the session revoked, while the tab sat open.
  useEffect(() => {
    if (!session.get()) {
      setChecking(false);
      return;
    }

    api<Me>('/admin/auth/me')
      .then(({ data }) => setMe(data))
      .catch(() => session.clear())
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    whenSessionLost(() => {
      setMe(null);
      toast('Sessiya tugadi. Qaytadan kiring.', true);
    });
  }, [toast]);

  if (checking) return <Loading />;
  if (!me) return <SignIn onSignedIn={setMe} />;

  return <Shell me={me} onSignedOut={() => setMe(null)} />;
}

function Shell({ me, onSignedOut }: { me: Me; onSignedOut: () => void }) {
  const [counts, setCounts] = useState({ payments: 0, reports: 0 });
  const navigate = useNavigate();

  const can = useCallback(
    (permission: string) => me.permissions.includes('*') || me.permissions.includes(permission),
    [me.permissions],
  );

  const signOut = async () => {
    try {
      await api('/admin/auth/logout', { method: 'POST' });
    } catch {
      // Already gone server-side, which is the outcome we wanted anyway.
    }

    session.clear();
    onSignedOut();
    navigate('/');
  };

  const visible = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(item.need)),
  })).filter((group) => group.items.length > 0);

  // Somebody appointed with no permissions at all can sign in and legitimately
  // see nothing. Saying so is far better than an empty panel that reads as a
  // loading failure.
  const home = visible[0]?.items[0]?.to ?? null;

  // Built from the same filtered list the sidebar draws, so the palette can
  // never offer a page the sidebar has hidden.
  const commands = useMemo<Command[]>(() => {
    const destinations = visible.flatMap((group) =>
      group.items.map((item) => ({
        id: item.to,
        label: item.label,
        group: group.head,
        run: () => navigate(item.to),
      })),
    );

    return [
      ...destinations,
      { id: 'sign-out', label: 'Chiqish', group: 'Hisob', run: () => void signOut() },
    ];
    // `visible` is derived fresh on every render, so it cannot be a dependency
    // without rebuilding this list every time; the permissions it comes from
    // are what actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.permissions, me.is_founder, navigate]);

  return (
    <div className="min-h-dvh lg:flex lg:gap-5 lg:p-5">
      <CommandPalette commands={commands} />

      {/*
        Desktop: a glass pane that stays with the page while the content
        scrolls beside it. Phone: nothing here - navigation lives at the
        bottom, under the thumb, and a 232px column would eat the screen.
      */}
      <aside className="hidden lg:sticky lg:top-5 lg:flex lg:h-[calc(100dvh-2.5rem)] lg:w-[236px] lg:shrink-0 lg:flex-col lg:gap-4 pane p-4">
        <div className="flex items-center gap-2.5 px-1.5 pt-1 font-extrabold tracking-wide">
          <Logo />
          HAST
        </div>

        {/* Said out loud, because a shortcut nobody is told about is a
            shortcut nobody uses. It looks like search for the same reason. */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex items-center gap-2 rounded-pill border border-rim bg-white/70 px-3 py-2.5 text-[12.5px] text-ink-faint transition hover:border-white/80 hover:bg-white hover:text-ink-muted"
        >
          <SearchGlyph />
          <span className="flex-1 text-left">Qidirish</span>
          <kbd className="kbd">Ctrl K</kbd>
        </button>

        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {visible.map((group) => (
            <div key={group.head}>
              <div className="px-3 pb-1.5 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">
                {group.head}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'flex items-center justify-between gap-2 rounded-pill border px-3 py-2.5 text-[13.5px]',
                      'transition-[background-color,border-color,box-shadow] duration-150',
                      // "You are here" is a pane that has risen toward the
                      // viewer. Inactive items keep a transparent border of the
                      // same width so nothing shifts by a pixel on selection.
                      isActive
                        ? 'border-rim bg-white text-ink shadow-lift'
                        : 'border-transparent text-ink-muted hover:bg-white/60 hover:text-ink',
                    ].join(' ')
                  }
                >
                  <span className="truncate">{item.label}</span>
                  {item.badge && counts[item.badge] > 0 && <Badge n={counts[item.badge]} />}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-rim-soft px-2 pt-3 text-[12.5px]">
          <div className="truncate font-medium">{me.name ?? me.email}</div>
          <div className="text-ink-faint">{me.is_founder ? 'root' : me.role}</div>
          <button
            onClick={() => void signOut()}
            className="mt-2.5 text-[13px] text-link transition hover:brightness-125"
          >
            Chiqish
          </button>
        </div>
      </aside>

      {/* Phone: a glass bar across the top carrying identity and search. */}
      <header className="pane sticky top-0 z-40 mx-3 mt-3 flex items-center gap-3 rounded-pane px-4 py-3 lg:hidden">
        <Logo />
        <span className="font-extrabold tracking-wide">HAST</span>

        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Qidirish"
          className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-rim bg-white/70 text-ink-muted transition active:scale-95"
        >
          <SearchGlyph />
        </button>

        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Chiqish"
          className="grid h-9 w-9 place-items-center rounded-full border border-rim bg-white/70 text-ink-muted transition active:scale-95"
        >
          <ExitGlyph />
        </button>
      </header>

      <main className="flex min-w-0 flex-1 flex-col gap-4 p-3 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] lg:p-0 lg:pb-0">
        {home === null ? (
          <div className="plate p-6">
            <h2 className="mb-2 text-[17px] font-bold">Ruxsat berilmagan</h2>
            <p className="text-[13px] text-ink-muted">
              Hisobingiz administrator sifatida qoʻshilgan, lekin hech qanday ruxsat
              berilmagan. Asosiy administratordan soʻrang.
            </p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={can('dashboard.view') ? <Dashboard onCounts={setCounts} /> : <Navigate to={home} replace />} />
            <Route path="/payments" element={can('payments.view') ? <Payments can={can} /> : <Navigate to={home} replace />} />
            <Route path="/reports" element={can('reports.view') ? <Reports can={can} /> : <Navigate to={home} replace />} />
            <Route path="/tables" element={can('tables.view') ? <Tables /> : <Navigate to={home} replace />} />
            <Route path="/tables/:table" element={can('tables.view') ? <TableRows /> : <Navigate to={home} replace />} />
            <Route path="/tables/:table/row/:id" element={can('tables.view') ? <TableRowView can={can} /> : <Navigate to={home} replace />} />
            <Route path="/admins" element={can('admins.manage') ? <Admins /> : <Navigate to={home} replace />} />
            <Route path="/audit" element={can('audit.view') ? <Audit /> : <Navigate to={home} replace />} />
            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        )}
      </main>

      {/* Phone: the navigation, floating clear of the bottom edge. Flattened
          out of its groups, because a phone bar has room for labels and not
          for headings. */}
      {home !== null && (
        <nav className="pane fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex items-stretch justify-around gap-1 px-2 py-2 lg:hidden">
          {visible.flatMap((group) => group.items).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-pill px-1 py-2',
                  'text-[10.5px] font-semibold transition-colors',
                  isActive ? 'bg-white text-ink shadow-lift' : 'text-ink-faint',
                ].join(' ')
              }
            >
              <span className="truncate">{item.label}</span>
              {item.badge && counts[item.badge] > 0 && (
                <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-stop" />
              )}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

function Badge({ n }: { n: number }) {
  return (
    <span className="min-w-[20px] rounded-full border border-stop/40 bg-stop/20 px-1.5 py-[1px] text-center font-mono text-[11px] font-bold text-stop">
      {n}
    </span>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 100 100" className="h-[30px] w-[30px] shrink-0 rounded-[9px]" aria-hidden>
      <rect width="100" height="100" rx="24" fill="#12A25F" />
      <path
        d="M22 48 L50 26 L78 48"
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="62" r="7.5" fill="#fff" />
      <circle cx="60" cy="62" r="7.5" fill="#fff" />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.2 13.2 3 3" strokeLinecap="round" />
    </svg>
  );
}

function ExitGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden>
      <path d="M12 6V4.8A1.8 1.8 0 0 0 10.2 3H5.8A1.8 1.8 0 0 0 4 4.8v10.4A1.8 1.8 0 0 0 5.8 17h4.4a1.8 1.8 0 0 0 1.8-1.8V14" strokeLinecap="round" />
      <path d="M8.5 10H17m0 0-2.6-2.6M17 10l-2.6 2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The header every view shares, so the title and its actions line up. */
export function Screen({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // Title and work sit on one plate rather than two. Two panes stacked with
    // a gap between them read as two unrelated things, and a heading belongs
    // to the table underneath it.
    <section className="plate flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rim-soft px-5 py-4 sm:px-6">
        <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      </header>

      <div className="min-h-0 flex-1 p-4 sm:p-6">{children}</div>
    </section>
  );
}
