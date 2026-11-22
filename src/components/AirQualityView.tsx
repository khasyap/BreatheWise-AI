import React, { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MapPin, RefreshCw } from 'lucide-react';
import { getSeverityVisuals, POLLUTANT_LABELS } from '../lib/aqiStandards';
import { AirQualityTrends } from './AirQualityTrends';
import { YearOverYearComparison } from './YearOverYearComparison';
import type { ResolvedTheme } from '../lib/theme';
import type { AirQualityPayload, PollutantReadings } from '../types/breathewise';

interface AirQualityViewProps {
  airData: AirQualityPayload | null;
  loading: boolean;
  resolvedTheme: ResolvedTheme;
  onRefresh: () => Promise<void>;
  onOpenLocationModal: () => void;
}

const CPCB_SCALE_ROWS = [
  { band: '0 – 50', label: 'Good', impact: 'Minimal health impact.' },
  { band: '51 – 100', label: 'Satisfactory', impact: 'Minor breathing discomfort to sensitive people.' },
  { band: '101 – 200', label: 'Moderately Polluted', impact: 'Discomfort for people with asthma, lungs, or heart conditions.' },
  { band: '201 – 300', label: 'Poor', impact: 'Breathing discomfort to most people on prolonged exposure.' },
  { band: '301 – 400', label: 'Very Poor', impact: 'Respiratory illness risk on prolonged exposure; avoid outdoor exercise.' },
  { band: '401 – 500', label: 'Severe', impact: 'Affects healthy people and seriously impacts those with existing conditions.' },
];

const EPA_SCALE_ROWS = [
  { band: '0 – 50', label: 'Good', impact: 'Little or no air pollution risk.' },
  { band: '51 – 100', label: 'Moderate', impact: 'Acceptable; unusually sensitive people should watch symptoms.' },
  { band: '101 – 150', label: 'Unhealthy for Sensitive Groups', impact: 'Children, older adults, and sensitive groups should limit exertion.' },
  { band: '151 – 200', label: 'Unhealthy', impact: 'Everyone may begin to experience health effects.' },
  { band: '201 – 300', label: 'Very Unhealthy', impact: 'Health alert: increased risk for everyone.' },
  { band: '301 – 500', label: 'Hazardous', impact: 'Emergency conditions affecting the entire population.' },
];

export const AirQualityView: React.FC<AirQualityViewProps> = ({
  airData,
  loading,
  resolvedTheme,
  onRefresh,
  onOpenLocationModal,
}) => {
  const [chartTab, setChartTab] = useState<'history24h' | 'forecast24h'>('history24h');
  const [sectionTab, setSectionTab] = useState<'all' | 'trends' | 'yoy'>('all');
  const isDark = resolvedTheme === 'dark';

  if (!airData) {
    return <p className="text-sm text-[#546860]">Loading environmental telemetry...</p>;
  }

  const visuals = getSeverityVisuals(airData.severityTier);
  const scaleRows = airData.standard === 'CPCB_IN' ? CPCB_SCALE_ROWS : EPA_SCALE_ROWS;
  const locationKey = `${airData.location.latitude.toFixed(2)}_${airData.location.longitude.toFixed(2)}_${airData.location.countryCode}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8E4] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-[#546860]">
            {airData.standardLabel} · {airData.stationInfo}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#13231D]">
            Air Quality Diagnostics — {airData.location.name}
          </h1>
          <p className="mt-1 text-sm text-[#4A5D55]">{airData.dataQualityNote}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#D4DDD7] bg-white px-3.5 py-2 text-sm font-medium text-[#13231D] hover:bg-[#F3F8F5]"
          >
            <MapPin className="h-4 w-4 text-[#165B43]" />
            <span>Switch Location</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#165B43] px-4 py-2 text-sm font-medium text-white hover:bg-[#114835] disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Update Readings</span>
          </button>
        </div>
      </div>

      {/* Air Quality Section View Switcher */}
      <div
        className="inline-flex flex-wrap rounded-lg bg-[#E9EFEA] p-1 dark:bg-[#14221C]"
        role="tablist"
        aria-label="Air quality diagnostics views"
      >
        {(
          [
            ['all', 'All Diagnostics'],
            ['trends', '7-Day Trends'],
            ['yoy', 'Year-over-Year'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            data-testid={`aq-section-tab-${id}`}
            aria-selected={sectionTab === id}
            onClick={() => setSectionTab(id)}
            className={`whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
              sectionTab === id
                ? 'bg-white text-[#13231D] shadow-xs dark:bg-[#21382F] dark:text-white'
                : 'text-[#546860] hover:text-[#13231D] dark:text-[#8CA69A] dark:hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dedicated 7-Day Historical Air Quality Trends Module */}
      {(sectionTab === 'all' || sectionTab === 'trends') && (
        <AirQualityTrends
          daily7d={airData.daily7d}
          standard={airData.standard}
          standardLabel={airData.standardLabel}
          locationName={airData.location.name}
          resolvedTheme={resolvedTheme}
        />
      )}

      {/* Year-over-Year Monthly AQI Comparison Module */}
      {(sectionTab === 'all' || sectionTab === 'yoy') && (
        <YearOverYearComparison
          locationKey={locationKey}
          locationName={airData.location.name}
          resolvedTheme={resolvedTheme}
        />
      )}

      {/* Pollutant Concentration Table / Grid */}
      {sectionTab === 'all' && (
      <section className="rounded-xl border border-[#DCE3DE] bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4">
          <h2 className="text-base font-semibold text-[#13231D]">Measured Pollutants &amp; Sub-Indices</h2>
          <p className="text-xs text-[#5E726A]">
            Primary driver: <span className="font-semibold text-[#13231D]">{airData.primaryPollutant}</span>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(POLLUTANT_LABELS) as Array<keyof PollutantReadings>).map((key) => {
            const meta = POLLUTANT_LABELS[key];
            const val = airData.pollutants[key];
            const sub = airData.subIndices[key];
            const isPrimary = airData.primaryPollutantCode === key;
            return (
              <div
                key={key}
                className={`rounded-lg border p-4 ${
                  isPrimary ? 'border-[#165B43] bg-[#F3F9F6]' : 'border-[#E6ECE8] bg-[#FAFBFA]'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-sm font-semibold text-[#13231D]">{meta.formula}</span>
                  <span className="text-[11px] text-[#5E726A]">
                    {isPrimary ? 'Primary driver' : sub !== undefined ? `Sub-index ${sub}` : 'No reading'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#546860]">{meta.name}</p>
                <p className="mt-3 font-mono text-2xl font-semibold text-[#13231D] tabular-nums">
                  {val !== null ? `${val}` : '—'}{' '}
                  <span className="text-xs font-normal text-[#5E726A]">{meta.unit}</span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#5E726A]">{meta.description}</p>
              </div>
            );
          })}
        </div>
      </section>
      )}

      {/* Hourly Trajectory: Past 24h Observed & Next 24h Forecast */}
      {sectionTab === 'all' && (
      <section className="rounded-xl border border-[#DCE3DE] bg-white p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-[#EEF2EF] pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-[#13231D]">Hourly Pollution Trajectory</h2>
            <p className="text-xs text-[#5E726A]">
              Compare hour-by-hour AQI and PM2.5 concentrations across the past 24 hours and next 24-hour forecast.
            </p>
          </div>
          <div className="inline-flex rounded-lg bg-[#F1F5F2] p-1" role="tablist" aria-label="Hourly air quality timeframe">
            {(
              [
                ['history24h', 'Past 24 Hours'],
                ['forecast24h', 'Next 24h Forecast'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={chartTab === id}
                onClick={() => setChartTab(id)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  chartTab === id ? 'bg-white text-[#13231D] shadow-sm' : 'text-[#546860] hover:text-[#13231D]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartTab === 'history24h' ? airData.hourly24h : airData.hourlyForecast24h}
              margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#20332B' : '#E8EDE9'} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: isDark ? '#8EA89C' : '#5E726A' }} tickLine={false} axisLine={false} minTickGap={22} />
              <YAxis tick={{ fontSize: 11, fill: isDark ? '#8EA89C' : '#5E726A' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#13211B' : '#FFFFFF',
                  borderColor: isDark ? '#2A4239' : '#D4DDD7',
                  color: isDark ? '#ECF4F0' : '#13231D',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
              <Line type="monotone" dataKey="aqi" name="AQI" stroke={visuals.barColor} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="pm25" name="PM2.5 (µg/m³)" stroke={isDark ? '#34D399' : '#165B43'} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      )}

      {/* Meteorology & Standard Scale Reference */}
      {sectionTab === 'all' && (
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-5">
          <h2 className="text-base font-semibold text-[#13231D]">Meteorology &amp; Dispersion Factors</h2>
          <dl className="mt-4 divide-y divide-[#EEF2EF] text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-[#5E726A]">Temperature</dt>
              <dd className="font-mono font-medium text-[#13231D] tabular-nums">
                {airData.weather.temperatureC !== null ? `${airData.weather.temperatureC} °C` : '—'}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[#5E726A]">Relative Humidity</dt>
              <dd className="font-mono font-medium text-[#13231D] tabular-nums">
                {airData.weather.humidityPct !== null ? `${airData.weather.humidityPct}%` : '—'}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[#5E726A]">Wind Speed &amp; Direction</dt>
              <dd className="font-mono font-medium text-[#13231D] tabular-nums">
                {airData.weather.windSpeedKmh !== null
                  ? `${airData.weather.windSpeedKmh} km/h (${airData.weather.windDirectionLabel})`
                  : '—'}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[#5E726A]">Surface Pressure</dt>
              <dd className="font-mono font-medium text-[#13231D] tabular-nums">
                {airData.weather.surfacePressureHpa !== null ? `${airData.weather.surfacePressureHpa} hPa` : '—'}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[#5E726A]">Winter Inversion Risk</dt>
              <dd className="font-semibold capitalize text-[#13231D]">{airData.weather.inversionRisk}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-[#4A5D55]">{airData.weather.inversionReason}</p>
        </div>

        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-7">
          <h2 className="text-base font-semibold text-[#13231D]">
            Active Standard Reference — {airData.standardLabel}
          </h2>
          <p className="mt-1 text-xs text-[#5E726A]">
            BreatheWise AI strictly separates regional AQI standards and never mixes CPCB India and US EPA scales.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8E4] text-[#546860]">
                  <th className="py-2 pr-3 font-medium">AQI Range</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 font-medium">Official Health Implication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EF]">
                {scaleRows.map((row) => (
                  <tr key={row.band} className={airData.category === row.label ? 'bg-[#F2F8F5] font-medium' : ''}>
                    <td className="py-2.5 pr-3 font-mono text-[#13231D] tabular-nums">{row.band}</td>
                    <td className="py-2.5 pr-3 text-[#13231D]">{row.label}</td>
                    <td className="py-2.5 text-[#4A5D55]">{row.impact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      )}
    </div>
  );
};
