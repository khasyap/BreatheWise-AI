import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getSeverityVisuals, POLLUTANT_LABELS } from '../lib/aqiStandards';
import { generateIndoorOptimizationPlan } from '../lib/indoorOptimizer';
import { getPersonalizedSustainableAlternatives } from '../lib/impactCalculator';
import type {
  AirQualityPayload,
  CommunityCampaign,
  HouseholdProfile,
  SmartAlert,
  StructuredRecommendation,
} from '../types/breathewise';
import type { AggregatedImpact } from '../lib/impactCalculator';
import type { ResolvedTheme } from '../lib/theme';
import { api } from '../services/api';
import { SevereAlertBanner } from './SevereAlertBanner';
import { DailySustainabilityGoalCard } from './DailySustainabilityGoalCard';
import { LocalWeatherCard } from './LocalWeatherCard';
import { HealthPrecautionsCard } from './HealthPrecautionsCard';

interface DashboardViewProps {
  airData: AirQualityPayload | null;
  loadingAir: boolean;
  resolvedTheme: ResolvedTheme;
  profile: HouseholdProfile;
  userName: string;
  alerts: SmartAlert[];
  severeAqiThreshold: number;
  impact: AggregatedImpact | null;
  campaigns: CommunityCampaign[];
  onRefreshAir: () => Promise<void>;
  onOpenLocationModal: () => void;
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  airData,
  loadingAir,
  resolvedTheme,
  profile,
  userName,
  alerts,
  severeAqiThreshold,
  impact,
  campaigns,
  onRefreshAir,
  onOpenLocationModal,
  onNavigate,
}) => {
  const isDark = resolvedTheme === 'dark';
  const [aiBrief, setAiBrief] = useState<{
    summary: string;
    recommendations: StructuredRecommendation[];
    safetyDisclaimer: string;
  } | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  async function handleGenerateBrief() {
    setLoadingBrief(true);
    setBriefError(null);
    try {
      const res = await api.getAiDailyBrief();
      setAiBrief(res.brief);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : 'Unable to fetch AI brief right now.');
    } finally {
      setLoadingBrief(false);
    }
  }

  if (loadingAir && !airData) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-16 animate-pulse rounded-xl bg-[#E7ECE8]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-64 animate-pulse rounded-xl bg-[#E7ECE8] lg:col-span-5" />
          <div className="h-64 animate-pulse rounded-xl bg-[#E7ECE8] lg:col-span-7" />
        </div>
      </div>
    );
  }

  const visuals = getSeverityVisuals(airData?.severityTier ?? 'moderate');
  const indoorPlan = airData
    ? generateIndoorOptimizationPlan(profile.indoorProfile, profile.budgetTier, airData.aqi, airData.hourlyForecast24h)
    : null;
  const topAlternatives = getPersonalizedSustainableAlternatives(profile, airData?.aqi ?? null).slice(0, 3);
  const chartData = (airData?.hourly24h ?? []).map((pt) => ({
    time: pt.label,
    aqi: pt.aqi ?? 0,
    pm25: pt.pm25 ?? 0,
  }));

  const unreadAlerts = alerts.filter((a) => !a.isRead);
  const currencySym = profile.currency === 'INR' ? '₹' : '$';

  return (
    <div className="space-y-8">
      {/* Real-Time Severe AQI Alert Banner (only shown when current AQI > severeAqiThreshold) */}
      <SevereAlertBanner
        airData={airData}
        severeAqiThreshold={severeAqiThreshold}
        profile={profile}
        onNavigate={onNavigate}
      />

      {/* Top Contextual Greeting & Location Bar */}
      <section className="flex flex-col justify-between gap-4 border-b border-[#E2E8E4] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-[#546860]">
            {todayLabel} · {airData?.standardLabel ?? 'Loading standard'} · Data status:{' '}
            <span className="font-medium text-[#13231D]">{airData?.dataQuality ?? 'connecting'}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#13231D] md:text-3xl">
            {greeting}, {userName}
          </h1>
          <p className="mt-1 text-sm text-[#4A5D55]">
            Personalized for a {profile.householdSize}-person household
            {profile.hasChildren ? ' with children' : ''}
            {profile.hasElderly ? ', elderly members' : ''}
            {profile.hasRespiratorySensitivity ? ', and respiratory care' : ''}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#D4DDD7] bg-white px-3.5 py-2 text-sm font-medium text-[#13231D] transition-colors hover:border-[#165B43] hover:bg-[#F3F8F5]"
          >
            <MapPin className="h-4 w-4 text-[#165B43]" />
            <span>
              {airData ? `${airData.location.name}, ${airData.location.countryCode}` : 'Select location'}
            </span>
          </button>
          <button
            type="button"
            onClick={onRefreshAir}
            disabled={loadingAir}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[#D4DDD7] bg-white px-3.5 py-2 text-sm font-medium text-[#13231D] transition-colors hover:bg-[#F3F8F5] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-[#546860] ${loadingAir ? 'animate-spin' : ''}`} />
            <span>Refresh Feed</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('assistant')}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-[#165B43] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#114835]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Ask BreatheWise AI</span>
          </button>
        </div>
      </section>

      {/* Main Focal Section: Current AQI Card + Weather + Hourly Pollution Trend */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Dominant Focal Anchor: Current AQI Card */}
        <div className="flex flex-col justify-between rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#546860]">
                  Current Air Quality · {airData?.location.name}
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-mono text-5xl font-semibold tracking-tight text-[#13231D] tabular-nums">
                    {airData?.aqi !== null && airData?.aqi !== undefined ? airData.aqi : '—'}
                  </span>
                  <div>
                    <p className={`text-base font-semibold ${airData?.aqi !== null ? visuals.textColor : 'text-[#5E726A]'}`}>
                      {airData?.category ?? 'Unavailable'}
                    </p>
                    <p className="text-xs text-[#5E726A]">
                      {airData?.aqi !== null ? visuals.scaleIndex : 'Feed offline'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('air-quality')}
                className="whitespace-nowrap text-xs font-medium text-[#165B43] hover:underline"
              >
                Full breakdown →
              </button>
            </div>

            {/* Accessible Scale Bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[#EEF2EF]" aria-hidden="true">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: airData?.aqi !== null && airData?.aqi !== undefined ? `${Math.min(100, Math.max(6, (airData.aqi / 500) * 100))}%` : '0%',
                  backgroundColor: visuals.barColor,
                }}
              />
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#2D4039]">
              {airData?.plainLanguageSummary}
            </p>
          </div>

          <div className="mt-6 space-y-3 border-t border-[#EEF2EF] pt-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#5E726A]">Primary Responsible Pollutant</span>
              <span className="font-mono font-medium text-[#13231D]">{airData?.primaryPollutant ?? 'Unavailable'}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {(['pm25', 'pm10', 'no2'] as const).map((key) => (
                <div key={key} className="rounded-lg bg-[#F7F9F7] px-3 py-2">
                  <span className="block text-[11px] text-[#5E726A]">{POLLUTANT_LABELS[key].formula}</span>
                  <span className="font-mono text-sm font-semibold text-[#13231D] tabular-nums">
                    {airData?.pollutants[key] !== null && airData?.pollutants[key] !== undefined
                      ? `${airData.pollutants[key]} µg/m³`
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
            <p className="pt-1 text-[11px] text-[#6B7E76]">
              Source: {airData?.sourceAttribution} · Updated{' '}
              <span className="font-mono tabular-nums">
                {airData?.fetchedAt ? new Date(airData.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
              </span>
            </p>
          </div>
        </div>

        {/* Local Weather & Winter Smog Conditions Card (live /api/weather alongside AQI) */}
        <LocalWeatherCard
          location={airData?.location ?? null}
          initialWeather={airData?.weather ?? null}
          currentAqi={airData?.aqi ?? null}
        />
      </section>

      {/* Dynamic Health Precautions Section (Mask, Exercise, Indoor, Sensitive Groups) */}
      <HealthPrecautionsCard
        airData={airData}
        profile={profile}
        onNavigate={onNavigate}
      />

      {/* Daily Sustainability Goal Widget */}
      <DailySustainabilityGoalCard currentAqi={airData?.aqi ?? null} />

      {/* 24-Hour Air Quality Trajectory */}
      <section className="rounded-xl border border-[#DCE3DE] bg-white p-6 dark:border-[#22362E] dark:bg-[#111C17]">
        <div className="flex flex-col justify-between gap-2 border-b border-[#EEF2EF] pb-4 dark:border-[#1E3129] sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-[#13231D] dark:text-[#EDF5F1]">
              24-Hour Air Quality Trajectory
            </h2>
            <p className="text-xs text-[#5E726A] dark:text-[#8EA89C]">
              Recent hourly AQI progression for {airData?.location.name ?? 'your location'} ·{' '}
              {airData?.standardLabel ?? 'Active standard'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('air-quality')}
            className="whitespace-nowrap text-xs font-medium text-[#165B43] hover:underline dark:text-[#4ADE80]"
          >
            7-day &amp; YoY trends →
          </button>
        </div>

        <div className="mt-4 h-52 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={visuals.barColor} stopOpacity={0.22} />
                    <stop offset="95%" stopColor={visuals.barColor} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#20332B' : '#E8EDE9'} vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: isDark ? '#8EA89C' : '#5E726A' }} tickLine={false} axisLine={false} minTickGap={24} />
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
                <Area
                  type="monotone"
                  dataKey="aqi"
                  name="AQI"
                  stroke={visuals.barColor}
                  strokeWidth={2}
                  fill="url(#aqiGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg bg-[#F7F9F7] text-sm text-[#5E726A] dark:bg-[#15241E] dark:text-[#8EA89C]">
              Hourly atmospheric history unavailable for this station right now.
            </div>
          )}
        </div>
      </section>

      {/* Secondary Section: Today's AI Recommendations + Family Protection & Indoor Quick Guidance */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Today's AI Recommendations */}
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-7">
          <div className="flex flex-col justify-between gap-3 border-b border-[#EEF2EF] pb-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#13231D]">Today’s Personalized AI Action Brief</h2>
              <p className="text-xs text-[#5E726A]">
                Grounded in your live local AQI, hourly forecast, and household setup.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateBrief}
              disabled={loadingBrief}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#165B43] bg-[#F2F8F5] px-3 py-1.5 text-xs font-medium text-[#165B43] transition-colors hover:bg-[#E4F2EC] disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{loadingBrief ? 'Analyzing...' : aiBrief ? 'Regenerate Brief' : 'Generate Live AI Brief'}</span>
            </button>
          </div>

          {briefError && (
            <div className="mt-4 rounded-lg border border-[#F2B5B5] bg-[#FDECEC] p-3.5 text-sm text-[#991B1B]">
              {briefError}
            </div>
          )}

          {aiBrief ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-[#243831]">{aiBrief.summary}</p>
              <div className="divide-y divide-[#EEF2EF] border-t border-[#EEF2EF]">
                {aiBrief.recommendations.map((rec, i) => (
                  <div key={i} className="py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-sm font-semibold text-[#13231D]">{rec.recommendedAction}</h3>
                      <span className="shrink-0 font-mono text-[11px] text-[#546860]">{rec.relevantTimeOfDay}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#4A5D55]">{rec.whyRecommended}</p>
                    <p className="mt-1 text-[11px] text-[#6B7E76]">
                      Benefit: {rec.expectedBenefit} · Effort: {rec.estimatedEffortOrCost} · {rec.confidenceIndicator}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#6B7E76]">{aiBrief.safetyDisclaimer}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[#3F534C]">
                Click <strong>Generate Live AI Brief</strong> to run Gemini over {airData?.location.name}’s current readings
                and your household setup, or review official health guidance below right away:
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-[#F7F9F7] p-4">
                  <p className="text-xs font-semibold text-[#13231D]">General Household Guidance</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4A5D55]">
                    {airData?.healthGuidanceGeneral}
                  </p>
                </div>
                <div className="rounded-lg bg-[#F7F9F7] p-4">
                  <p className="text-xs font-semibold text-[#13231D]">Sensitive Groups (Children &amp; Elderly)</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#4A5D55]">
                    {airData?.healthGuidanceSensitive}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('planner')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#165B43] hover:underline"
                >
                  Open Personalized Daily Planner <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('assistant')}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#165B43] hover:underline"
                >
                  Ask a Custom Question in AI Chat <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Family Protection Alerts & Indoor Snapshot */}
        <div className="flex flex-col justify-between space-y-6 lg:col-span-5">
          <div className="rounded-xl border border-[#DCE3DE] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#13231D]">Family Protection Alerts</h2>
              <button
                type="button"
                onClick={() => onNavigate('notifications')}
                className="text-xs font-medium text-[#165B43] hover:underline"
              >
                Manage ({unreadAlerts.length} active)
              </button>
            </div>
            {unreadAlerts.length === 0 ? (
              <p className="mt-3 text-sm text-[#546860]">
                No critical pollution alerts triggered for your current thresholds.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[#EEF2EF]">
                {unreadAlerts.slice(0, 3).map((al) => (
                  <li key={al.id} className="py-3 first:pt-1 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#B53D0A] inline-flex items-center gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {al.category}
                      </span>
                      <span className="text-[#6B7E76]">{al.targetGroup}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#2D4039]">{al.whatToDo}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[#DCE3DE] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#13231D]">Indoor Air Ventilation Timing</h2>
              <button
                type="button"
                onClick={() => onNavigate('indoor')}
                className="text-xs font-medium text-[#165B43] hover:underline"
              >
                Optimize home →
              </button>
            </div>
            {indoorPlan && (
              <div className="mt-3 space-y-2 text-xs">
                <p className="font-semibold text-[#13231D]">
                  {indoorPlan.ventilationGuidance.status} · {indoorPlan.ventilationGuidance.bestWindowLabel}
                </p>
                <p className="leading-relaxed text-[#4A5D55]">{indoorPlan.ventilationGuidance.detail}</p>
                <p className="pt-1 font-mono text-[11px] text-[#5E726A] tabular-nums">
                  Recommended Room CADR: {indoorPlan.recommendedCadrM3h} m³/h ({indoorPlan.targetAch} ACH)
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bottom Section: Sustainable Alternatives + Environmental Impact + Community */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#13231D]">Smog-Safe Sustainable Swaps</h2>
            <button
              type="button"
              onClick={() => onNavigate('sustainable')}
              className="text-xs font-medium text-[#165B43] hover:underline"
            >
              Explore →
            </button>
          </div>
          <ul className="mt-4 divide-y divide-[#EEF2EF]">
            {topAlternatives.map((alt) => (
              <li key={alt.actionKey} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-[#13231D]">{alt.title}</p>
                <p className="mt-1 font-mono text-xs text-[#165B43] tabular-nums">
                  Est. {alt.estimatedMonthlyCo2Kg} kg CO₂e/mo · Save {currencySym}
                  {Math.round(alt.estimatedMonthlySavings)}/mo
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#13231D]">Household Impact Summary</h2>
            <button
              type="button"
              onClick={() => onNavigate('impact')}
              className="text-xs font-medium text-[#165B43] hover:underline"
            >
              Log action →
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-[#F7F9F7] p-3.5">
              <span className="text-xs text-[#5E726A]">Monthly CO₂e Avoided</span>
              <p className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums">
                {impact ? impact.monthly.co2Kg.toFixed(1) : '0.0'} kg
              </p>
            </div>
            <div className="rounded-lg bg-[#F7F9F7] p-3.5">
              <span className="text-xs text-[#5E726A]">Monthly Savings</span>
              <p className="mt-1 font-mono text-xl font-semibold text-[#165B43] tabular-nums">
                {currencySym}
                {impact ? Math.round(impact.monthly.costSaved) : 0}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[#6B7E76]">
            Note: CO₂e reductions reflect long-term climate impact and are distinct from immediate local PM2.5 exposure.
          </p>
        </div>

        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#13231D]">Active Community Initiatives</h2>
            <button
              type="button"
              onClick={() => onNavigate('community')}
              className="text-xs font-medium text-[#165B43] hover:underline"
            >
              Join hub →
            </button>
          </div>
          <ul className="mt-4 divide-y divide-[#EEF2EF]">
            {campaigns.slice(0, 3).map((c) => (
              <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-[#13231D]">{c.title}</p>
                <p className="mt-1 font-mono text-xs text-[#5E726A] tabular-nums">
                  {c.currentParticipants} participants · {c.collectiveCo2Kg.toLocaleString()} kg CO₂e collective
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
