import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, ShieldAlert, SlidersHorizontal, X } from 'lucide-react';
import { evaluateSevereAlertBanner } from '../lib/dashboardWidgets';
import type { AirQualityPayload, HouseholdProfile } from '../types/breathewise';

interface SevereAlertBannerProps {
  airData: AirQualityPayload | null;
  severeAqiThreshold: number;
  profile: HouseholdProfile;
  onNavigate: (view: string) => void;
}

export const SevereAlertBanner: React.FC<SevereAlertBannerProps> = ({
  airData,
  severeAqiThreshold,
  profile,
  onNavigate,
}) => {
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  const banner = useMemo(
    () => evaluateSevereAlertBanner(airData, severeAqiThreshold, profile),
    [airData, severeAqiThreshold, profile],
  );

  const readingKey = airData
    ? `${airData.location.name}:${airData.aqi ?? 'none'}:${severeAqiThreshold}`
    : 'none';

  if (!banner.visible || dismissedKey === readingKey) {
    return null;
  }

  return (
    <section
      role="alert"
      aria-live="assertive"
      data-testid="severe-alert-banner"
      className="rounded-xl border border-[#F5B8B8] border-l-4 border-l-[#B91C1C] bg-[#FEF2F2] p-5 text-[#1F1212] shadow-xs dark:border-[#6B2128] dark:border-l-[#F87171] dark:bg-[#271114] dark:text-[#FCEAEA]"
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#B91C1C] text-white dark:bg-[#DC2626]">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-[#991B1B] tabular-nums dark:text-[#FCA5A5]">
                  Real-Time Threshold Exceeded · AQI {banner.aqi} &gt; {banner.threshold} (+{banner.exceededBy})
                </p>
                <h2 className="mt-0.5 text-base font-bold text-[#7F1D1D] dark:text-[#FEE2E2]">
                  {banner.headline}
                </h2>
              </div>
            </div>

            <button
              type="button"
              data-testid="dismiss-alert-banner-btn"
              onClick={() => setDismissedKey(readingKey)}
              aria-label="Dismiss alert banner for current reading"
              className="rounded-lg p-1.5 text-[#991B1B] transition-colors hover:bg-[#FEE2E2] hover:text-[#7F1D1D] lg:hidden dark:text-[#FCA5A5] dark:hover:bg-[#3F191E]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <p className="mt-2.5 text-sm leading-relaxed text-[#5C1A1A] dark:text-[#F6CFCF]">
            {banner.summary}
          </p>

          <ul className="mt-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {banner.protectiveSteps.map((step, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg border border-[#F8D0D0] bg-white/80 px-3 py-2.5 text-xs leading-relaxed text-[#3B1515] dark:border-[#511D22] dark:bg-[#1B0C0E]/80 dark:text-[#F5D6D6]"
              >
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B91C1C] dark:text-[#F87171]" aria-hidden="true" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-end">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('indoor')}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#B91C1C] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#991B1B] dark:bg-[#DC2626] dark:hover:bg-[#B91C1C]"
            >
              <span>Indoor Protection Plan</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              data-testid="dismiss-alert-banner-btn-desktop"
              onClick={() => setDismissedKey(readingKey)}
              aria-label="Dismiss alert banner for current reading"
              className="hidden rounded-lg p-2 text-[#991B1B] transition-colors hover:bg-[#FEE2E2] hover:text-[#7F1D1D] lg:inline-flex dark:text-[#FCA5A5] dark:hover:bg-[#3F191E]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#F0B4B4] bg-white/80 px-3 py-1.5 text-xs font-medium text-[#7F1D1D] transition-colors hover:bg-white dark:border-[#5C2026] dark:bg-[#1B0C0E] dark:text-[#FCA5A5] dark:hover:bg-[#311317]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Adjust {banner.threshold} AQI Threshold</span>
          </button>
        </div>
      </div>
    </section>
  );
};
