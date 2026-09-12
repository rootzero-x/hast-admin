/**
 * The pieces the panel is assembled from.
 *
 * Kept together because a spatial interface only holds together if every
 * plate agrees on its depth: the same rim light, the same cast shadow, the
 * same radius at the same elevation. Scatter these across twenty files and
 * within a week three panes will be floating at three different heights and
 * nobody will be able to say which one is wrong.
 */

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

type Tone = 'go' | 'quiet' | 'danger';

const TONE: Record<Tone, string> = {
  // One solid button per screen, and it is the one that commits. When every
  // control is glass the eye has to read all of them to find the action, which
  // is the wrong moment to think - it is usually approving somebody's money.
  go: 'bg-go text-white border-go/60 hover:bg-[#0C9159] hover:shadow-glow',
  quiet: 'bg-white/70 text-ink border-rim hover:bg-white hover:border-white/80 hover:shadow-lift',
  danger: 'bg-stop/12 text-stop border-stop/30 hover:bg-stop/20 hover:border-stop/50 hover:shadow-lift',
};

export function Button({
  children,
  tone = 'go',
  small = false,
  busy = false,
  disabled = false,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  tone?: Tone;
  small?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const off = disabled || busy;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={off}
      className={[
        'select-none rounded-pill border font-semibold',
        'transition-[background-color,border-color,box-shadow,transform] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-go/50',
        // Touch targets stay finger-sized on a phone even in the compact size.
        small ? 'px-3.5 py-2 text-[12.5px]' : 'px-5 py-2.5 text-sm',
        off
          ? 'cursor-default border-rim-soft bg-white/70 text-ink-faint'
          : `${TONE[tone]} active:translate-y-px`,
      ].join(' ')}
    >
      {busy ? '…' : children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                   */
/* -------------------------------------------------------------------------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function Stat({
  value,
  label,
  alert = false,
}: {
  value: ReactNode;
  label: string;
  alert?: boolean;
}) {
  return (
    <div
      className={
        'card p-4 transition-shadow duration-200 hover:shadow-raised ' +
        // A queue with something in it is the only thing on this screen asking
        // to be worked, so it is the only thing allowed to use colour.
        (alert ? 'border-stop/35 bg-stop/[0.09]' : '')
      }
    >
      <div
        className={
          'font-mono text-[26px] font-extrabold leading-none tracking-tight ' +
          (alert ? 'text-stop' : 'text-ink')
        }
      >
        {value}
      </div>
      <div className="mt-2 text-[11.5px] font-medium text-ink-muted">{label}</div>
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-5 rounded-card border border-warn/30 bg-warn/[0.09] p-4 text-[12.5px] text-warn">
      {children}
    </div>
  );
}

export function Tag({ children, tone }: { children: ReactNode; tone: Tone | 'flat' | 'warn' }) {
  const colour =
    tone === 'go'
      ? 'border-go/35 bg-go/15 text-go'
      : tone === 'danger'
        ? 'border-stop/35 bg-stop/15 text-stop'
        : tone === 'warn'
          ? 'border-warn/35 bg-warn/15 text-warn'
          : 'border-rim bg-white/70 text-ink-muted';

  return (
    <span
      className={
        'inline-block whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11px] font-semibold ' +
        colour
      }
    >
      {children}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[6px] border border-rim bg-room-deep px-1.5 py-0.5 font-mono text-xs">
      {children}
    </code>
  );
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One table, two shapes.
 *
 * On a wide screen this is an ordinary table: rows separated by a hairline,
 * nothing framed, because fifty framed rows in a column is a quilt rather than
 * something you can scan down.
 *
 * On a phone a seven-column table is unreadable at any zoom, so each row
 * becomes its own small card with the column headings printed beside the
 * values. The views do not know this happens - `Row` reads the headings from
 * context and hands each `Cell` its own label - so a screen written once works
 * in both shapes and cannot drift out of step with itself.
 */
const HeadContext = createContext<ReactNode[]>([]);

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <HeadContext.Provider value={head}>
      <div className="lg:overflow-x-auto">
        <table className="w-full border-collapse text-[13px] max-lg:block">
          <thead className="max-lg:hidden">
            <tr>
              {head.map((cell, i) => (
                <th
                  key={i}
                  className="whitespace-nowrap border-b border-rim-soft px-3 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-faint"
                >
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="max-lg:block max-lg:space-y-2.5">{children}</tbody>
        </table>
      </div>
    </HeadContext.Provider>
  );
}

export function Row({ children }: { children: ReactNode }) {
  const head = useContext(HeadContext);

  return (
    <tr
      className={
        'transition-colors hover:bg-go/[0.05] ' +
        'max-lg:block max-lg:rounded-card max-lg:border max-lg:border-rim-soft ' +
        'max-lg:bg-white/70 max-lg:p-3.5'
      }
    >
      {Children.map(children, (child, i) =>
        isValidElement(child)
          ? cloneElement(child as ReactElement<{ label?: ReactNode }>, { label: head[i] })
          : child,
      )}
    </tr>
  );
}

export function Cell({
  children,
  className = '',
  numeric = false,
  label,
}: {
  children: ReactNode;
  className?: string;
  numeric?: boolean;
  /** Supplied by `Row`; the column heading, shown only in the phone shape. */
  label?: ReactNode;
}) {
  return (
    <td
      className={[
        'border-b border-rim-soft px-3 py-3 align-top',
        numeric ? 'whitespace-nowrap lg:text-right lg:font-mono' : '',
        // As a card row: a label/value pair, no borders, no cell padding.
        'max-lg:flex max-lg:items-baseline max-lg:justify-between max-lg:gap-4',
        'max-lg:border-0 max-lg:px-0 max-lg:py-1 max-lg:text-right',
        'max-lg:empty:hidden',
        className,
      ].join(' ')}
    >
      {label !== undefined && label !== '' && (
        <span
          aria-hidden
          className="hidden text-[10.5px] font-bold uppercase tracking-wider text-ink-faint max-lg:block"
        >
          {label}
        </span>
      )}
      <span className={numeric ? 'max-lg:font-mono' : undefined}>{children}</span>
    </td>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                     */
/* -------------------------------------------------------------------------- */

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-16 text-center text-[13.5px] text-ink-muted">{children}</div>;
}

export function Loading() {
  return <Empty>Yuklanmoqda…</Empty>;
}

/* -------------------------------------------------------------------------- */
/* Toasts                                                                     */
/* -------------------------------------------------------------------------- */

type Toast = { id: number; text: string; bad: boolean };

const ToastContext = createContext<(text: string, bad?: boolean) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastHost({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const push = useCallback((text: string, bad = false) => {
    const id = next.current++;
    setToasts((all) => [...all, { id, text, bad }]);

    // Failures stay longer: they usually say something the reader has to act
    // on, and two and a half seconds is not enough to read a sentence.
    window.setTimeout(
      () => {
        setToasts((all) => all.filter((t) => t.id !== id));
      },
      bad ? 5000 : 2600,
    );
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}

      {/* Clear of the phone's bottom navigation, and of the home indicator. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-8">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={
              'float animate-rise px-5 py-3 text-[13px] ' +
              (toast.bad ? 'text-stop' : 'text-ink')
            }
          >
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Dialog                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A real `<dialog>`, not a div pretending to be one.
 *
 * The browser then handles the focus trap, Escape, the inertness of the page
 * behind it and the backdrop - four things that are easy to reimplement badly
 * and that an administrator confirming a payment genuinely relies on.
 *
 * On a phone it sits at the bottom like a sheet, because that is where a thumb
 * is; on a desktop it floats in the middle.
 */
export function Dialog({
  title,
  onClose,
  children,
  actions,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node && !node.open) node.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={[
        'float animate-sheet p-0 text-ink backdrop:animate-fade',
        'w-[min(94vw,600px)]',
        // Bottom sheet on a phone, centred pane on a desktop.
        'max-lg:mb-0 max-lg:mt-auto max-lg:w-full max-lg:max-w-none',
        'max-lg:rounded-b-none max-lg:pb-[env(safe-area-inset-bottom)]',
      ].join(' ')}
    >
      <div className="p-6">
        <h3 className="mb-4 text-[16px] font-bold tracking-tight">{title}</h3>
        {children}
      </div>

      <div className="flex flex-wrap justify-end gap-2.5 px-6 pb-6">
        <Button tone="quiet" small onClick={onClose}>
          Yopish
        </Button>
        {actions}
      </div>
    </dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

export function money(value: number | string): string {
  const n = Math.round(Number(value) || 0);
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} soʻm`;
}

export function when(value: string | null | undefined): string {
  if (!value) return '—';

  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
