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
    <div className="grid min-h-dvh gap-4 bg-panel-deep p-4 md:grid-cols-[228px_1fr]">
      <CommandPalette commands={commands} />

      <aside className="surface flex flex-col p-4 md:flex-col">
        <div className="flex items-center gap-2.5 px-1.5 pb-5 font-extrabold tracking-wide">
          <svg viewBox="0 0 100 100" className="h-[30px] w-[30px] rounded-[8px]">
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
          HAST
        </div>

        {/* Said out loud, because a shortcut nobody is told about is a shortcut
            nobody uses. It looks like a search field for the same reason. */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="mb-1 flex items-center gap-2 rounded-soft-sm border border-edge bg-panel-lift px-2.5 py-2 text-[12.5px] text-ink-faint transition-colors hover:border-edge-bright hover:text-ink-muted"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            aria-hidden
          >
            <circle cx="9" cy="9" r="5.5" />
            <path d="m13.2 13.2 3 3" strokeLinecap="round" />
          </svg>
          <span className="flex-1 text-left">Qidirish</span>
          <kbd className="kbd">Ctrl K</kbd>
        </button>

        <nav className="flex flex-col gap-1.5">
          {visible.map((group) => (
            <div key={group.head}>
              <div className="px-2 pb-1.5 pt-4 text-[10.5px] font-bold uppercase tracking-widest text-ink-faint">
                {group.head}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    [
                      'flex items-center justify-between rounded-soft-sm border px-3 py-2 text-[13.5px] transition-colors',
                      // "You are here" is a lighter surface and a visible edge.
                      // The inactive items keep a transparent border of the same
                      // width so that nothing shifts by a pixel on selection.
                      isActive
                        ? 'border-edge bg-panel-lift text-ink'
                        : 'border-transparent text-ink-muted hover:bg-panel-lift/60 hover:text-ink',
                    ].join(' ')
                  }
                >
                  <span>{item.label}</span>
                  {item.badge && counts[item.badge] > 0 && (
                    <span className="min-w-[20px] rounded-full border border-stop/35 bg-stop/10 px-1.5 py-[1px] text-center font-mono text-[11px] font-bold text-stop">
                      {counts[item.badge]}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto px-2 pt-4 text-[12.5px]">
          <div>{me.name ?? me.email}</div>
          <div className="text-ink-muted">{me.is_founder ? 'root' : me.role}</div>
          <button onClick={() => void signOut()} className="mt-3 text-[13px] text-link hover:underline">
            Chiqish
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col gap-[18px]">
        {home === null ? (
          <div className="surface p-6">
            <h2 className="mb-2 text-lg font-bold">Ruxsat berilmagan</h2>
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
    </div>
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
    <>
      <header className="surface flex items-center justify-between gap-4 px-6 py-4">
        <h2 className="text-[17px] font-bold tracking-tight">{title}</h2>
        <div className="flex items-center gap-2.5">{actions}</div>
      </header>
      <div className="surface flex-1 overflow-x-auto p-6">{children}</div>
    </>
  );
}
