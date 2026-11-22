import React, { useEffect, useState } from 'react';
import { CheckSquare, Square, Save, Wind } from 'lucide-react';
import { api } from '../services/api';
import type { BudgetTier, CookingFuelType, HouseholdProfile, IndoorProfile } from '../types/breathewise';
import type { IndoorOptimizationPlan } from '../lib/indoorOptimizer';

interface IndoorAirViewProps {
  profile: HouseholdProfile;
  locationKey: string;
  onProfileSaved: (updated: HouseholdProfile) => void;
}

export const IndoorAirView: React.FC<IndoorAirViewProps> = ({ profile, locationKey, onProfileSaved }) => {
  const [plan, setPlan] = useState<IndoorOptimizationPlan | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<IndoorProfile>(profile.indoorProfile);
  const [budgetTier, setBudgetTier] = useState<BudgetTier>(profile.budgetTier);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  async function loadIndoor() {
    const res = await api.getIndoor();
    setPlan(res.plan);
    setCheckedIds(res.checkedIds);
    setDraft(res.indoorProfile);
  }

  useEffect(() => {
    loadIndoor().catch(() => {});
  }, [locationKey]);

  async function handleSaveIndoor(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      const updatedProfile: HouseholdProfile = {
        ...profile,
        budgetTier,
        indoorProfile: draft,
      };
      const { profile: saved } = await api.updateProfile(updatedProfile);
      onProfileSaved(saved);
      await loadIndoor();
      setSavedMsg('Indoor room profile updated and CADR targets recalculated.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleCheck(itemId: string) {
    const isChecked = checkedIds.includes(itemId);
    const next = !isChecked;
    setCheckedIds((prev) => (next ? [...prev, itemId] : prev.filter((id) => id !== itemId)));
    await api.toggleIndoorChecklist(itemId, next);
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E2E8E4] pb-6">
        <p className="text-xs font-medium text-[#546860]">
          Room-Specific CADR Sizing · Forecast Ventilation · Source Control
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#13231D]">Indoor Air Quality Optimization Center</h1>
        <p className="mt-1 text-sm text-[#4A5D55]">
          Configure your rooms, ventilation, cooking fuel, and budget to receive evidence-based indoor filtration and low-cost protection guidance.
        </p>
      </div>

      {/* Hero Split: Apartment HEPA Visual + CADR & Ventilation Telemetry */}
      <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-xl border border-[#DCE3DE] bg-white lg:col-span-5">
          {!imgFailed ? (
            <img
              src="/src/assets/images/clean_indoor_living_1795109500971.jpg"
              alt="Sunlit modern apartment living room with a freestanding HEPA air purifier near sealed winter windows"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-56 w-full object-cover lg:h-full"
            />
          ) : (
            <div className="flex h-56 items-center justify-center bg-[#ECF4F0] p-6 text-center lg:h-full">
              <div>
                <Wind className="mx-auto h-8 w-8 text-[#165B43]" />
                <p className="mt-2 text-sm font-medium text-[#13231D]">Sealed Indoor Clean-Air Zone</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-7">
          {plan ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-[#F7F9F7] p-4">
                  <span className="text-xs text-[#5E726A]">Primary Room Volume</span>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#13231D] tabular-nums">
                    {plan.roomVolumeM3} m³
                  </p>
                </div>
                <div className="rounded-lg bg-[#F7F9F7] p-4">
                  <span className="text-xs text-[#5E726A]">Target HEPA CADR</span>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#165B43] tabular-nums">
                    {plan.recommendedCadrM3h} m³/h
                  </p>
                  <span className="font-mono text-[11px] text-[#5E726A]">{plan.targetAch} Air Changes/hr</span>
                </div>
                <div className="rounded-lg bg-[#F7F9F7] p-4">
                  <span className="text-xs text-[#5E726A]">Purifier Sizing</span>
                  <p className="mt-1 text-base font-semibold text-[#13231D]">{plan.purifierCoverageStatus}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-[#EEF2EF] pt-4 text-sm">
                <p className="font-semibold text-[#13231D]">
                  Ventilation Strategy: {plan.ventilationGuidance.status} — {plan.ventilationGuidance.bestWindowLabel}
                </p>
                <p className="text-xs leading-relaxed text-[#4A5D55]">{plan.ventilationGuidance.detail}</p>
                <p className="text-xs leading-relaxed text-[#4A5D55]">{plan.purifierCoverageNote}</p>
                <p className="text-xs text-[#5E726A]">
                  <strong className="text-[#13231D]">Humidity target:</strong> {plan.humidityTarget}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#5E726A]">Calculating indoor air plan...</p>
          )}
        </div>
      </section>

      {/* Interactive Home & Room Configuration Form */}
      <section className="rounded-xl border border-[#DCE3DE] bg-white p-6">
        <h2 className="text-base font-semibold text-[#13231D]">Home &amp; Equipment Profile</h2>
        <form onSubmit={handleSaveIndoor} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="indoor-rooms" className="block text-xs font-medium text-[#4A5D55]">
              Number of Rooms
            </label>
            <input
              id="indoor-rooms"
              type="number"
              min={1}
              max={20}
              value={draft.rooms}
              onChange={(e) => setDraft({ ...draft, rooms: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 font-mono text-sm tabular-nums focus:border-[#165B43] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="indoor-area" className="block text-xs font-medium text-[#4A5D55]">
              Primary Room Area (sq ft)
            </label>
            <input
              id="indoor-area"
              type="number"
              min={60}
              max={2500}
              value={draft.primaryRoomAreaSqFt}
              onChange={(e) => setDraft({ ...draft, primaryRoomAreaSqFt: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 font-mono text-sm tabular-nums focus:border-[#165B43] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="indoor-fuel" className="block text-xs font-medium text-[#4A5D55]">
              Cooking Fuel Type
            </label>
            <select
              id="indoor-fuel"
              value={draft.cookingFuel}
              onChange={(e) => setDraft({ ...draft, cookingFuel: e.target.value as CookingFuelType })}
              className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 text-sm focus:border-[#165B43] focus:bg-white focus:outline-none"
            >
              <option value="lpg">LPG Cylinder</option>
              <option value="piped_gas">Piped Natural Gas (PNG)</option>
              <option value="induction_electric">Electric / Induction</option>
              <option value="biomass_solid">Solid Fuel / Biomass</option>
            </select>
          </div>

          <div>
            <label htmlFor="indoor-budget" className="block text-xs font-medium text-[#4A5D55]">
              Budget Preference
            </label>
            <select
              id="indoor-budget"
              value={budgetTier}
              onChange={(e) => setBudgetTier(e.target.value as BudgetTier)}
              className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 text-sm focus:border-[#165B43] focus:bg-white focus:outline-none"
            >
              <option value="minimal">Low-Cost / Minimal Budget</option>
              <option value="moderate">Moderate Budget</option>
              <option value="comprehensive">Comprehensive Filtration</option>
            </select>
          </div>

          <div>
            <label htmlFor="indoor-cadr" className="block text-xs font-medium text-[#4A5D55]">
              Existing Purifier CADR (m³/h)
            </label>
            <input
              id="indoor-cadr"
              type="number"
              min={0}
              max={1500}
              disabled={!draft.hasAirPurifier}
              value={draft.purifierCadrM3h}
              onChange={(e) => setDraft({ ...draft, purifierCadrM3h: Number(e.target.value) })}
              className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 font-mono text-sm tabular-nums disabled:opacity-50 focus:border-[#165B43] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-end gap-4 sm:col-span-2 lg:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#13231D]">
              <input
                type="checkbox"
                checked={draft.hasAirPurifier}
                onChange={(e) => setDraft({ ...draft, hasAirPurifier: e.target.checked })}
                className="h-4 w-4 rounded accent-[#165B43]"
              />
              <span>Have HEPA Purifier</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-[#13231D]">
              <input
                type="checkbox"
                checked={draft.hasKitchenExhaust}
                onChange={(e) => setDraft({ ...draft, hasKitchenExhaust: e.target.checked })}
                className="h-4 w-4 rounded accent-[#165B43]"
              />
              <span>Kitchen Exhaust / Chimney</span>
            </label>
          </div>

          <div className="flex items-end justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#165B43] px-4 py-2 text-sm font-medium text-white hover:bg-[#114835] disabled:opacity-60 sm:w-auto"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Recalculating...' : 'Update Indoor Plan'}</span>
            </button>
          </div>
        </form>
        {savedMsg && <p className="mt-3 text-xs font-medium text-[#165B43]">{savedMsg}</p>}
      </section>

      {/* Recommendations + Daily Indoor Checklist */}
      {plan && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-7">
            <h2 className="text-base font-semibold text-[#13231D]">Actionable Indoor Air Recommendations</h2>
            <div className="mt-4 divide-y divide-[#EEF2EF]">
              {plan.recommendations.map((rec) => (
                <div key={rec.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[#5E726A]">
                    <span>
                      {rec.category} · {rec.budgetTier}
                    </span>
                    <span className="font-semibold text-[#165B43]">{rec.priority}</span>
                  </div>
                  <h3 className="mt-1 text-sm font-semibold text-[#13231D]">{rec.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#354941]">{rec.actionDetail}</p>
                  <p className="mt-1.5 text-[11px] text-[#6B7E76]">Evidence: {rec.scientificBasis}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-xl border border-[#DCE3DE] bg-white p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-[#13231D]">Daily Indoor Air Checklist</h2>
                <span className="font-mono text-xs text-[#165B43] tabular-nums">
                  {checkedIds.length}/{plan.checklist.length} done
                </span>
              </div>
              <ul className="mt-4 divide-y divide-[#EEF2EF]">
                {plan.checklist.map((item) => {
                  const done = checkedIds.includes(item.id);
                  return (
                    <li key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => toggleCheck(item.id)}
                        className="flex w-full items-start gap-2.5 text-left text-xs"
                      >
                        {done ? (
                          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#165B43]" />
                        ) : (
                          <Square className="mt-0.5 h-4 w-4 shrink-0 text-[#8A9D95]" />
                        )}
                        <span className={done ? 'text-[#6B7E76] line-through' : 'text-[#13231D]'}>
                          {item.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-xl border border-[#DCE3DE] bg-[#F3F8F5] p-5">
              <h3 className="text-sm font-semibold text-[#13231D]">Indoor Houseplants: Myth vs. Scientific Reality</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#354941]">{plan.houseplantScienceNote}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
