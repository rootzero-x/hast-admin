/**
 * Complaints waiting on a judgement.
 *
 * Two outcomes, phrased as what actually happens rather than as jargon:
 * "Arxivlash" takes the listing out of the feed and tells its owner why;
 * "Asossiz" closes the complaint and leaves the listing alone.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiError, api } from '../api';
import { Screen } from '../App';
import type { Report } from '../types';
import { Button, Cell, Empty, Loading, Row, Table, useToast, when } from '../ui';

const REASONS: Record<string, string> = {
  fake: 'Soxta eʼlon',
  rented: 'Allaqachon berilgan',
  wrong_price: 'Narx notoʻgʻri',
  agent_posing_as_owner: 'Makler oʻzini egasi deb koʻrsatgan',
  spam: 'Spam',
  offensive: 'Haqoratli',
  duplicate: 'Takroriy',
  other: 'Boshqa',
};

export function Reports({ can }: { can: (permission: string) => boolean }) {
  const [rows, setRows] = useState<Report[] | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    setRows(null);

    api<Report[]>('/admin/reports')
      .then(({ data }) => setRows(data))
      .catch((e) => {
        setRows([]);
        toast(e instanceof ApiError ? e.message : 'Yuklab boʻlmadi', true);
      });
  }, [toast]);

  useEffect(load, [load]);

  const resolve = async (report: Report, resolution: string, action: string) => {
    setBusy(report.id);

    try {
      await api(`/admin/reports/${report.id}/resolve`, {
        method: 'POST',
        body: { resolution, action },
      });

      toast(action === 'archive' ? 'Eʼlon arxivlandi' : 'Yopildi');
      load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Bajarilmadi', true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen title="Shikoyatlar">
      {rows === null ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Empty>Shikoyat yoʻq</Empty>
      ) : (
        <Table head={['#', 'Sabab', 'Nima haqida', 'Kim', 'Qachon', '']}>
          {rows.map((report) => (
            <Row key={report.id}>
              <Cell>
                <span className="font-mono text-xs">#{report.id}</span>
              </Cell>
              <Cell>{REASONS[report.reason] ?? report.reason}</Cell>
              <Cell>
                <div>
                  {(report.subject?.title as string | undefined) ??
                    `${report.entity_type} #${report.entity_id}`}
                </div>
                {report.comment && <div className="text-ink-faint">{report.comment}</div>}
              </Cell>
              <Cell className="text-ink-faint">{report.reporter?.name ?? '—'}</Cell>
              <Cell className="text-ink-faint">{when(report.created_at)}</Cell>
              <Cell>
                {can('reports.resolve') && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      tone="danger"
                      small
                      busy={busy === report.id}
                      onClick={() => void resolve(report, 'resolved', 'archive')}
                    >
                      Arxivlash
                    </Button>
                    <Button
                      tone="quiet"
                      small
                      busy={busy === report.id}
                      onClick={() => void resolve(report, 'dismissed', 'none')}
                    >
                      Asossiz
                    </Button>
                  </div>
                )}
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </Screen>
  );
}
