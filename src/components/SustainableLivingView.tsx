import React, { useState } from 'react';
import { Check, ShieldAlert, Plus } from 'lucide-react';
import { api } from '../services/api';
import type { PersonalizedSustainableAlternative } from '../lib/impactCalculator';

interface SustainableLivingViewProps {
  alternatives: PersonalizedSustainableAlternative[];
  currentAqi: number | null;
  onActionLogged: () => Promise<void>;
}

export const SustainableLivingView: React.FC<SustainableLivingViewProps> = ({
  alternatives,
  currentAqi,
  onActionLogged,
}) => {
  const [category, setCategory] = useState<'all' | 'transportation' | 'household' | 'shopping' | 'community'>('all');
  const [loggedKeys, setLoggedKeys] = useState<string[]>([]);
  const [loggingKey, setLoggingKey] = useState<string | null>(null);

  const filtered = category === 'all' ? alternatives : alternatives.filter((a) => a.category === category);

  async function handleQuickLog(alt: PersonalizedSustainableAlternative) {
    setLoggingKey(alt.actionKey);
    try {
      await api.logImpactAction({
        actionKey: alt.actionKey,
        quantity: alt.category === 'transportation' ? 12 : 2,
        notes: 'Logged from Sustainable Lifestyle Engine',
      });
      setLoggedKeys((prev) => [...prev, alt.actionKey]);
      await onActionLogged();
    } finally {
      setLoggingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8E4] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-[#546860]">
            Exposure-Aware Low-Emission Choices · Current Outdoor AQI:{' '}
            <span className="font-mono tabular-nums">{currentAqi ?? '—'}</span>
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#13231D]">Sustainable Lifestyle Recommendation Engine</h1>
          <p className="mt-1 text-sm text-[#4A5D55]">
            Practical transport, household, shopping, and community alternatives calibrated to protect your lungs first during high-smog periods.
          </p>
        </div>

        <div className="inline-flex flex-wrap rounded-lg bg-[#F1F5F2] p-1" role="tablist" aria-label="Sustainable category filter">
          {(
            [
              ['all', 'All'],
              ['transportation', 'Transport'],
              ['household', 'Household'],
              ['shopping', 'Shopping'],
              ['community', 'Community'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={category === id}
              onClick={() => setCategory(id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                category === id ? 'bg-white text-[#13231D] shadow-sm' : 'text-[#546860] hover:text-[#13231D]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {filtered.map((alt) => {
          const sym = alt.currency === 'INR' ? '₹' : '$';
          const wasLogged = loggedKeys.includes(alt.actionKey);
          return (
            <article
              key={alt.actionKey}
              className="flex flex-col justify-between rounded-xl border border-[#DCE3DE] bg-white p-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs text-[#5E726A]">
                  <span className="capitalize">{alt.category}</span>
                  <span className="font-mono font-medium text-[#165B43] tabular-nums">
                    ~{alt.estimatedMonthlyCo2Kg} kg CO₂e/mo · Save {sym}
                    {Math.round(alt.estimatedMonthlySavings)}/mo
                  </span>
                </div>

                <h2 className="text-base font-semibold text-[#13231D]">{alt.title}</h2>

                {!alt.isSafeToday && (
                  <div className="flex items-start gap-2 rounded-lg border border-[#F3D299] bg-[#FEF6E6] p-3 text-xs text-[#9A4B06]">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{alt.airSafetyNote}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 rounded-lg bg-[#F7F9F7] p-3.5 text-xs sm:grid-cols-2">
                  <div>
                    <span className="block font-medium text-[#5E726A]">Current Behavior</span>
                    <p className="mt-1 text-[#2D4039]">{alt.currentBehavior}</p>
                  </div>
                  <div>
                    <span className="block font-medium text-[#165B43]">Suggested Alternative</span>
                    <p className="mt-1 text-[#13231D]">{alt.suggestedAlternative}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-[#13231D]">Practical Steps</h3>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs text-[#4A5D55]">
                    {alt.implementationSteps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-[#5E726A]">
                  <strong className="text-[#13231D]">Environmental benefit:</strong> {alt.environmentalBenefit}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#EEF2EF] pt-4">
                <span className="text-[11px] text-[#6B7E76]">
                  {alt.isSafeToday ? 'Appropriate under current air conditions' : 'Deferred until AQI ≤ 100'}
                </span>
                <button
                  type="button"
                  disabled={!alt.isSafeToday || loggingKey === alt.actionKey}
                  onClick={() => handleQuickLog(alt)}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#165B43] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#114835] disabled:bg-[#C6D1CB] disabled:text-[#5E726A]"
                >
                  {wasLogged ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Logged Today</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>{loggingKey === alt.actionKey ? 'Logging...' : 'Log Action Today'}</span>
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
