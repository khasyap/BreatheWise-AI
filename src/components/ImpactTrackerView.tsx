import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Plus, Trash2, Info } from 'lucide-react';
import { api } from '../services/api';
import type { AggregatedImpact, EmissionActionDefinition } from '../lib/impactCalculator';
import type { SustainabilityActivityRecord } from '../types/breathewise';

interface ImpactTrackerViewProps {
  currency: 'INR' | 'USD';
  catalog: EmissionActionDefinition[];
  records: SustainabilityActivityRecord[];
  aggregated: AggregatedImpact | null;
  communityContribution: { collectiveCo2Kg: number; activeParticipants: number } | null;
  onRefreshImpact: () => Promise<void>;
}

export const ImpactTrackerView: React.FC<ImpactTrackerViewProps> = ({
  currency,
  catalog,
  records,
  aggregated,
  communityContribution,
  onRefreshImpact,
}) => {
  const [selectedKey, setSelectedKey] = useState(catalog[0]?.actionKey || 'car_to_metro');
  const [quantity, setQuantity] = useState<string>(String(catalog[0]?.defaultQuantity || 15));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [periodTab, setPeriodTab] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const activeDef = catalog.find((c) => c.actionKey === selectedKey) ?? catalog[0];
  const sym = currency === 'INR' ? '₹' : '$';
  const currentBucket = aggregated?.[periodTab] ?? { co2Kg: 0, fuelL: 0, energyKwh: 0, costSaved: 0, actions: 0 };

  function handleActionChange(key: string) {
    setSelectedKey(key);
    const def = catalog.find((c) => c.actionKey === key);
    if (def) setQuantity(String(def.defaultQuantity));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numQty = Number(quantity);
    if (!Number.isFinite(numQty) || numQty <= 0) {
      setFormError('Enter a positive numeric quantity greater than zero.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await api.logImpactAction({
        actionKey: selectedKey,
        quantity: numQty,
        notes: notes.trim(),
      });
      setNotes('');
      await onRefreshImpact();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save activity.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    await api.deleteImpactRecord(id);
    await onRefreshImpact();
  }

  const categoryTotals = ['transportation', 'household', 'shopping', 'community'].map((cat) => {
    const sum = records
      .filter((r) => r.category === cat)
      .reduce((acc, r) => acc + r.co2SavedKg, 0);
    return { category: cat.charAt(0).toUpperCase() + cat.slice(1), co2Kg: Number(sum.toFixed(2)) };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#E2E8E4] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-medium text-[#546860]">
            Transparent Emission Factors · CEA India Grid &amp; DEFRA/IPCC Transport Baselines
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#13231D]">Environmental Impact Calculator &amp; Tracker</h1>
          <p className="mt-1 text-sm text-[#4A5D55]">
            Log your commute swaps, household electricity savings, and waste diversion to track auditable CO₂e, fuel, energy, and cost impact.
          </p>
        </div>

        <div className="inline-flex rounded-lg bg-[#F1F5F2] p-1" role="tablist" aria-label="Impact summary timeframe">
          {(
            [
              ['daily', 'Today'],
              ['weekly', 'Last 7 Days'],
              ['monthly', 'Last 30 Days'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={periodTab === id}
              onClick={() => setPeriodTab(id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                periodTab === id ? 'bg-white text-[#13231D] shadow-sm' : 'text-[#546860] hover:text-[#13231D]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Explicit Scientific Distinction Callout */}
      <div className="flex items-start gap-3 rounded-xl border border-[#DCE3DE] bg-[#F3F8F5] p-4 text-xs text-[#2D4039]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#165B43]" />
        <p className="leading-relaxed">
          <strong className="text-[#13231D]">Scientific distinction (Estimates &amp; Assumptions):</strong> All figures below are transparent estimates based on published emission factors. <strong>CO₂-equivalent (CO₂e) reductions measure long-term greenhouse gas mitigation and are not the same as immediate reductions in local PM2.5 exposure or citywide AQI today.</strong>
        </p>
      </div>

      {/* 4-Column KPI Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-5">
          <span className="text-xs text-[#5E726A]">Estimated CO₂e Avoided</span>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#13231D] tabular-nums">
            {currentBucket.co2Kg.toFixed(2)} kg
          </p>
          <span className="mt-1 block text-xs text-[#5E726A]">{currentBucket.actions} actions logged</span>
        </div>
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-5">
          <span className="text-xs text-[#5E726A]">Estimated Fuel Saved</span>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#13231D] tabular-nums">
            {currentBucket.fuelL.toFixed(2)} L
          </p>
          <span className="mt-1 block text-xs text-[#5E726A]">Based on urban petrol baseline</span>
        </div>
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-5">
          <span className="text-xs text-[#5E726A]">Electricity Conserved</span>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#13231D] tabular-nums">
            {currentBucket.energyKwh.toFixed(2)} kWh
          </p>
          <span className="mt-1 block text-xs text-[#5E726A]">Grid factor: 0.716 kg CO₂e/kWh</span>
        </div>
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-5">
          <span className="text-xs text-[#5E726A]">Estimated Household Savings</span>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#165B43] tabular-nums">
            {sym}
            {currentBucket.costSaved.toFixed(0)}
          </p>
          <span className="mt-1 block text-xs text-[#5E726A]">
            Community total: {communityContribution?.collectiveCo2Kg.toLocaleString() ?? 0} kg CO₂e
          </span>
        </div>
      </section>

      {/* Calculator Form + Breakdown Chart */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-6">
          <h2 className="text-base font-semibold text-[#13231D]">Log a Sustainable Action</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="impact-action-select" className="block text-xs font-medium text-[#4A5D55]">
                Action Type
              </label>
              <select
                id="impact-action-select"
                value={selectedKey}
                onChange={(e) => handleActionChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2.5 text-sm text-[#13231D] focus:border-[#165B43] focus:bg-white focus:outline-none"
              >
                {catalog.map((c) => (
                  <option key={c.actionKey} value={c.actionKey}>
                    [{c.category.toUpperCase()}] {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="impact-quantity-input" className="block text-xs font-medium text-[#4A5D55]">
                  Quantity ({activeDef?.unitLabel || 'units'})
                </label>
                <input
                  id="impact-quantity-input"
                  type="number"
                  step="0.5"
                  min="0.1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 font-mono text-sm tabular-nums focus:border-[#165B43] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="impact-notes-input" className="block text-xs font-medium text-[#4A5D55]">
                  Note (optional)
                </label>
                <input
                  id="impact-notes-input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Office commute via Yellow Line"
                  className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 text-sm focus:border-[#165B43] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {activeDef && (
              <div className="rounded-lg bg-[#F7F9F7] p-3.5 text-xs text-[#4A5D55]">
                <p className="font-mono text-[#13231D] tabular-nums">
                  Preview: {(Math.max(0, Number(quantity) || 0) * activeDef.co2KgPerUnit).toFixed(2)} kg CO₂e ·{' '}
                  {(Math.max(0, Number(quantity) || 0) * activeDef.fuelLPerUnit).toFixed(2)} L fuel · {sym}
                  {(
                    Math.max(0, Number(quantity) || 0) *
                    (currency === 'INR' ? activeDef.costSavedInrPerUnit : activeDef.costSavedUsdPerUnit)
                  ).toFixed(0)}{' '}
                  saved
                </p>
                <p className="mt-1 text-[11px] text-[#6B7E76]">Factor source: {activeDef.sourceCitation}</p>
              </div>
            )}

            {formError && (
              <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#165B43] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#114835] disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              <span>{submitting ? 'Saving...' : 'Calculate & Log Impact'}</span>
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-6">
          <h2 className="text-base font-semibold text-[#13231D]">CO₂e Avoided by Category (All Logged)</h2>
          <p className="text-xs text-[#5E726A]">Cumulative household contribution across lifestyle categories.</p>
          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryTotals} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EDE9" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#5E726A' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#5E726A' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#D4DDD7', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="co2Kg" name="CO₂e Avoided (kg)" fill="#165B43" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Logged Activity History Table */}
      <section className="rounded-xl border border-[#DCE3DE] bg-white p-6">
        <h2 className="text-base font-semibold text-[#13231D]">Logged Sustainability History</h2>
        {records.length === 0 ? (
          <p className="mt-3 text-sm text-[#5E726A]">
            No actions logged yet. Use the calculator above to record your first transit swap or energy-saving habit.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8E4] text-[#546860]">
                  <th className="py-2.5 pr-3 font-medium">Date</th>
                  <th className="py-2.5 pr-3 font-medium">Action</th>
                  <th className="py-2.5 pr-3 text-right font-medium">Quantity</th>
                  <th className="py-2.5 pr-3 text-right font-medium">CO₂e Avoided</th>
                  <th className="py-2.5 pr-3 text-right font-medium">Savings</th>
                  <th className="py-2.5 text-right font-medium">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EF]">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F9FBF9]">
                    <td className="py-3 pr-3 font-mono text-[#5E726A] tabular-nums">{r.loggedDate}</td>
                    <td className="py-3 pr-3">
                      <span className="font-medium text-[#13231D]">{r.title}</span>
                      {r.notes && <span className="block text-[11px] text-[#6B7E76]">{r.notes}</span>}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-[#13231D] tabular-nums">
                      {r.quantity} {r.unit}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono font-medium text-[#165B43] tabular-nums">
                      {r.co2SavedKg.toFixed(2)} kg
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-[#13231D] tabular-nums">
                      {sym}
                      {r.costSaved.toFixed(0)}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        aria-label={`Delete logged action ${r.title}`}
                        className="rounded p-1.5 text-[#7A8C85] hover:bg-[#FDECEC] hover:text-[#B91C1C]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
