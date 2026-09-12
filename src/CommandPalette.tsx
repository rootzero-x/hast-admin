/**
 * Ctrl-K: go anywhere, without the mouse.
 *
 * The panel is a tool somebody works in for an hour at a time, moving between
 * the payment queue, a user's row and the audit log. Making that a journey
 * through a sidebar costs a second every time and, worse, costs attention. One
 * key and three letters is the difference between a console and a website.
 *
 * It lists only what the signed-in administrator may actually reach: the parent
 * filters the commands by permission before handing them over, so the palette
 * can never advertise a page that answers 403. That check is a courtesy, not a
 * control - the server decides, as always.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

export interface Command {
  id: string;
  label: string;
  /** Where it lives, shown greyed on the right. */
  group: string;
  run: () => void;
}

const OPEN_EVENT = 'hast:command-palette';

/**
 * Opens the palette from anywhere.
 *
 * Sent as an event rather than by lifting the open state into the shell: the
 * palette owns a keyboard listener, a query, a cursor and a focus dance, and
 * none of that is the shell's business just because a button needs to say
 * "Ctrl-K" out loud for the people who would never guess it.
 */
export function openCommandPalette(): void {
  document.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // The global shortcut. Bound to the document rather than a wrapper element so
  // it works no matter what has focus, including inside a dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const combo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';

      if (combo) {
        event.preventDefault();
        setOpen((was) => !was);
        return;
      }

      if (event.key === 'Escape') setOpen(false);
    };

    const onAsked = () => setOpen(true);

    document.addEventListener('keydown', onKey);
    document.addEventListener(OPEN_EVENT, onAsked);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener(OPEN_EVENT, onAsked);
    };
  }, []);

  // Opening resets the search. Reopening onto last time's half-typed query, and
  // a selection that no longer means anything, is its own small annoyance.
  useEffect(() => {
    if (!open) return;

    setQuery('');
    setCursor(0);

    // The input mounts with the palette, so focus has to wait a frame.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle === '') return commands;

    return commands.filter(
      (command) =>
        command.label.toLowerCase().includes(needle) ||
        command.group.toLowerCase().includes(needle),
    );
  }, [commands, query]);

  if (!open) return null;

  const choose = (command: Command | undefined) => {
    if (command === undefined) return;
    setOpen(false);
    command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((at) => (matches.length === 0 ? 0 : (at + 1) % matches.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((at) => (matches.length === 0 ? 0 : (at - 1 + matches.length) % matches.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(matches[cursor]);
    }
  };

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex justify-center bg-black/65 px-4 pt-[12vh] backdrop-blur-[2px]"
      onMouseDown={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="animate-pop h-fit w-full max-w-[540px] overflow-hidden rounded-soft border border-edge-bright bg-panel shadow-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Buyruqlar"
      >
        <div className="flex items-center gap-2.5 border-b border-edge px-4">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Qidirish yoki buyruq…"
            className="w-full bg-transparent py-3.5 text-[14px] text-ink outline-none placeholder:text-ink-faint"
            aria-label="Buyruq qidirish"
          />
        </div>

        <div className="max-h-[min(52vh,380px)] overflow-y-auto p-1.5">
          {matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-ink-faint">Hech narsa topilmadi</p>
          ) : (
            matches.map((command, i) => (
              <button
                key={command.id}
                type="button"
                onMouseEnter={() => setCursor(i)}
                onClick={() => choose(command)}
                className={
                  'flex w-full items-center justify-between gap-4 rounded-soft-sm px-3 py-2.5 text-left text-[13.5px] transition-colors ' +
                  (i === cursor ? 'bg-panel-lift text-ink' : 'text-ink-muted')
                }
              >
                <span className="truncate">{command.label}</span>
                <span className="shrink-0 text-[11.5px] text-ink-faint">{command.group}</span>
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-edge px-4 py-2.5 text-[11.5px] text-ink-faint">
          <Hint keys={['↑', '↓']}>tanlash</Hint>
          <Hint keys={['↵']}>ochish</Hint>
          <Hint keys={['Esc']}>yopish</Hint>
        </div>
      </div>
    </div>
  );
}

function Hint({ keys, children }: { keys: string[]; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((key) => (
        <kbd key={key} className="kbd">
          {key}
        </kbd>
      ))}
      {children}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      className="h-4 w-4 shrink-0 text-ink-faint"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.2 13.2 3 3" strokeLinecap="round" />
    </svg>
  );
}
