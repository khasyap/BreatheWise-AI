import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowRight, ArrowUpRight, RefreshCw } from 'lucide-react';
import {
  analyzeSevenDayTrends,
  computeTrendYAxisScale,
  getAqiCategoryBands,
  getPm10CategoryBands,
  getPm25CategoryBands,
  type AqiCategoryBand,
  type EnrichedDailyTrendPoint,
} from '../lib/aqiTrends';
import type { ResolvedTheme } from '../lib/theme';
import { api, type AirQualityTrendsResponse } from '../services/api';
import type { AqiStandardId, DailyAqiPoint } from '../types/breathewise';

type TrendMetricMode = 'all' | 'aqi' | 'pm25' | 'pm10';

interface AirQualityTrendsProps {
  daily7d?: DailyAqiPoint[];
  standard?: AqiStandardId;
  standardLabel?: string;
  locationName?: string;
  resolvedTheme?: ResolvedTheme;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: EnrichedDailyTrendPoint }>;
  metricMode: TrendMetricMode;
  standardLabel: string;
}

interface BandLabelRenderProps {
  viewBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

function createBandLabelRenderer(band: AqiCategoryBand, isDark: boolean) {
  return function BandLabel({ viewBox }: BandLabelRenderProps) {
    if (!viewBox) return null;
    const x = viewBox.x ?? 0;
    const y = viewBox.y ?? 0;
    const width = viewBox.width ?? 0;
    const height = viewBox.height ?? 0;
    const absHeight = Math.abs(height);
    if (absHeight < 14 || width <= 0) return null;
    const centerY = (height >= 0 ? y : y + height) + absHeight / 2;

    return (
      <text
        x={x + width + 10}
        y={centerY}
        dy={3.5}
        textAnchor="start"
        fill={isDark ? band.darkLabelColor : band.labelColor}
        fontSize={10.5}
        fontWeight={600}
      >
        {`${band.label}: ${band.rangeLabel}`}
      </text>
    );
  };
}

const TrendTooltip: React.FC<CustomTooltipProps> = ({ active, payload, metricMode, standardLabel }) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0].payload;

  const formatUg = (v: number | null | undefined, unit = 'µg/m³') =>
    typeof v === 'number' ? `${v.toFixed(1)} ${unit}` : '—';

  return (
    <div
      data-testid="air-quality-trends-tooltip"
      className="min-w-[252px] rounded-xl border border-[#CBD6CE] bg-white p-3.5 text-xs shadow-lg dark:border-[#2A4239] dark:bg-[#13211B] dark:shadow-black/40"
    >
      {/* Specific Date (MMM DD) & AQI Value */}
      <div className="border-b border-[#EEF2EF] pb-2.5 dark:border-[#20342C]">
        <p
          data-testid="tooltip-date"
          className="font-mono text-xs font-semibold text-[#13231D] tabular-nums dark:text-[#EDF5F1]"
        >
          {pt.formattedDate}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-white">
              {pt.avgAqi ?? '—'}
            </span>
            <span className="text-[11px] text-[#5E726A] dark:text-[#8CA69A]">AQI avg</span>
          </div>
          <span className={`font-semibold ${pt.textColor}`}>{pt.category}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-[#6B7E76] dark:text-[#86A094]">
          {standardLabel}
          {pt.maxAqi !== null && pt.minAqi !== null ? (
            <span className="font-mono tabular-nums">
              {' '}
              · Peak {pt.maxAqi} / Low {pt.minAqi}
            </span>
          ) : null}
        </p>
      </div>

      {/* Primary Pollutant Concentration */}
      <div
        data-testid="tooltip-primary-pollutant"
        className="mt-2.5 rounded-lg border border-[#DCE8E1] bg-[#F4F9F6] px-2.5 py-2 dark:border-[#244337] dark:bg-[#142D24]"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-medium text-[#4A5D55] dark:text-[#A9C2B6]">Primary Pollutant</span>
          <span className="font-mono text-xs font-semibold text-[#165B43] tabular-nums dark:text-[#4ADE80]">
            {pt.primaryPollutantCode
              ? `${pt.primaryPollutantFormula} · ${formatUg(pt.primaryPollutantConcentration, pt.primaryPollutantUnit)}`
              : 'Unavailable'}
          </span>
        </div>
        {pt.primaryPollutantCode ? (
          <p className="mt-0.5 text-[11px] text-[#5E726A] dark:text-[#86A094]">{pt.primaryPollutantName}</p>
        ) : null}
      </div>

      {/* Daily Mean Pollutant Concentrations */}
      <div className="pt-2.5">
        <p className="mb-1.5 text-[11px] font-medium text-[#546860] dark:text-[#9BB5A9]">Daily Mean Breakdown</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono tabular-nums">
          <div
            className={
              pt.primaryPollutantCode === 'pm25' || metricMode === 'pm25' || metricMode === 'all'
                ? 'text-[#165B43] dark:text-[#4ADE80]'
                : 'text-[#13231D] dark:text-[#E6F1EC]'
            }
          >
            <dt className="font-sans text-[11px] text-[#5E726A] dark:text-[#849E92]">PM2.5</dt>
            <dd className={pt.primaryPollutantCode === 'pm25' || metricMode === 'pm25' ? 'font-semibold' : 'font-medium'}>
              {formatUg(pt.avgPm25)}
            </dd>
          </div>
          <div
            className={
              pt.primaryPollutantCode === 'pm10' || metricMode === 'pm10' || metricMode === 'all'
                ? 'text-[#0369A1] dark:text-[#38BDF8]'
                : 'text-[#13231D] dark:text-[#E6F1EC]'
            }
          >
            <dt className="font-sans text-[11px] text-[#5E726A] dark:text-[#849E92]">PM10</dt>
            <dd className={pt.primaryPollutantCode === 'pm10' || metricMode === 'pm10' ? 'font-semibold' : 'font-medium'}>
              {formatUg(pt.avgPm10)}
            </dd>
          </div>
          <div className={pt.primaryPollutantCode === 'no2' ? 'text-[#165B43] dark:text-[#4ADE80]' : 'text-[#13231D] dark:text-[#E6F1EC]'}>
            <dt className="font-sans text-[11px] text-[#5E726A] dark:text-[#849E92]">NO₂</dt>
            <dd className={pt.primaryPollutantCode === 'no2' ? 'font-semibold' : 'font-medium'}>
              {formatUg(pt.avgNo2)}
            </dd>
          </div>
          <div className={pt.primaryPollutantCode === 'o3' ? 'text-[#165B43] dark:text-[#4ADE80]' : 'text-[#13231D] dark:text-[#E6F1EC]'}>
            <dt className="font-sans text-[11px] text-[#5E726A] dark:text-[#849E92]">O₃</dt>
            <dd className={pt.primaryPollutantCode === 'o3' ? 'font-semibold' : 'font-medium'}>
              {formatUg(pt.avgO3)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export const AirQualityTrends: React.FC<AirQualityTrendsProps> = ({
  daily7d: propDaily7d,
  standard: propStandard,
  standardLabel: propStandardLabel,
  locationName: propLocationName,
  resolvedTheme = 'light',
}) => {
  const [metricMode, setMetricMode] = useState<TrendMetricMode>('all');
  const [visibleSeries, setVisibleSeries] = useState({ aqi: true, pm25: true, pm10: true });
  const [fetchedData, setFetchedData] = useState<AirQualityTrendsResponse | null>(null);
  const [fetching, setFetching] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const isDark = resolvedTheme === 'dark';

  const loadTrends = useCallback(async (forceRefresh = false) => {
    setFetching(true);
    setFetchError(null);
    try {
      const data = await api.getAirQualityTrends(forceRefresh);
      setFetchedData(data);
    } catch (err: any) {
      setFetchError(err?.message || 'Unable to fetch 7-day air quality trends right now.');
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (propDaily7d === undefined) {
      loadTrends(false);
    }
  }, [propDaily7d, loadTrends]);

  useEffect(() => {
    if (propDaily7d !== undefined) {
      setFetchedData(null);
      setFetchError(null);
    }
  }, [propDaily7d, propLocationName]);

  function handleToggleSeries(seriesKey: 'aqi' | 'pm25' | 'pm10') {
    setVisibleSeries((prev) => {
      const next = { ...prev, [seriesKey]: !prev[seriesKey] };
      // Ensure at least one series remains active
      if (!next.aqi && !next.pm25 && !next.pm10) {
        return prev;
      }
      return next;
    });
  }

  const daily7d = fetchedData?.daily7d ?? propDaily7d ?? [];
  const standard: AqiStandardId = fetchedData?.standard ?? propStandard ?? 'CPCB_IN';
  const standardLabel =
    fetchedData?.standardLabel ??
    propStandardLabel ??
    (standard === 'CPCB_IN' ? 'CPCB India NAQI (0–500)' : 'US EPA AQI (0–500)');
  const locationName = fetchedData?.location.name ?? propLocationName ?? 'Primary Location';

  const analysis = useMemo(
    () => analyzeSevenDayTrends(daily7d, standard),
    [daily7d, standard],
  );

  const activeBands = useMemo(() => {
    if (metricMode === 'pm25') return getPm25CategoryBands(standard);
    if (metricMode === 'pm10') return getPm10CategoryBands(standard);
    return getAqiCategoryBands(standard);
  }, [metricMode, standard]);

  const yAxisScale = useMemo(() => {
    if (metricMode === 'all' || metricMode === 'aqi') {
      const maxAqiObserved = analysis.points.reduce<number | null>((acc, p) => {
        const candidate = metricMode === 'aqi' ? Math.max(p.avgAqi ?? 0, p.maxAqi ?? 0) : (p.avgAqi ?? 0);
        return acc === null ? candidate : Math.max(acc, candidate);
      }, null);
      return computeTrendYAxisScale(maxAqiObserved, activeBands, standard === 'CPCB_IN' ? 200 : 150);
    }

    if (metricMode === 'pm25') {
      const maxPm25Observed = analysis.points.reduce<number | null>((acc, p) => {
        if (p.avgPm25 === null) return acc;
        return acc === null ? p.avgPm25 : Math.max(acc, p.avgPm25);
      }, null);
      return computeTrendYAxisScale(maxPm25Observed, activeBands, standard === 'CPCB_IN' ? 90 : 55.4);
    }

    const maxPm10Observed = analysis.points.reduce<number | null>((acc, p) => {
      if (typeof p.avgPm10 !== 'number') return acc;
      return acc === null ? p.avgPm10 : Math.max(acc, p.avgPm10);
    }, null);
    return computeTrendYAxisScale(maxPm10Observed, activeBands, standard === 'CPCB_IN' ? 250 : 154);
  }, [analysis.points, activeBands, metricMode, standard]);

  const particulateScale = useMemo(() => {
    const maxUg = analysis.points.reduce<number>((acc, p) => {
      const pm25 = visibleSeries.pm25 && typeof p.avgPm25 === 'number' ? p.avgPm25 : 0;
      const pm10 = visibleSeries.pm10 && typeof p.avgPm10 === 'number' ? p.avgPm10 : 0;
      return Math.max(acc, pm25, pm10);
    }, 0);
    const padded = Math.max(100, Math.ceil((maxUg * 1.15) / 50) * 50);
    const step = padded <= 150 ? 50 : padded <= 300 ? 75 : 100;
    const ticks: number[] = [];
    for (let v = 0; v <= padded; v += step) {
      ticks.push(v);
    }
    if (ticks[ticks.length - 1] !== padded) {
      ticks.push(padded);
    }
    return { max: padded, ticks };
  }, [analysis.points, visibleSeries.pm25, visibleSeries.pm10]);

  const primaryThresholdY =
    metricMode === 'pm25'
      ? analysis.pm25Threshold
      : metricMode === 'pm10'
        ? analysis.pm10Threshold
        : analysis.thresholdAqi;

  const trajectoryText =
    analysis.trendDirection === 'worsening'
      ? `Worsening (+${analysis.trendDelta} AQI)`
      : analysis.trendDirection === 'improving'
        ? `Improving (${analysis.trendDelta} AQI)`
        : analysis.trendDirection === 'stable'
          ? `Steady (${analysis.trendDelta !== null && analysis.trendDelta > 0 ? `+${analysis.trendDelta}` : analysis.trendDelta ?? 0} AQI)`
          : 'Insufficient data';

  const TrajectoryIcon =
    analysis.trendDirection === 'worsening'
      ? ArrowUpRight
      : analysis.trendDirection === 'improving'
        ? ArrowDownRight
        : ArrowRight;

  const trajectoryColor =
    analysis.trendDirection === 'worsening'
      ? 'text-[#B91C1C] dark:text-[#FCA5A5]'
      : analysis.trendDirection === 'improving'
        ? 'text-[#156A3C] dark:text-[#4ADE80]'
        : 'text-[#4A5D55] dark:text-[#A9C0B5]';

  const tickColor = isDark ? '#8EA89C' : '#5E726A';
  const axisLineColor = isDark ? '#23372F' : '#DCE3DE';
  const peakLineColor = isDark ? '#E8F4EE' : '#112A22';
  const peakDotFill = isDark ? '#111C17' : '#FFFFFF';
  const pm25Color = isDark ? '#34D399' : '#165B43';
  const pm10Color = isDark ? '#38BDF8' : '#0284C7';
  const cursorColor = isDark ? '#34D399' : '#165B43';

  const hasChartData =
    analysis.points.length > 0 &&
    (analysis.sevenDayAvgAqi !== null || analysis.sevenDayAvgPm25 !== null || analysis.sevenDayAvgPm10 !== null);

  const showParticulateRightAxis = metricMode === 'all' && (visibleSeries.pm25 || visibleSeries.pm10);

  const tabs: Array<{ id: TrendMetricMode; label: string }> = [
    { id: 'all', label: 'All (AQI · PM2.5 · PM10)' },
    { id: 'aqi', label: 'AQI' },
    { id: 'pm25', label: 'PM2.5 Only' },
    { id: 'pm10', label: 'PM10 Only' },
  ];

  const legendTitle =
    standard === 'CPCB_IN'
      ? metricMode === 'pm25'
        ? 'CPCB PM2.5 Thresholds (µg/m³):'
        : metricMode === 'pm10'
          ? 'CPCB PM10 Thresholds (µg/m³):'
          : 'CPCB AQI Thresholds:'
      : metricMode === 'pm25'
        ? 'US EPA PM2.5 Thresholds (µg/m³):'
        : metricMode === 'pm10'
          ? 'US EPA PM10 Thresholds (µg/m³):'
          : 'US EPA AQI Thresholds:';

  return (
    <section
      aria-labelledby="air-quality-trends-heading"
      className="rounded-2xl border border-[#DCE3DE] bg-white p-6 shadow-xs dark:border-[#22362E] dark:bg-[#111C17]"
    >
      {/* Header, Metric Toggle & Inline Fetch Refresh */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#EEF2EF] pb-4 lg:flex-row lg:items-center dark:border-[#1D3028]">
        <div>
          <p className="text-xs text-[#5E726A] dark:text-[#86A094]">
            7-Day Historical Pattern · {locationName} · {standardLabel}
          </p>
          <h2 id="air-quality-trends-heading" className="mt-0.5 text-base font-semibold text-[#13231D] dark:text-[#EDF5F1]">
            Air Quality Trends
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex flex-wrap rounded-lg bg-[#F1F5F2] p-1 dark:bg-[#172620]"
            role="tablist"
            aria-label="7-day trend chart metric"
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                data-testid={`trends-tab-${tab.id}`}
                aria-selected={metricMode === tab.id}
                onClick={() => setMetricMode(tab.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  metricMode === tab.id
                    ? 'bg-white text-[#13231D] shadow-sm dark:bg-[#233A31] dark:text-white'
                    : 'text-[#546860] hover:text-[#13231D] dark:text-[#8CA69A] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="refresh-trends-btn"
            onClick={() => loadTrends(true)}
            disabled={fetching}
            aria-label="Refresh 7-day air quality trends"
            title="Fetch latest 7-day historical trends"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE3DE] bg-white text-[#4A5D55] transition-colors hover:bg-[#F4F7F5] hover:text-[#13231D] disabled:opacity-50 dark:border-[#243B32] dark:bg-[#15241E] dark:text-[#9BB5A9] dark:hover:bg-[#1D3129] dark:hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${fetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Inline fetch error notice */}
      {fetchError ? (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-xs text-[#991B1B] dark:border-[#5C2026] dark:bg-[#2A1417] dark:text-[#FCA5A5]"
        >
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => loadTrends(true)}
            className="shrink-0 font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Context-Aware 4-Column Granular KPI Strip (Adapts to PM2.5 / PM10 / AQI focus) */}
      {metricMode === 'pm25' ? (
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="trends-kpi-pm25">
          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">7-Day Avg PM2.5</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#165B43] tabular-nums dark:text-[#4ADE80]">
              {analysis.sevenDayAvgPm25 !== null ? `${analysis.sevenDayAvgPm25} µg/m³` : '—'}
            </p>
            <span className="text-[11px] text-[#5E726A] dark:text-[#86A094]">
              Fine particulate mean
            </span>
          </div>
          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">7-Day Peak PM2.5</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-white">
              {analysis.peakPm25Day ? `${analysis.peakPm25Day.value} µg/m³` : '—'}
            </p>
            <span className="text-[11px] text-[#5E726A] dark:text-[#86A094]">
              {analysis.peakPm25Day ? `Recorded on ${analysis.peakPm25Day.label}` : 'Unavailable'}
            </span>
          </div>
          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">Lowest PM2.5 Day</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#156A3C] tabular-nums dark:text-[#4ADE80]">
              {analysis.cleanestPm25Day ? `${analysis.cleanestPm25Day.value} µg/m³` : '—'}
            </p>
            <span className="text-[11px] text-[#5E726A] dark:text-[#86A094]">
              {analysis.cleanestPm25Day ? `${analysis.cleanestPm25Day.label} daily mean` : 'Unavailable'}
            </span>
          </div>
          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">Above {analysis.pm25Threshold} µg/m³</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-white">
              {analysis.elevatedPm25DaysCount} / {analysis.points.length} days
            </p>
            <span className="font-mono text-[11px] text-[#5E726A] tabular-nums dark:text-[#86A094]">
              {analysis.pm25ToPm10Ratio !== null
                ? `PM2.5/PM10 ratio: ${analysis.pm25ToPm10Ratio}`
                : 'Regional threshold'}
            </span>
          </div>
        </div>
      ) : metricMode === 'pm10' ? (
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="trends-kpi-pm10">
          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">7-Day Avg PM10</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#0284C7] tabular-nums dark:text-[#38BDF8]">
              {analysis.sevenDayAvgPm10 !== null ? `${analysis.sevenDayAvgPm10} µg/m³` : '—'}
            </p>
            <span className="text-[11px] text-[#5E726A] dark:text-[#86A094]">
              Coarse particulate mean
            </span>
          </div>
          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">7-Day Peak PM10</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-white">
              {analysis.peakPm10Day ? `${analysis.peakPm10Day.value} µg/m³` : '—'}
            </p>
            <span className="text-[11px] text-[#5E726A] dark:text-[#86A094]">
              {analysis.peakPm10Day ? `Recorded on ${analysis.peakPm10Day.label}` : 'Unavailable'}
            </span>
          </div>
          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">Lowest PM10 Day</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#156A3C] tabular-nums dark:text-[#4ADE80]">
              {analysis.cleanestPm10Day ? `${analysis.cleanestPm10Day.value} µg/m³` : '—'}
            </p>
            <span className="text-[11px] text-[#5E726A] dark:text-[#86A094]">
              {analysis.cleanestPm10Day ? `${analysis.cleanestPm10Day.label} daily mean` : 'Unavailable'}
            </span>
          </div>
          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">Above {analysis.pm10Threshold} µg/m³</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-white">
              {analysis.elevatedPm10DaysCount} / {analysis.points.length} days
            </p>
            <span className="font-mono text-[11px] text-[#5E726A] tabular-nums dark:text-[#86A094]">
              {analysis.pm25ToPm10Ratio !== null
                ? `PM2.5/PM10 ratio: ${analysis.pm25ToPm10Ratio}`
                : 'Regional threshold'}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">7-Day Avg AQI</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-white">
              {analysis.sevenDayAvgAqi ?? '—'}
            </p>
            <span className="block font-mono text-[11px] text-[#5E726A] tabular-nums dark:text-[#86A094]">
              {analysis.sevenDayAvgPm25 !== null || analysis.sevenDayAvgPm10 !== null
                ? `PM2.5 ${analysis.sevenDayAvgPm25 ?? '—'} · PM10 ${analysis.sevenDayAvgPm10 ?? '—'} µg/m³`
                : 'No particulate data'}
            </span>
          </div>

          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">7-Day Peak AQI</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-white">
              {analysis.peakDay ? analysis.peakDay.maxAqi : '—'}
            </p>
            <span className="text-[11px] text-[#5E726A] dark:text-[#86A094]">
              {analysis.peakDay ? `Recorded on ${analysis.peakDay.label}` : 'Unavailable'}
            </span>
          </div>

          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">Cleanest Day</span>
            <p className="mt-1 font-mono text-xl font-semibold text-[#156A3C] tabular-nums dark:text-[#4ADE80]">
              {analysis.cleanestDay ? analysis.cleanestDay.avgAqi : '—'}
            </p>
            <span className="text-[11px] text-[#5E726A] dark:text-[#86A094]">
              {analysis.cleanestDay ? `${analysis.cleanestDay.label} daily avg` : 'Unavailable'}
            </span>
          </div>

          <div className="rounded-xl border border-transparent bg-[#F7F9F7] px-4 py-3 dark:border-[#1E3129] dark:bg-[#15241E]">
            <span className="block text-xs text-[#5E726A] dark:text-[#86A094]">Weekly Trajectory</span>
            <p className={`mt-1 inline-flex items-center gap-1 font-mono text-sm font-semibold tabular-nums ${trajectoryColor}`}>
              <TrajectoryIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{trajectoryText}</span>
            </p>
            <span className="block text-[11px] text-[#5E726A] dark:text-[#86A094]">
              {analysis.elevatedDaysCount} of {analysis.points.length} days above threshold
            </span>
          </div>
        </div>
      )}

      {/* Independent Series Visibility Toggles for Combined Chart */}
      {metricMode === 'all' && hasChartData && (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs"
          aria-label="Toggle individual chart series"
        >
          <span className="text-[#5E726A] dark:text-[#8CA69A]">
            Toggle series independently on chart:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="toggle-series-aqi"
              aria-pressed={visibleSeries.aqi}
              onClick={() => handleToggleSeries('aqi')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                visibleSeries.aqi
                  ? 'border-[#D97706]/50 bg-[#FFFBEB] text-[#9A4B06] dark:border-[#FBBF24]/40 dark:bg-[#291F0D] dark:text-[#FBBF24]'
                  : 'border-[#DCE3DE] bg-white text-[#7A8E86] line-through dark:border-[#22362E] dark:bg-[#15241E] dark:text-[#667D73]'
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-xs bg-[#D97706]/65 dark:bg-[#FBBF24]/70" aria-hidden="true" />
              <span>AQI Bars</span>
            </button>
            <button
              type="button"
              data-testid="toggle-series-pm25"
              aria-pressed={visibleSeries.pm25}
              onClick={() => handleToggleSeries('pm25')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                visibleSeries.pm25
                  ? 'border-[#165B43]/50 bg-[#F1F8F4] text-[#165B43] dark:border-[#34D399]/40 dark:bg-[#122D23] dark:text-[#4ADE80]'
                  : 'border-[#DCE3DE] bg-white text-[#7A8E86] line-through dark:border-[#22362E] dark:bg-[#15241E] dark:text-[#667D73]'
              }`}
            >
              <span className="h-0.5 w-3 bg-[#165B43] dark:bg-[#34D399]" aria-hidden="true" />
              <span>PM2.5 (µg/m³)</span>
            </button>
            <button
              type="button"
              data-testid="toggle-series-pm10"
              aria-pressed={visibleSeries.pm10}
              onClick={() => handleToggleSeries('pm10')}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                visibleSeries.pm10
                  ? 'border-[#0284C7]/50 bg-[#F0F9FF] text-[#0369A1] dark:border-[#38BDF8]/40 dark:bg-[#112634] dark:text-[#38BDF8]'
                  : 'border-[#DCE3DE] bg-white text-[#7A8E86] line-through dark:border-[#22362E] dark:bg-[#15241E] dark:text-[#667D73]'
              }`}
            >
              <span className="h-0.5 w-3 border-b-2 border-dashed border-[#0284C7] dark:border-[#38BDF8]" aria-hidden="true" />
              <span>PM10 (µg/m³)</span>
            </button>
          </div>
        </div>
      )}

      {/* Recharts 7-Day Historical Visualization with Color-Coded Category Threshold Lines & Areas */}
      <div className="mt-4 h-80 w-full" data-testid="air-quality-trends-chart">
        {fetching && !hasChartData ? (
          <div className="flex h-full items-center justify-center rounded-xl bg-[#F7F9F7] px-6 text-sm text-[#5E726A] dark:bg-[#15241E] dark:text-[#8CA69A]">
            Loading 7-day historical air quality data for {locationName}...
          </div>
        ) : hasChartData ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={analysis.points}
              margin={
                showParticulateRightAxis
                  ? { top: 14, right: 8, left: -8, bottom: 4 }
                  : { top: 14, right: 146, left: -8, bottom: 4 }
              }
            >
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: tickColor }}
                tickLine={false}
                axisLine={{ stroke: axisLineColor }}
              />
              <YAxis
                yAxisId="primary"
                tick={{ fontSize: 11, fill: tickColor }}
                tickLine={false}
                axisLine={false}
                domain={[0, yAxisScale.max]}
                ticks={yAxisScale.ticks}
                allowDataOverflow={false}
              />

              {showParticulateRightAxis ? (
                <YAxis
                  yAxisId="ug"
                  orientation="right"
                  width={54}
                  tick={{ fontSize: 11, fill: tickColor }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, particulateScale.max]}
                  ticks={particulateScale.ticks}
                  tickFormatter={(v) => `${v}`}
                  label={{
                    value: 'µg/m³',
                    angle: 90,
                    position: 'insideRight',
                    offset: 6,
                    fill: tickColor,
                    fontSize: 10.5,
                    fontWeight: 500,
                  }}
                />
              ) : null}

              {/* Color-coded category zones */}
              {yAxisScale.visibleBands.map((band) => (
                <ReferenceArea
                  key={`band-${band.id}`}
                  yAxisId="primary"
                  y1={band.min}
                  y2={Math.min(band.max, yAxisScale.max)}
                  fill={band.fill}
                  fillOpacity={isDark ? band.darkFillOpacity : band.fillOpacity}
                  strokeOpacity={0}
                  ifOverflow="hidden"
                  label={showParticulateRightAxis ? undefined : createBandLabelRenderer(band, isDark)}
                />
              ))}

              {/* Horizontal threshold lines spanning the full chart background for each category ceiling */}
              {yAxisScale.visibleBands.map((band) => {
                const lineY = Math.min(band.max, yAxisScale.max);
                const isPrimaryThreshold = lineY === primaryThresholdY;
                return (
                  <ReferenceLine
                    key={`threshold-${band.id}`}
                    yAxisId="primary"
                    y={lineY}
                    stroke={isDark ? band.darkStroke : band.stroke}
                    strokeOpacity={isPrimaryThreshold ? (isDark ? 0.85 : 0.78) : (isDark ? 0.48 : 0.42)}
                    strokeWidth={isPrimaryThreshold ? 1.5 : 1}
                    strokeDasharray={isPrimaryThreshold ? '5 3' : '3 4'}
                  />
                );
              })}

              <Tooltip
                cursor={{ fill: cursorColor, fillOpacity: isDark ? 0.09 : 0.06 }}
                content={<TrendTooltip metricMode={metricMode} standardLabel={standardLabel} />}
              />

              {metricMode === 'all' ? (
                <>
                  {visibleSeries.aqi && (
                    <Bar
                      yAxisId="primary"
                      dataKey="avgAqi"
                      name="Daily Avg AQI"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={38}
                      isAnimationActive={false}
                    >
                      {analysis.points.map((entry) => (
                        <Cell key={entry.date} fill={entry.barColor} fillOpacity={isDark ? 0.42 : 0.34} />
                      ))}
                    </Bar>
                  )}
                  {visibleSeries.pm25 && (
                    <Line
                      yAxisId="ug"
                      type="monotone"
                      dataKey="avgPm25"
                      name="PM2.5 (µg/m³)"
                      stroke={pm25Color}
                      strokeWidth={2.5}
                      isAnimationActive={false}
                      dot={{ r: 3.5, fill: peakDotFill, stroke: pm25Color, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                  {visibleSeries.pm10 && (
                    <Line
                      yAxisId="ug"
                      type="monotone"
                      dataKey="avgPm10"
                      name="PM10 (µg/m³)"
                      stroke={pm10Color}
                      strokeWidth={2.25}
                      strokeDasharray="5 3"
                      isAnimationActive={false}
                      dot={{ r: 3.5, fill: peakDotFill, stroke: pm10Color, strokeWidth: 2 }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                </>
              ) : metricMode === 'aqi' ? (
                <>
                  <Bar
                    yAxisId="primary"
                    dataKey="avgAqi"
                    name="Daily Avg AQI"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={42}
                    isAnimationActive={false}
                  >
                    {analysis.points.map((entry) => (
                      <Cell key={entry.date} fill={entry.barColor} fillOpacity={isDark ? 0.9 : 0.92} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="primary"
                    type="monotone"
                    dataKey="maxAqi"
                    name="Daily Peak AQI"
                    stroke={peakLineColor}
                    strokeWidth={2.25}
                    isAnimationActive={false}
                    dot={{ r: 3.5, fill: peakDotFill, stroke: peakLineColor, strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </>
              ) : metricMode === 'pm25' ? (
                <>
                  <Bar
                    yAxisId="primary"
                    dataKey="avgPm25"
                    name="Daily Mean PM2.5 (µg/m³)"
                    fill={pm25Color}
                    fillOpacity={isDark ? 0.36 : 0.28}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={42}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="primary"
                    type="monotone"
                    dataKey="avgPm25"
                    name="PM2.5 Trend"
                    stroke={pm25Color}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                    dot={{ r: 4, fill: peakDotFill, stroke: pm25Color, strokeWidth: 2 }}
                    activeDot={{ r: 5.5 }}
                  />
                </>
              ) : (
                <>
                  <Bar
                    yAxisId="primary"
                    dataKey="avgPm10"
                    name="Daily Mean PM10 (µg/m³)"
                    fill={pm10Color}
                    fillOpacity={isDark ? 0.36 : 0.28}
                    radius={[5, 5, 0, 0]}
                    maxBarSize={42}
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="primary"
                    type="monotone"
                    dataKey="avgPm10"
                    name="PM10 Trend"
                    stroke={pm10Color}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                    dot={{ r: 4, fill: peakDotFill, stroke: pm10Color, strokeWidth: 2 }}
                    activeDot={{ r: 5.5 }}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl bg-[#F7F9F7] px-6 text-center text-sm text-[#5E726A] dark:bg-[#15241E] dark:text-[#8CA69A]">
            7-day historical air quality data is currently unavailable for {locationName}. BreatheWise AI never fabricates historical measurements.
          </div>
        )}
      </div>

      {/* Category Scale Key */}
      <div
        data-testid="aqi-category-bands-legend"
        className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[#F1F5F2] pt-3 text-[11px] text-[#546860] dark:border-[#1B2D26] dark:text-[#9BB5A9]"
      >
        <span className="font-medium text-[#13231D] dark:text-[#EDF5F1]">{legendTitle}</span>
        {activeBands.map((band) => (
          <span key={`legend-${band.id}`} className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-xs border ${band.swatchClass}`}
              aria-hidden="true"
            />
            <span className="font-medium text-[#2A3D36] dark:text-[#DCEAE3]">{band.label}</span>
            <span className="font-mono text-[#6B7E76] tabular-nums dark:text-[#86A094]">{band.rangeLabel}</span>
          </span>
        ))}
      </div>

      {/* Legend & Factual Pattern Summary */}
      <div className="mt-3 flex flex-col justify-between gap-2 border-t border-[#EEF2EF] pt-3.5 text-xs text-[#4A5D55] sm:flex-row sm:items-center dark:border-[#1D3028] dark:text-[#A9C0B5]">
        <p className="leading-relaxed">
          <span className="font-semibold text-[#13231D] dark:text-[#EDF5F1]">Pattern insight:</span> {analysis.patternInsight}
        </p>
        <div className="flex flex-wrap shrink-0 items-center gap-4 text-[11px] text-[#5E726A] dark:text-[#8CA69A]">
          {metricMode === 'all' ? (
            <>
              {visibleSeries.aqi && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-xs bg-[#D97706]/55 dark:bg-[#FBBF24]/55" aria-hidden="true" />
                  Bars: AQI (Left)
                </span>
              )}
              {visibleSeries.pm25 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 bg-[#165B43] dark:bg-[#34D399]" aria-hidden="true" />
                  Solid: PM2.5 (µg/m³)
                </span>
              )}
              {visibleSeries.pm10 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-3.5 border-b-2 border-dashed border-[#0284C7] dark:border-[#38BDF8]" aria-hidden="true" />
                  Dashed: PM10 (µg/m³)
                </span>
              )}
            </>
          ) : metricMode === 'aqi' ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-[#165B43] dark:bg-[#22A074]" aria-hidden="true" />
                Bars: Daily Avg
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-3.5 bg-[#112A22] dark:bg-[#E8F4EE]" aria-hidden="true" />
                Line: Daily Peak
              </span>
            </>
          ) : metricMode === 'pm25' ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 bg-[#165B43] dark:bg-[#34D399]" aria-hidden="true" />
              PM2.5 Daily Mean &amp; Trend (µg/m³)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 bg-[#0284C7] dark:bg-[#38BDF8]" aria-hidden="true" />
              PM10 Daily Mean &amp; Trend (µg/m³)
            </span>
          )}
        </div>
      </div>
    </section>
  );
};
