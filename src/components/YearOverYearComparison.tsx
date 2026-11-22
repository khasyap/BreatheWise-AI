import React, { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarRange, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { ResolvedTheme } from '../lib/theme';
import type { YearOverYearPayload, YearOverYearPoint, YearOverYearWeeklyBucket } from '../types/breathewise';

interface YearOverYearComparisonProps {
  locationKey: string;
  locationName: string;
  resolvedTheme?: ResolvedTheme;
}

interface YoyBarDatum {
  label: string;
  previousVal: number | null;
  currentVal: number | null;
  raw: YearOverYearPoint | YearOverYearWeeklyBucket;
}

interface YoyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: YoyBarDatum }>;
  granularity: 'daily' | 'weekly';
  currentYear: number;
  previousYear: number;
  monthShort: string;
}

const YoyTooltip: React.FC<YoyTooltipProps> = ({
  active,
  payload,
  granularity,
  currentYear,
  previousYear,
  monthShort,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload.raw;

  if (granularity === 'weekly') {
    const wk = item as YearOverYearWeeklyBucket;
    const delta = wk.deltaAqi;
    return (
      <div
        data-testid="yoy-tooltip"
        className="min-w-[228px] rounded-xl border border-[#CBD6CE] bg-white p-3.5 text-xs shadow-lg dark:border-[#2A4239] dark:bg-[#13211B] dark:shadow-black/40"
      >
        <p className="font-mono font-semibold text-[#13231D] dark:text-[#EDF5F1]">{wk.label}</p>
        <div className="mt-2 space-y-1.5 font-mono tabular-nums">
          <div className="flex items-center justify-between gap-4">
            <span className="font-sans text-[#4A5D55] dark:text-[#9BB5A9]">{monthShort} {currentYear} avg</span>
            <span className="font-semibold text-[#165B43] dark:text-[#4ADE80]">{wk.currentAvgAqi ?? '—'} AQI</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-sans text-[#4A5D55] dark:text-[#9BB5A9]">{monthShort} {previousYear} avg</span>
            <span className="font-semibold text-[#475569] dark:text-[#CBD5E1]">{wk.previousAvgAqi ?? '—'} AQI</span>
          </div>
        </div>
        {delta !== null && (
          <p
            className={`mt-2 border-t border-[#EEF2EF] pt-2 font-mono text-[11px] font-semibold tabular-nums dark:border-[#20342C] ${
              delta < 0
                ? 'text-[#156A3C] dark:text-[#4ADE80]'
                : delta > 0
                  ? 'text-[#B91C1C] dark:text-[#FCA5A5]'
                  : 'text-[#5E726A] dark:text-[#9BB5A9]'
            }`}
          >
            {delta < 0
              ? `${delta} AQI cleaner than ${previousYear}`
              : delta > 0
                ? `+${delta} AQI higher than ${previousYear}`
                : `Same average as ${previousYear}`}
          </p>
        )}
      </div>
    );
  }

  const pt = item as YearOverYearPoint;
  const delta = pt.deltaAqi;

  return (
    <div
      data-testid="yoy-tooltip"
      className="min-w-[244px] rounded-xl border border-[#CBD6CE] bg-white p-3.5 text-xs shadow-lg dark:border-[#2A4239] dark:bg-[#13211B] dark:shadow-black/40"
    >
      <p className="font-mono font-semibold text-[#13231D] dark:text-[#EDF5F1]">
        {pt.label} · {currentYear} vs {previousYear}
      </p>
      <div className="mt-2.5 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <span className="font-semibold text-[#165B43] dark:text-[#4ADE80]">{monthShort} {currentYear}</span>
            <span className="ml-1.5 text-[11px] text-[#5E726A] dark:text-[#8CA69A]">{pt.currentCategory}</span>
          </div>
          <span className="font-mono text-sm font-semibold text-[#13231D] tabular-nums dark:text-white">
            {pt.currentAqi ?? '—'} AQI
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <span className="font-semibold text-[#475569] dark:text-[#CBD5E1]">{monthShort} {previousYear}</span>
            <span className="ml-1.5 text-[11px] text-[#5E726A] dark:text-[#8CA69A]">{pt.previousCategory}</span>
          </div>
          <span className="font-mono text-sm font-semibold text-[#475569] tabular-nums dark:text-[#CBD5E1]">
            {pt.previousAqi ?? '—'} AQI
          </span>
        </div>
      </div>

      {(pt.currentPm25 !== null || pt.previousPm25 !== null) && (
        <p className="mt-2 font-mono text-[11px] text-[#5E726A] tabular-nums dark:text-[#8CA69A]">
          PM2.5: {pt.currentPm25 !== null ? `${pt.currentPm25}` : '—'} vs{' '}
          {pt.previousPm25 !== null ? `${pt.previousPm25}` : '—'} µg/m³
        </p>
      )}

      {delta !== null && (
        <p
          className={`mt-2 border-t border-[#EEF2EF] pt-2 font-mono text-[11px] font-semibold tabular-nums dark:border-[#20342C] ${
            delta < 0
              ? 'text-[#156A3C] dark:text-[#4ADE80]'
              : delta > 0
                ? 'text-[#B91C1C] dark:text-[#FCA5A5]'
                : 'text-[#5E726A] dark:text-[#9BB5A9]'
          }`}
        >
          {delta < 0
            ? `${delta} AQI lower (cleaner) vs ${previousYear}`
            : delta > 0
              ? `+${delta} AQI higher vs ${previousYear}`
              : `No change vs ${previousYear}`}
        </p>
      )}
    </div>
  );
};

export const YearOverYearComparison: React.FC<YearOverYearComparisonProps> = ({
  locationKey,
  locationName,
  resolvedTheme = 'light',
}) => {
  const [data, setData] = useState<YearOverYearPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<'daily' | 'weekly'>('daily');
  const isDark = resolvedTheme === 'dark';

  const loadComparison = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAirQualityYearOverYear(forceRefresh);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load year-over-year historical comparison.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComparison(false);
  }, [locationKey, loadComparison]);

  const tickColor = isDark ? '#8EA89C' : '#5E726A';
  const gridColor = isDark ? '#20332B' : '#E8EDE9';
  const currentBarFill = isDark ? '#34D399' : '#165B43';
  const previousBarFill = isDark ? '#4E6B60' : '#9EB1A8';
  const thresholdLineColor = isDark ? '#FBBF24' : '#D97706';

  const thresholdValue = data?.standard === 'US_EPA' ? 150 : 200;
  const thresholdCaption = data?.standard === 'US_EPA' ? 'US EPA Unhealthy (150)' : 'CPCB Poor (200)';

  const DeltaIcon =
    data?.direction === 'improved'
      ? ArrowDownRight
      : data?.direction === 'worsened'
        ? ArrowUpRight
        : ArrowRight;

  const deltaColor =
    data?.direction === 'improved'
      ? 'text-[#156A3C] dark:text-[#4ADE80]'
      : data?.direction === 'worsened'
        ? 'text-[#B91C1C] dark:text-[#FCA5A5]'
        : 'text-[#4A5D55] dark:text-[#A9C0B5]';

  const chartData: YoyBarDatum[] =
    granularity === 'daily'
      ? (data?.dailyPoints ?? []).map((p) => ({
          label: p.label,
          previousVal: p.previousAqi,
          currentVal: p.currentAqi,
          raw: p,
        }))
      : (data?.weeklyBuckets ?? []).map((w) => ({
          label: w.label,
          previousVal: w.previousAvgAqi,
          currentVal: w.currentAvgAqi,
          raw: w,
        }));

  const hasBars =
    data !== null &&
    (data.currentMonthAvgAqi !== null || data.previousMonthAvgAqi !== null) &&
    chartData.length > 0;

  return (
    <section
      aria-labelledby="yoy-comparison-heading"
      data-testid="yoy-comparison-section"
      className="rounded-2xl border border-[#DCE3DE] bg-white p-6 shadow-xs dark:border-[#22362E] dark:bg-[#111C17]"
    >
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#EEF2EF] pb-4 lg:flex-row lg:items-center dark:border-[#1D3028]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4EF] text-[#165B43] dark:bg-[#163328] dark:text-[#4ADE80]">
            <CalendarRange className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-[#5E726A] dark:text-[#86A094]">
              {data
                ? `${data.monthName} ${data.currentYear} vs ${data.monthName} ${data.previousYear} · ${data.location.name} · ${data.standardLabel}`
                : `Year-over-Year Monthly Benchmark · ${locationName}`}
            </p>
            <h2
              id="yoy-comparison-heading"
              className="mt-0.5 text-base font-semibold text-[#13231D] dark:text-[#EDF5F1]"
            >
              Year-over-Year AQI Comparison
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg bg-[#F1F5F2] p-1 dark:bg-[#172620]"
            role="tablist"
            aria-label="Year-over-Year chart grouping"
          >
            {(
              [
                ['daily', 'Daily Bars'],
                ['weekly', 'Weekly Rollup'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                data-testid={`yoy-tab-${id}`}
                aria-selected={granularity === id}
                onClick={() => setGranularity(id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  granularity === id
                    ? 'bg-white text-[#13231D] shadow-sm dark:bg-[#233A31] dark:text-white'
                    : 'text-[#546860] hover:text-[#13231D] dark:text-[#8CA69A] dark:hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="refresh-yoy-btn"
            onClick={() => loadComparison(true)}
            disabled={loading}
            aria-label="Refresh year-over-year AQI comparison"
            title="Refresh historical comparison"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3DE] bg-white text-[#4A5D55] transition-colors hover:bg-[#F4F7F5] hover:text-[#13231D] disabled:opacity-50 dark:border-[#243B32] dark:bg-[#15241E] dark:text-[#9BB5A9] dark:hover:bg-[#1D3129] dark:hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-xs text-[#991B1B] dark:border-[#5C2026] dark:bg-[#2A1417] dark:text-[#FCA5A5]"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => loadComparison(true)}
            className="shrink-0 font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* 4-Column Monthly Comparison KPI Strip */}
      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
          <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">
            {data ? `${data.monthShort} ${data.currentYear} Avg AQI` : 'Current Month Avg'}
          </span>
          <p
            data-testid="yoy-current-avg"
            className="mt-1 font-mono text-xl font-semibold text-[#165B43] tabular-nums dark:text-[#4ADE80]"
          >
            {data?.currentMonthAvgAqi ?? '—'}
          </p>
          <span className="font-mono text-[11px] text-[#5E726A] tabular-nums dark:text-[#86A094]">
            {data?.currentPeakAqi !== null && data?.currentPeakAqi !== undefined
              ? `Daily Peak: ${data.currentPeakAqi}`
              : 'Unavailable'}
          </span>
        </div>

        <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
          <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">
            {data ? `${data.monthShort} ${data.previousYear} Avg AQI` : 'Previous Year Avg'}
          </span>
          <p
            data-testid="yoy-previous-avg"
            className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-white"
          >
            {data?.previousMonthAvgAqi ?? '—'}
          </p>
          <span className="font-mono text-[11px] text-[#5E726A] tabular-nums dark:text-[#86A094]">
            {data?.previousPeakAqi !== null && data?.previousPeakAqi !== undefined
              ? `Daily Peak: ${data.previousPeakAqi}`
              : 'Unavailable'}
          </span>
        </div>

        <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
          <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">Year-over-Year Shift</span>
          <p
            data-testid="yoy-delta"
            className={`mt-1 inline-flex items-center gap-1 font-mono text-lg font-semibold tabular-nums ${deltaColor}`}
          >
            <DeltaIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {data?.avgAqiDelta !== null && data?.avgAqiDelta !== undefined
                ? `${data.avgAqiDelta > 0 ? `+${data.avgAqiDelta}` : data.avgAqiDelta} AQI`
                : '—'}
            </span>
          </p>
          <span className="block font-mono text-[11px] text-[#5E726A] tabular-nums dark:text-[#86A094]">
            {data?.avgAqiPctChange !== null && data?.avgAqiPctChange !== undefined
              ? `${data.avgAqiPctChange > 0 ? `+${data.avgAqiPctChange}` : data.avgAqiPctChange}% vs ${data.previousYear}`
              : 'Waiting for paired days'}
          </span>
        </div>

        <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
          <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">Cleaner Days vs Last Year</span>
          <p className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-white">
            {data && data.comparedDaysCount > 0
              ? `${data.betterDaysCount} / ${data.comparedDaysCount}`
              : '—'}
          </p>
          <span className="text-[11px] text-[#5E726A] dark:text-[#86A094]">
            {data && data.comparedDaysCount > 0
              ? `${data.worseDaysCount} days worse than ${data.previousYear}`
              : 'Matched days'}
          </span>
        </div>
      </div>

      {/* Grouped Bar Chart: Current Month vs Same Month Previous Year */}
      <div className="mt-5 h-80 w-full" data-testid="yoy-comparison-chart">
        {loading && !data ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-[#F7F9F7] px-6 text-sm text-[#5E726A] dark:bg-[#15241E] dark:text-[#8CA69A]">
            Fetching historical month-over-year AQI comparison for {locationName}...
          </div>
        ) : hasBars && data ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, left: -10, bottom: 4 }}
              barGap={3}
              barCategoryGap={granularity === 'daily' ? '22%' : '30%'}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: tickColor }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                interval={granularity === 'daily' ? 'preserveStartEnd' : 0}
                minTickGap={granularity === 'daily' ? 18 : 0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: tickColor }}
                tickLine={false}
                axisLine={false}
              />
              <ReferenceLine
                y={thresholdValue}
                stroke={thresholdLineColor}
                strokeDasharray="5 3"
                strokeWidth={1.25}
                label={{
                  value: thresholdCaption,
                  position: 'insideTopRight',
                  fill: thresholdLineColor,
                  fontSize: 10.5,
                  fontWeight: 600,
                }}
              />
              <Tooltip
                cursor={{ fill: isDark ? '#34D399' : '#165B43', fillOpacity: isDark ? 0.08 : 0.06 }}
                content={
                  <YoyTooltip
                    granularity={granularity}
                    currentYear={data.currentYear}
                    previousYear={data.previousYear}
                    monthShort={data.monthShort}
                  />
                }
              />
              <Bar
                dataKey="previousVal"
                name={`${data.monthShort} ${data.previousYear}`}
                fill={previousBarFill}
                radius={[4, 4, 0, 0]}
                maxBarSize={granularity === 'daily' ? 16 : 36}
                isAnimationActive={false}
              />
              <Bar
                dataKey="currentVal"
                name={`${data.monthShort} ${data.currentYear}`}
                fill={currentBarFill}
                radius={[4, 4, 0, 0]}
                maxBarSize={granularity === 'daily' ? 16 : 36}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl bg-[#F7F9F7] px-6 text-center text-sm text-[#5E726A] dark:bg-[#15241E] dark:text-[#8CA69A]">
            {data?.plainInsight || `Historical year-over-year AQI data is currently unavailable for ${locationName}.`}
          </div>
        )}
      </div>

      {/* Footer Insight, Legend & Attribution */}
      <div className="mt-4 flex flex-col justify-between gap-3 border-t border-[#EEF2EF] pt-3.5 text-xs text-[#4A5D55] sm:flex-row sm:items-center dark:border-[#1D3028] dark:text-[#A9C0B5]">
        <div>
          <p className="leading-relaxed">
            <span className="font-semibold text-[#13231D] dark:text-[#EDF5F1]">Comparison insight:</span>{' '}
            {data?.plainInsight ?? 'Loading comparison analysis...'}
          </p>
          {data && (
            <p className="mt-1 text-[11px] text-[#6B7E76] dark:text-[#86A094]">
              Source: {data.sourceAttribution} · Status: {data.dataQuality}
            </p>
          )}
        </div>

        {data && (
          <div className="flex flex-wrap shrink-0 items-center gap-4 text-[11px] text-[#5E726A] dark:text-[#8CA69A]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#9EB1A8] dark:bg-[#4E6B60]" aria-hidden="true" />
              {data.monthShort} {data.previousYear}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#165B43] dark:bg-[#34D399]" aria-hidden="true" />
              {data.monthShort} {data.currentYear}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
