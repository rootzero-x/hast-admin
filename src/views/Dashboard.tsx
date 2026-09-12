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

      {data.signups_14d.length > 0 && <Signups rows={data.signups_14d} />}
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Fourteen days of sign-ups, drawn rather than charted.
 *
 * No chart library. Fourteen points need a shape, a scale and a date - not
 * 90 KB of bundle, a loading state and a theme to fight with. The whole figure
 * is one SVG with a fixed viewBox scaled to its container, so it stays sharp on
 * any screen and costs nothing to render.
 *
 * The line is straight between points on purpose. Smoothing a daily count into
 * a curve invents values for the hours in between and flatters a spike into a
 * gentle hill: the shape would be prettier and less true.
 */
function Signups({ rows }: { rows: { day: string; n: number }[] }) {
  const points = rows.map((row) => ({ day: row.day, value: Number(row.n) || 0 }));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const peak = Math.max(...points.map((point) => point.value), 0);

  // The axis stops at a round number above the peak, so the gridlines read as
  // 0 / 4 / 8 rather than 0 / 3.5 / 7.
  const ceiling = niceCeiling(peak);

  const W = 720;
  const H = 210;
  const padL = 38;
  const padR = 12;
  const padT = 16;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const floor = padT + plotH;

  const xAt = (index: number): number =>
    points.length < 2 ? padL + plotW / 2 : padL + (index / (points.length - 1)) * plotW;

  const yAt = (value: number): number => padT + (1 - value / ceiling) * plotH;

  const line = points
    .map((point, i) => (i === 0 ? 'M' : 'L') + xAt(i) + ' ' + yAt(point.value))
    .join(' ');

  const area =
    line + ' L' + xAt(points.length - 1) + ' ' + floor + ' L' + xAt(0) + ' ' + floor + ' Z';

  // Enough labels to place the eye, never so many that they collide - counted
  // back from the last day rather than forward from the first, so the most
  // recent date is always the one written down. On a chart called "the last
  // fourteen days" that is the date the reader came to check.
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const labelled = (i: number): boolean => (points.length - 1 - i) % labelEvery === 0;

  return (
    <section className="plate p-5">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h3 className="text-[15px] font-bold">Soʻnggi 14 kun</h3>
        <p className="text-[12.5px] text-ink-muted">
          <span className="font-mono font-bold text-ink">{total}</span> ta yangi foydalanuvchi
          <span className="mx-2 text-ink-faint">·</span>
          kuniga oʻrtacha{' '}
          <span className="font-mono font-bold text-ink">{(total / points.length).toFixed(1)}</span>
        </p>
      </header>

      {/*
        The figure has a floor width and scrolls below it.

        An SVG with a fixed viewBox scales its text along with everything else,
        so on a narrow screen the dates shrink to a grey smudge - the chart
        looks fine and can no longer be read. Letting the card scroll keeps the
        type at a legible size instead of politely destroying it.
      */}
      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          viewBox={'0 0 ' + W + ' ' + H}
          className="w-full min-w-[640px]"
          role="img"
          aria-label={
            'Soʻnggi ' +
            points.length +
            ' kunda ' +
            total +
            ' ta yangi foydalanuvchi. Eng yuqori kunlik koʻrsatkich ' +
            peak +
            '.'
          }
        >
          <defs>
            <linearGradient id="signups-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#35C27A" stopOpacity="0.30" />
              <stop offset="1" stopColor="#35C27A" stopOpacity="0" />
            </linearGradient>
          </defs>
  
          {/* Gridlines and their values. Three is enough to read a scale from. */}
          {[0, 0.5, 1].map((fraction) => {
            const value = Math.round(ceiling * fraction);
            const y = yAt(value);
  
            return (
              <g key={fraction}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="1"
                  shapeRendering="crispEdges"
                />
                <text
                  x={padL - 9}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-ink-faint font-mono"
                  fontSize="11"
                >
                  {value}
                </text>
              </g>
            );
          })}
  
          <path d={area} fill="url(#signups-fill)" />
          <path
            d={line}
            fill="none"
            stroke="#35C27A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
  
          {points.map((point, i) => (
            <g key={point.day}>
              {/* The dot marks the reading; the title is the tooltip, with no
                  JavaScript and no state to get out of step with the data. */}
              <circle
                cx={xAt(i)}
                cy={yAt(point.value)}
                r={peak > 0 && point.value === peak ? 4 : 2.5}
                fill={peak > 0 && point.value === peak ? '#35C27A' : '#23262D'}
                stroke="#35C27A"
                strokeWidth="2"
              >
                <title>{fullDay(point.day) + ' — ' + point.value}</title>
              </circle>
  
              {labelled(i) && (
                <text
                  x={xAt(i)}
                  y={H - 9}
                  textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
                  className="fill-ink-faint font-mono"
                  fontSize="11"
                >
                  {shortDay(point.day)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

/** 7 -> 8, 23 -> 25, 140 -> 150: a round top for the axis, never below the peak. */
function niceCeiling(peak: number): number {
  if (peak <= 4) return 4;

  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const step = magnitude / 2;

  return Math.ceil(peak / step) * step;
}

/** `2026-09-12` becomes `12.09`; anything unexpected passes through untouched. */
function shortDay(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);

  return match ? match[3] + '.' + match[2] : day;
}

/** The same date spelled out, for the tooltip where there is room. */
function fullDay(day: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);

  return match ? match[3] + '.' + match[2] + '.' + match[1] : day;
}
