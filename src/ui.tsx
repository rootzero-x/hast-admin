/**
 * The pieces the panel is assembled from.
 *
 * Kept together because a flat interface only holds together if every surface
 * agrees: the same step in lightness, the same one-pixel edge, the same radii.
 * Scatter these across twenty files and within a week three buttons will look
 * subtly different and nobody will be able to say which is right.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

type Tone = 'go' | 'quiet' | 'danger';

const TONE: Record<Tone, string> = {
  // One filled button per dialog, and it is the one that commits. When every
  // button is an outline the eye has to read all of them to find the action,
  // which is exactly the moment - approving money - where it should not have
  // to. `quiet` is the default for everything that is not the commit, and
  // `danger` earns colour without a fill because rejecting is destructive and
  // should never be the easiest thing to hit.
  go: 'bg-go text-[#07130D] border-go hover:bg-[#43D189] hover:border-[#43D189]',
  quiet: 'bg-panel-lift text-ink border-edge hover:border-edge-bright hover:bg-[#22262E]',
  danger: 'bg-panel-lift text-stop border-edge hover:border-stop/45 hover:bg-stop/10',
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
        'select-none border font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-go/40',
        small ? 'rounded-soft-sm px-3 py-1.5 text-[12.5px]' : 'rounded-soft-sm px-4 py-2.5 text-sm',
        off
          ? 'cursor-default border-edge-soft bg-panel-lift text-ink-faint'
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
  return <div className={`surface-sm p-5 ${className}`}>{children}</div>;
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
        'rounded-soft border bg-panel px-4 py-3.5 ' +
        // A queue with something in it is the only thing on this screen that
        // is asking for work, so it is the only thing allowed to use colour.
        (alert ? 'border-stop/35 bg-stop/[0.06]' : 'border-edge')
      }
    >
      <div
        className={
          'font-mono text-[24px] font-extrabold leading-none tracking-tight ' +
          (alert ? 'text-stop' : 'text-ink')
        }
      >
        {value}
      </div>
      <div className="mt-1.5 text-[11.5px] font-medium text-ink-muted">{label}</div>
    </div>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <div className="well mb-5 p-3.5 text-[12.5px] text-warn">{children}</div>;
}

export function Tag({ children, tone }: { children: ReactNode; tone: Tone | 'flat' | 'warn' }) {
  const colour =
    tone === 'go'
      ? 'border-go/35 bg-go/10 text-go'
      : tone === 'danger'
        ? 'border-stop/35 bg-stop/10 text-stop'
        : tone === 'warn'
          ? 'border-warn/35 bg-warn/10 text-warn'
          : 'border-edge bg-panel-lift text-ink-muted';

  return (
    <span
      className={
        'inline-block whitespace-nowrap rounded-full border px-2 py-[2px] text-[11px] font-semibold ' +
        colour
      }
    >
      {children}
    </span>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-edge bg-panel-lift px-1.5 py-0.5 font-mono text-xs">
      {children}
    </code>
  );
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One hairline per row, and nothing else.
 *
 * No card, no border around each row, no zebra stripe. Fifty framed rows in a
 * column is a quilt, not a table; a single rule between them is what keeps a
 * payment queue scannable, and legibility wins over decoration wherever the two
 * disagree. The only interactive dressing is a barely-there row highlight, so
 * the eye can follow a long row across to its buttons.
 */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {head.map((cell, i) => (
              <th
                key={i}
                className="whitespace-nowrap border-b border-hair px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-faint"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="transition-colors hover:bg-white/[0.022]">{children}</tr>;
}

export function Cell({
  children,
  className = '',
  numeric = false,
}: {
  children: ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <td
      className={`border-b border-hair px-3 py-2.5 align-top ${
        numeric ? 'whitespace-nowrap text-right font-mono' : ''
      } ${className}`}
    >
      {children}
    </td>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                     */
/* -------------------------------------------------------------------------- */

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-14 text-center text-ink-muted">{children}</div>;
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
    window.setTimeout(() => {
      setToasts((all) => all.filter((t) => t.id !== id));
    }, bad ? 5000 : 2600);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-7 z-50 flex flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`surface px-5 py-3 text-[13px] ${toast.bad ? 'text-stop' : 'text-ink'}`}
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
 * The browser then handles the focus trap, Escape, inertness of the page behind
 * it and the backdrop - four things that are easy to reimplement badly and that
 * an administrator confirming a payment genuinely relies on.
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
      className="max-w-[min(92vw,580px)] rounded-soft border border-edge-bright bg-panel p-0 text-ink shadow-sheet backdrop:animate-fade"
    >
      <div className="p-6">
        <h3 className="mb-3.5 text-[15px] font-bold">{title}</h3>
        {children}
      </div>
      <div className="flex justify-end gap-2.5 px-6 pb-5">
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
