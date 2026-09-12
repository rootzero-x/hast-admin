/**
 * The record of what the panel has done.
 *
 * Every write from the browser, every decision taken through the bot, and every
 * invitation claimed, each with the row before and after. It is the thing that
 * turns root access into something that can be explained afterwards — and the
 * reason an administrator can be given real power without it being a gamble.
 */

import { useEffect, useState } from 'react';

import { api } from '../api';
import { Screen } from '../App';
import type { AuditEntry, Pagination } from '../types';
import { Button, Cell, Code, Detail, Empty, Loading, Row, Table, when } from '../ui';

function pretty(json: string | null): string {
  if (!json) return '—';

  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export function Audit() {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [meta, setMeta] = useState<Pagination | null>(null);

  useEffect(() => {
    setRows(null);

    api<AuditEntry[]>('/admin/audit', { query: { page, per_page: 50 } })
      .then((payload) => {
        setRows(payload.data);
        setMeta(payload.meta as unknown as Pagination);
      })
      .catch(() => setRows([]));
  }, [page]);

  return (
    <Screen title="Audit">
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>Hozircha yozuv yoʻq</Empty>
      ) : (
        <>
          <Table head={['Qachon', 'Kim', 'Amal', 'Nima']}>
            {rows.map((entry) => (
              <Row
                key={entry.id}
                detail={
                  <>
                    <Detail label="Kim">
                      {entry.admin_name ?? '—'}
                      {entry.admin_email ? ' · ' + entry.admin_email : ''}
                      {entry.user_id ? ' · #' + entry.user_id : ''}
                    </Detail>
                    <Detail label="IP manzil">
                      <span className="font-mono">{entry.ip ?? '—'}</span>
                    </Detail>
                    <Detail label="Oldin">
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-card border border-rim-soft bg-white p-3 font-mono text-[11.5px]">
                        {pretty(entry.before_json)}
                      </pre>
                    </Detail>
                    <Detail label="Keyin">
                      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-card border border-rim-soft bg-white p-3 font-mono text-[11.5px]">
                        {pretty(entry.after_json)}
                      </pre>
                    </Detail>
                  </>
                }
              >
                <Cell className="text-ink-faint">{when(entry.created_at)}</Cell>
                <Cell>{entry.admin_name ?? entry.admin_email ?? '—'}</Cell>
                <Cell>
                  <Code>{entry.action}</Code>
                </Cell>
                <Cell>
                  <span className="font-mono text-xs text-ink-faint">
                    {entry.entity}
                    {entry.entity_id ? `#${entry.entity_id}` : ''}
                  </span>
                </Cell>
              </Row>
            ))}
          </Table>

          {meta && meta.last_page > 1 && (
            <div className="mt-5 flex items-center gap-2.5 text-[13px]">
              <Button tone="quiet" small disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Oldingi
              </Button>
              <span className="text-ink-faint">
                {meta.page} / {meta.last_page} ({meta.total})
              </span>
              <Button tone="quiet" small disabled={!meta.has_more} onClick={() => setPage(page + 1)}>
                Keyingi
              </Button>
            </div>
          )}
        </>
      )}

    </Screen>
  );
}
