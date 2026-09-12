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
  //
  // The primary is a gradient with a lit top edge rather than a flat slab,
  // because a flat slab sits dead next to a sheet of glass.
  go:
    'border-[#0C9159]/60 bg-gradient-to-b from-[#19C07C] to-[#0C9159] text-white ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_16px_-6px_rgba(12,145,89,0.55)] ' +
    'hover:from-[#1FCE87] hover:to-[#0E9E62] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_22px_-8px_rgba(12,145,89,0.6)]',
  quiet:
    'border-rim bg-white/80 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ' +
    'hover:border-rim-strong hover:bg-white hover:shadow-lift',
  danger:
    'border-stop/30 bg-stop/[0.08] text-stop shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ' +
    'hover:border-stop/50 hover:bg-stop/[0.14] hover:shadow-lift',
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
 * One table, two shapes, and rows that open.
 *
 * On a wide screen this is an ordinary table: rows separated by a hairline,
 * nothing framed, because fifty framed rows in a column is a quilt rather than
 * something you can scan down.
 *
 * On a phone a seven-column table is unreadable at any zoom, so each row
 * becomes its own card with the column headings printed beside the values. The
 * views do not know this happens - `Row` reads the headings from context and
 * hands each `Cell` its own label - so a screen written once works in both
 * shapes and cannot drift out of step with itself.
 *
 * A row given a `detail` opens. That is what keeps the table narrow: the
 * columns carry only what somebody scans down a list for, and everything else -
 * the timestamps, the note, the receipt, the whole row as stored - waits one
 * click away instead of being cut from the product or crushed into a column
 * nobody can read.
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
                  className="whitespace-nowrap border-b border-rim px-3 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-faint"
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

export function Row({ children, detail }: { children: ReactNode; detail?: ReactNode }) {
  const head = useContext(HeadContext);
  const [open, setOpen] = useState(false);
  const opens = detail !== undefined;

  const cells = Children.map(children, (child, i) =>
    isValidElement(child)
      ? cloneElement(child as ReactElement<{ label?: ReactNode }>, { label: head[i] })
      : child,
  );

  return (
    <>
      <tr
        onClick={opens ? () => setOpen((was) => !was) : undefined}
        className={[
          'transition-colors',
          opens ? 'cursor-pointer hover:bg-go/[0.06]' : 'hover:bg-go/[0.04]',
          // As a card on a phone.
          'max-lg:block max-lg:border max-lg:border-rim-soft max-lg:bg-sheet-solid max-lg:p-3.5',
          open ? 'max-lg:rounded-t-card bg-go/[0.05]' : 'max-lg:rounded-card',
        ].join(' ')}
      >
        {cells}

        {opens && (
          <td className="w-10 border-b border-rim-soft px-2 py-3 align-middle max-lg:hidden">
            <Chevron open={open} />
          </td>
        )}

        {/* The phone card says so in words: a chevron alone in the corner of a
            card is not an obvious offer, and the row is already tappable. */}
        {opens && (
          <td className="hidden max-lg:mt-2 max-lg:flex max-lg:items-center max-lg:justify-center max-lg:gap-1.5 max-lg:border-t max-lg:border-rim-soft max-lg:pt-2.5 max-lg:text-[12px] max-lg:font-semibold max-lg:text-ink-muted">
            {open ? 'Yopish' : 'Batafsil'}
            <Chevron open={open} />
          </td>
        )}
      </tr>

      {opens && (
        <tr
          className={[
            'max-lg:block',
            open ? 'max-lg:-mt-2.5 max-lg:rounded-b-card max-lg:border max-lg:border-t-0 max-lg:border-rim-soft max-lg:bg-sheet-solid' : '',
          ].join(' ')}
        >
          <td colSpan={head.length + 1} className="border-0 p-0 max-lg:block">
            {/*
              Opened with a grid track rather than a max-height.
              `grid-template-rows: 0fr -> 1fr` animates to the content's real
              height, so it works for a two-line note and for a screenful of
              JSON without anybody having to guess a number that is wrong for
              one of them.
            */}
            <div
              className={
                'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
                (open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')
              }
            >
              <div className="overflow-hidden">
                <div className="border-b border-rim-soft bg-go/[0.04] px-3 py-4 max-lg:border-0 max-lg:bg-transparent max-lg:px-3.5">
                  {detail}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={
        'h-4 w-4 shrink-0 text-ink-faint transition-transform duration-300 ' +
        (open ? 'rotate-180' : '')
      }
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

/**
 * A label and its value inside an opened row.
 *
 * Two columns on anything but the narrowest screen, so a stack of them lines up
 * into something readable rather than a ragged list of sentences.
 */
export function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-4">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint sm:w-44 sm:shrink-0 sm:pt-0.5">
        {label}
      </span>
      <span className="min-w-0 break-words text-[13px]">{children}</span>
    </div>
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
