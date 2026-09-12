/**
 * Root access to the data, in three screens: the tables, a page of rows, a row.
 *
 * Two things are worth knowing before reading further.
 *
 * **The server decides what is visible.** Tables holding private conversations
 * need a separate grant and are simply absent from the list without it — this
 * file does no filtering of its own, because a filter here would be a promise
 * the interface cannot keep.
 *
 * **Every write is recorded** with the row before and after. That is said out
 * loud on the screen as card, because an administrator who knows their edits
 * are attributable makes different, better decisions.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ApiError, api } from '../api';
import { Screen } from '../App';
import type { ColumnInfo, Pagination, TableInfo } from '../types';
import { Button, Cell, Code, Dialog, Empty, Loading, Notice, Row, Table, useToast } from '../ui';

/* -------------------------------------------------------------------------- */

export function Tables() {
  const [rows, setRows] = useState<TableInfo[] | null>(null);

  useEffect(() => {
    api<TableInfo[]>('/admin/tables')
      .then(({ data }) => setRows(data))
      .catch(() => setRows([]));
  }, []);

  return (
    <Screen title="Jadvallar">
      <Notice>
        Bu yerdagi har bir oʻzgarish audit jurnaliga yoziladi. Shaxsiy yozishmalar
        alohida ruxsat talab qiladi va usiz roʻyxatda koʻrinmaydi.
      </Notice>

      {rows === null ? (
        <Loading />
      ) : (
        <Table head={['Jadval', 'Nomi', 'Satrlar']}>
          {rows.map((table) => (
            <Row key={table.name}>
              <Cell>
                <Link to={`/tables/${table.name}`} className="text-link hover:underline">
                  {table.label}
                </Link>
              </Cell>
              <Cell>
                <Code>{table.name}</Code>
              </Cell>
              <Cell numeric>{table.rows}</Cell>
            </Row>
          ))}
        </Table>
      )}
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

export function TableRows() {
  const { table = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1);
  const query = params.get('q') ?? '';

  const [search, setSearch] = useState(query);
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [meta, setMeta] = useState<Pagination | null>(null);

  useEffect(() => {
    setRows(null);

    api<Record<string, unknown>[]>(`/admin/tables/${table}`, {
      query: { page, per_page: 25, q: query || undefined },
    })
      .then((payload) => {
        setRows(payload.data);
        setColumns(((payload.meta?.columns ?? []) as ColumnInfo[]) ?? []);
        setMeta(payload.meta as unknown as Pagination);
      })
      .catch(() => setRows([]));
  }, [table, page, query]);

  // A wide table at full width is unreadable, so the list shows the first few
  // columns and the row screen shows everything.
  const shown = columns.slice(0, 7);
  const key = columns.find((column) => column.key === 'PRI')?.name;

  return (
    <Screen
      title={table}
      actions={
        <>
          <input
            value={search}
            placeholder="Qidirish…"
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') setParams({ q: search, page: '1' });
            }}
            className="field w-auto font-sans"
          />
          <Link to="/tables" className="text-[13px] text-link hover:underline">
            Ortga
          </Link>
        </>
      }
    >
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>Satr yoʻq</Empty>
      ) : (
        <>
          <Table head={[...shown.map((column) => column.name), '']}>
            {rows.map((row, index) => (
              <Row key={String(key ? row[key] : index)}>
                {shown.map((column) => {
                  const value = row[column.name];
                  const text = value === null || value === undefined ? '—' : String(value);

                  return (
                    <Cell key={column.name}>
                      <span title={text.length > 60 ? text : undefined}>
                        {text.length > 60 ? `${text.slice(0, 60)}…` : text}
                      </span>
                    </Cell>
                  );
                })}
                <Cell>
                  {key && (
                    <Link
                      to={`/tables/${table}/row/${encodeURIComponent(String(row[key]))}`}
                      className="text-link hover:underline"
                    >
                      Ochish
                    </Link>
                  )}
                </Cell>
              </Row>
            ))}
          </Table>

          {meta && meta.last_page > 1 && (
            <div className="mt-5 flex items-center gap-2.5 text-[13px]">
              <Button
                tone="quiet"
                small
                disabled={meta.page <= 1}
                onClick={() => setParams({ q: query, page: String(meta.page - 1) })}
              >
                Oldingi
              </Button>
              <span className="text-ink-faint">
                {meta.page} / {meta.last_page} ({meta.total})
              </span>
              <Button
                tone="quiet"
                small
                disabled={!meta.has_more}
                onClick={() => setParams({ q: query, page: String(meta.page + 1) })}
              >
                Keyingi
              </Button>
            </div>
          )}
        </>
      )}
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

export function TableRow({ can }: { can: (permission: string) => boolean }) {
  const { table = '', id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(() => {
    api<{ row: Record<string, unknown>; columns: ColumnInfo[] }>(
      `/admin/tables/${table}/${encodeURIComponent(id)}`,
    )
      .then(({ data }) => {
        setRow(data.row);
        setColumns(data.columns);
        setValues(
          Object.fromEntries(
            data.columns.map((column) => [
              column.name,
              data.row[column.name] === null || data.row[column.name] === undefined
                ? ''
                : String(data.row[column.name]),
            ]),
          ),
        );
      })
      .catch((e) => toast(e instanceof ApiError ? e.message : 'Yuklab boʻlmadi', true));
  }, [table, id, toast]);

  useEffect(load, [load]);

  if (!row) {
    return (
      <Screen title={`${table} — ${id}`}>
        <Loading />
      </Screen>
    );
  }

  const key = columns.find((column) => column.key === 'PRI')?.name;

  const save = async () => {
    // Only what actually changed is sent. Posting every field back would
    // overwrite anything another administrator edited while this page was open.
    const changed: Record<string, string> = {};

    for (const column of columns) {
      if (column.name === key) continue;

      const was = row[column.name];
      const now = values[column.name] ?? '';

      if (String(was === null || was === undefined ? '' : was) !== now) {
        changed[column.name] = now;
      }
    }

    if (Object.keys(changed).length === 0) {
      toast('Oʻzgarish yoʻq');
      return;
    }

    setBusy(true);

    try {
      await api(`/admin/tables/${table}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: { values: changed },
      });

      toast('Saqlandi');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Saqlanmadi', true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);

    try {
      await api(`/admin/tables/${table}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      toast('Oʻchirildi');
      navigate(`/tables/${table}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Oʻchirilmadi', true);
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <Screen
      title={`${table} — ${id}`}
      actions={
        <Link to={`/tables/${table}`} className="text-[13px] text-link hover:underline">
          Ortga
        </Link>
      }
    >
      <div className="grid max-w-[820px] items-center gap-3 md:grid-cols-[186px_1fr]">
        {columns.map((column) => {
          const value = values[column.name] ?? '';
          const long = value.length > 80;

          return (
            <div key={column.name} className="contents">
              <label title={column.type} className="text-[12.5px] text-ink-muted">
                {column.name}
              </label>
              {long ? (
                <textarea
                  value={value}
                  disabled={column.name === key}
                  onChange={(event) =>
                    setValues((all) => ({ ...all, [column.name]: event.target.value }))
                  }
                  className="field min-h-24 resize-y font-mono disabled:text-ink-faint"
                />
              ) : (
                <input
                  value={value}
                  disabled={column.name === key}
                  onChange={(event) =>
                    setValues((all) => ({ ...all, [column.name]: event.target.value }))
                  }
                  className="field font-mono disabled:text-ink-faint"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {can('tables.edit') && (
          <Button small busy={busy} onClick={() => void save()}>
            Saqlash
          </Button>
        )}
        {can('tables.delete') && (
          <Button tone="danger" small onClick={() => setConfirming(true)}>
            Oʻchirish
          </Button>
        )}
      </div>

      {confirming && (
        <Dialog
          title="Satrni oʻchirish"
          onClose={() => setConfirming(false)}
          actions={
            <Button tone="danger" small busy={busy} onClick={() => void remove()}>
              Oʻchirish
            </Button>
          }
        >
          <p className="text-[13px] text-ink-muted">
            Bu satr butunlay oʻchadi va unga bogʻliq maʼlumot ham ketishi mumkin.
            Qaytarib boʻlmaydi.
          </p>
        </Dialog>
      )}
    </Screen>
  );
}
