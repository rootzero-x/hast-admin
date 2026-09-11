/**
 * What needs a person, and how the month is going.
 *
 * Two jobs in one screen, in that order. The queues come first because they are
 * the reason anybody opens the panel; the totals are context, not work.
 */

import { useEffect, useState } from 'react';

import { api } from '../api';
import { Screen } from '../App';
import type { Dashboard as DashboardData } from '../types';
import { Empty, Loading, Stat, money } from '../ui';

export function Dashboard({
  onCounts,
}: {
  onCounts: (counts: { payments: number; reports: number }) => void;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api<DashboardData>('/admin/dashboard')
      .then(({ data: d }) => {
        setData(d);
        onCounts({ payments: d.queues.payments, reports: d.queues.reports });
      })
      .catch(() => setFailed(true));
  }, [onCounts]);

  if (failed) {
    return (
      <Screen title="Boshqaruv">
        <Empty>Maʼlumotni yuklab boʻlmadi</Empty>
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen title="Boshqaruv">
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen title="Boshqaruv">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat value={data.queues.payments} label="Tekshiruvdagi toʻlov" alert={data.queues.payments > 0} />
        <Stat value={data.queues.reports} label="Ochiq shikoyat" alert={data.queues.reports > 0} />
        <Stat value={data.totals.users} label="Foydalanuvchi" />
        <Stat value={data.totals.listings} label="Faol eʼlon" />
        <Stat value={data.totals.roommates} label="Sherik eʼloni" />
        <Stat value={data.totals.subscribed} label="Obunachi" />
      </div>

      <h3 className="mb-3 text-[15px] font-bold">Tushum</h3>
      <div className="mb-7 grid gap-4 sm:grid-cols-2">
        <Stat value={<span className="text-[19px]">{money(data.revenue.this_month)}</span>} label="Shu oy" />
        <Stat value={<span className="text-[19px]">{money(data.revenue.all_time)}</span>} label="Jami" />
      </div>

      {data.signups_14d.length > 0 && (
        <>
          <h3 className="mb-3 text-[15px] font-bold">Soʻnggi 14 kun</h3>
          <Signups rows={data.signups_14d} />
        </>
      )}
    </Screen>
  );
}

/**
 * Bars rather than a chart library.
 *
 * Fourteen numbers do not need an axis, a legend or a tooltip - they need to be
 * comparable at a glance, which a row of bars does with no dependency and no
 * loading state. The number is printed beside each bar so the reader never has
 * to estimate one from its length.
 */
function Signups({ rows }: { rows: { day: string; n: number }[] }) {
  const peak = Math.max(1, ...rows.map((row) => Number(row.n)));

  return (
    <div className="space-y-1.5">
      {rows.map((row) => {
        const value = Number(row.n);
        const width = Math.round((value / peak) * 100);

        return (
          <div key={row.day} className="flex items-center gap-3 text-[12.5px]">
            <span className="w-[92px] shrink-0 font-mono text-ink-muted">{row.day}</span>
            <span className="w-8 shrink-0 text-right font-mono font-bold">{value}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full shadow-press-sm">
              <span
                className="block h-full rounded-full bg-go"
                style={{ width: `${Math.max(value > 0 ? 3 : 0, width)}%` }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}
