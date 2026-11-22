import React, { useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  HeartHandshake,
  Home,
  Shield,
} from 'lucide-react';
import {
  generateHealthPrecautions,
  type HealthPrecautionItem,
} from '../lib/dashboardWidgets';
import type { AirQualityPayload, HouseholdProfile } from '../types/breathewise';

interface HealthPrecautionsCardProps {
  airData: AirQualityPayload | null;
  profile: HouseholdProfile;
  onNavigate: (view: string) => void;
}

function getPrecautionIcon(id: HealthPrecautionItem['id']) {
  switch (id) {
    case 'mask':
      return Shield;
    case 'exercise':
      return Activity;
    case 'indoor':
      return Home;
    case 'sensitive':
      return HeartHandshake;
  }
}

function getSeverityStyles(severity: HealthPrecautionItem['severity']) {
  switch (severity) {
    case 'critical':
      return {
        border: 'border-l-[#B91C1C] dark:border-l-[#F87171]',
        icon: 'text-[#B91C1C] dark:text-[#FCA5A5]',
        status: 'text-[#991B1B] dark:text-[#FCA5A5]',
      };
    case 'high':
      return {
        border: 'border-l-[#C85A17] dark:border-l-[#FB923C]',
        icon: 'text-[#B53D0A] dark:text-[#FB923C]',
        status: 'text-[#B53D0A] dark:text-[#FB923C]',
      };
    case 'moderate':
      return {
        border: 'border-l-[#CA8A04] dark:border-l-[#FBBF24]',
        icon: 'text-[#9A6700] dark:text-[#FBBF24]',
        status: 'text-[#854D0E] dark:text-[#FDE047]',
      };
    case 'low':
      return {
        border: 'border-l-[#165B43] dark:border-l-[#34D399]',
        icon: 'text-[#165B43] dark:text-[#4ADE80]',
        status: 'text-[#165B43] dark:text-[#4ADE80]',
      };
    default:
      return {
        border: 'border-l-[#94A89F] dark:border-l-[#4B6359]',
        icon: 'text-[#5E726A] dark:text-[#8EA89C]',
        status: 'text-[#4A5D55] dark:text-[#A9C0B5]',
      };
  }
}

export const HealthPrecautionsCard: React.FC<HealthPrecautionsCardProps> = ({
  airData,
  profile,
  onNavigate,
}) => {
  const plan = useMemo(
    () => generateHealthPrecautions(airData, profile),
    [airData, profile],
  );

  const headerSeverity: HealthPrecautionItem['severity'] =
    plan.severityTier === 'severe' || plan.severityTier === 'very_poor'
      ? 'critical'
      : plan.severityTier === 'poor'
        ? 'high'
        : plan.severityTier === 'moderate'
          ? 'moderate'
          : plan.severityTier === 'unavailable'
            ? 'unavailable'
            : 'low';

  const headerAccent = getSeverityStyles(headerSeverity);

  return (
    <section
      data-testid="health-precautions-section"
      aria-labelledby="health-precautions-heading"
      className="rounded-xl border border-[#DCE3DE] bg-white p-6 dark:border-[#22362E] dark:bg-[#111C17]"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-[#EEF2EF] pb-4 dark:border-[#1E3129] sm:flex-row sm:items-end">
        <div>
          <p className={`text-xs font-semibold ${headerAccent.status}`}>
            {plan.advisoryLevel}
            {plan.aqi !== null ? ` · AQI ${plan.aqi} (${plan.category})` : ''}
            {airData?.primaryPollutant ? ` · Driven by ${airData.primaryPollutant}` : ''}
          </p>
          <h2
            id="health-precautions-heading"
            className="mt-1 text-lg font-semibold text-[#13231D] dark:text-[#EDF5F1]"
          >
            Health Precautions
          </h2>
          <p className="mt-0.5 text-xs text-[#546860] dark:text-[#96B0A4]">
            Dynamic protective guidance tailored to live local AQI and your household profile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => onNavigate('indoor')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#165B43] hover:underline dark:text-[#4ADE80]"
          >
            Indoor filtration plan <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('planner')}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#165B43] hover:underline dark:text-[#4ADE80]"
          >
            Open Daily Planner <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plan.items.map((item) => {
          const Icon = getPrecautionIcon(item.id);
          const styles = getSeverityStyles(item.severity);

          return (
            <article
              key={item.id}
              data-testid={`precaution-${item.id}`}
              className={`flex flex-col justify-between rounded-lg border border-[#E6ECE8] border-l-4 bg-[#F8FAF9] p-4 dark:border-[#1F332B] dark:bg-[#15241E] ${styles.border}`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 shrink-0 ${styles.icon}`} aria-hidden="true" />
                  <span className="text-xs font-medium text-[#546860] dark:text-[#96B0A4]">
                    {item.categoryLabel}
                  </span>
                </div>
                <h3 className={`mt-2 text-sm font-semibold ${styles.status}`}>
                  {item.status}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#2D4039] dark:text-[#C5D8CF]">
                  {item.detail}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] leading-relaxed text-[#6B7E76] dark:text-[#7F9A8E]">
        {plan.disclaimer}
      </p>
    </section>
  );
};
