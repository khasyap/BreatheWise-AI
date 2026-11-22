import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Flame, Leaf, Pencil } from 'lucide-react';
import { getDailyGoalSuggestions } from '../lib/dashboardWidgets';
import { api } from '../services/api';
import type { DailyGoalStatus } from '../types/breathewise';

interface DailySustainabilityGoalCardProps {
  currentAqi: number | null;
}

export const DailySustainabilityGoalCard: React.FC<DailySustainabilityGoalCardProps> = ({
  currentAqi,
}) => {
  const [status, setStatus] = useState<DailyGoalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => getDailyGoalSuggestions(currentAqi), [currentAqi]);

  const loadGoal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDailyGoal();
      setStatus(data);
      setEditing(!data.goal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load daily goal right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  async function handleSelectPreset(presetId: string, title: string) {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.saveDailyGoal({ title, presetId, completed: false });
      setStatus(updated);
      setCustomTitle('');
      setSelectedPresetId(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save today’s goal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCustom(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = customTitle.trim();
    if (trimmed.length < 2) {
      setError('Enter a short action (at least 2 characters) or pick a preset above.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await api.saveDailyGoal({
        title: trimmed,
        presetId: selectedPresetId ?? 'custom',
        completed: false,
      });
      setStatus(updated);
      setCustomTitle('');
      setSelectedPresetId(null);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save today’s goal.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleComplete() {
    if (!status?.goal || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.toggleDailyGoal(!status.goal.completed);
      setStatus(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update goal completion.');
    } finally {
      setSaving(false);
    }
  }

  const activeGoal = status?.goal ?? null;
  const activePresetMeta = activeGoal
    ? suggestions.find((s) => s.id === activeGoal.presetId) ?? null
    : null;

  return (
    <section
      aria-labelledby="daily-sustainability-goal-heading"
      data-testid="daily-sustainability-goal-card"
      className="rounded-xl border border-[#DCE3DE] bg-white p-6 dark:border-[#22362E] dark:bg-[#111C17]"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-[#EEF2EF] pb-4 sm:flex-row sm:items-center dark:border-[#1D3028]">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF4EF] text-[#165B43] dark:bg-[#163328] dark:text-[#4ADE80]">
            <Leaf className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="daily-sustainability-goal-heading"
              className="text-base font-semibold text-[#13231D] dark:text-[#EDF5F1]"
            >
              Daily Sustainability Goal
            </h2>
            <p className="text-xs text-[#5E726A] dark:text-[#86A094]">
              Commit to one simple air-quality-positive action today.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div
            data-testid="daily-goal-streak"
            className="inline-flex items-center gap-1.5 font-mono text-[#165B43] tabular-nums dark:text-[#4ADE80]"
          >
            <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="font-semibold">
              {status ? `${status.streakDays}-day streak` : '0-day streak'}
            </span>
            <span className="text-[#6B7E76] dark:text-[#86A094]">
              · {status ? status.completedCount7d : 0}/7 days
            </span>
          </div>

          {activeGoal && !editing && (
            <button
              type="button"
              data-testid="daily-goal-change-btn"
              onClick={() => {
                setCustomTitle(activeGoal.presetId === 'custom' ? activeGoal.title : '');
                setEditing(true);
              }}
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-[#165B43] hover:underline dark:text-[#6EE7B7]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Change goal</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-[#F2B5B5] bg-[#FDECEC] px-3.5 py-2.5 text-xs text-[#991B1B] dark:border-[#5C2026] dark:bg-[#2A1417] dark:text-[#FCA5A5]"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-[#F2F6F3] dark:bg-[#16251F]" />
      ) : activeGoal && !editing ? (
        <div className="mt-4">
          <div
            className={`flex flex-col justify-between gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center ${
              activeGoal.completed
                ? 'border-[#B7DFC9] bg-[#F1FAF5] dark:border-[#23523C] dark:bg-[#122B20]'
                : 'border-[#DCE3DE] bg-[#F8FAF8] dark:border-[#21352D] dark:bg-[#15241E]'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={activeGoal.completed}
                data-testid="daily-goal-toggle"
                disabled={saving}
                onClick={handleToggleComplete}
                aria-label={activeGoal.completed ? `Mark "${activeGoal.title}" incomplete` : `Mark "${activeGoal.title}" completed`}
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-60 ${
                  activeGoal.completed
                    ? 'border-[#165B43] bg-[#165B43] text-white dark:border-[#34D399] dark:bg-[#1C7454]'
                    : 'border-[#9FB2A8] bg-white hover:border-[#165B43] dark:border-[#3B594D] dark:bg-[#0E1814] dark:hover:border-[#4ADE80]'
                }`}
              >
                {activeGoal.completed && <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />}
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <p
                    data-testid="daily-goal-active-title"
                    className={`text-sm font-semibold ${
                      activeGoal.completed
                        ? 'text-[#156A3C] line-through decoration-[#165B43]/50 dark:text-[#6EE7B7]'
                        : 'text-[#13231D] dark:text-[#EDF5F1]'
                    }`}
                  >
                    {activeGoal.title}
                  </p>
                  <span
                    data-testid="daily-goal-status-label"
                    className={`text-xs font-medium ${
                      activeGoal.completed
                        ? 'text-[#156A3C] dark:text-[#4ADE80]'
                        : 'text-[#5E726A] dark:text-[#8CA69A]'
                    }`}
                  >
                    {activeGoal.completed ? 'Completed today' : 'Pending for today'}
                  </span>
                </div>

                {activePresetMeta && (
                  <p className="mt-1 text-xs leading-relaxed text-[#4A5D55] dark:text-[#A0B9AD]">
                    {activePresetMeta.impactHint}
                  </p>
                )}

                {activePresetMeta?.cautionNote && (
                  <p className="mt-1.5 inline-flex items-start gap-1.5 text-xs font-medium text-[#9A4B06] dark:text-[#FBBF24]">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>{activePresetMeta.cautionNote}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleComplete}
              disabled={saving}
              className={`inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                activeGoal.completed
                  ? 'border border-[#B7DFC9] bg-white text-[#156A3C] hover:bg-[#EAF5EF] dark:border-[#275A42] dark:bg-[#10241B] dark:text-[#6EE7B7] dark:hover:bg-[#173326]'
                  : 'bg-[#165B43] text-white hover:bg-[#114835] dark:bg-[#1C7454] dark:hover:bg-[#228B65]'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{activeGoal.completed ? 'Mark Incomplete' : 'Mark Completed'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2.5 text-xs font-medium text-[#4A5D55] dark:text-[#9BB5A9]">
              Choose one quick action for today{currentAqi !== null && currentAqi > 150 ? ' (smog-safe options listed first)' : ''}:
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  data-testid={`daily-goal-preset-${preset.id}`}
                  disabled={saving}
                  onClick={() => handleSelectPreset(preset.id, preset.title)}
                  className="group flex flex-col items-start rounded-lg border border-[#DCE3DE] bg-[#F8FAF8] px-3.5 py-2.5 text-left transition-colors hover:border-[#165B43] hover:bg-[#F1F8F4] disabled:opacity-60 dark:border-[#22362E] dark:bg-[#15241E] dark:hover:border-[#34D399] dark:hover:bg-[#193026]"
                >
                  <span className="text-xs font-semibold text-[#13231D] group-hover:text-[#165B43] dark:text-[#EDF5F1] dark:group-hover:text-[#6EE7B7]">
                    {preset.title}
                  </span>
                  <span className="mt-0.5 text-[11px] leading-snug text-[#5E726A] dark:text-[#8CA69A]">
                    {preset.cautionNote ? preset.cautionNote : preset.impactHint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSaveCustom} className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <label htmlFor="daily-goal-custom-input" className="sr-only">
              Write your own daily sustainability goal
            </label>
            <input
              id="daily-goal-custom-input"
              data-testid="daily-goal-custom-input"
              type="text"
              maxLength={100}
              value={customTitle}
              onChange={(e) => {
                setCustomTitle(e.target.value);
                setSelectedPresetId('custom');
              }}
              placeholder="Or type a custom goal (e.g., Run HEPA purifier on sleep mode, carpool to office)..."
              className="flex-1 rounded-lg border border-[#D4DDD7] bg-white px-3.5 py-2 text-xs text-[#13231D] placeholder:text-[#7A8E86] focus:border-[#165B43] focus:outline-none dark:border-[#243B32] dark:bg-[#0D1713] dark:text-[#ECF4F0] dark:placeholder:text-[#6A8378] dark:focus:border-[#34D399]"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                data-testid="daily-goal-save-btn"
                disabled={saving || customTitle.trim().length < 2}
                className="whitespace-nowrap rounded-lg bg-[#165B43] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#114835] disabled:opacity-50 dark:bg-[#1C7454] dark:hover:bg-[#228B65]"
              >
                {saving ? 'Saving...' : 'Set Today’s Goal'}
              </button>
              {activeGoal && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="whitespace-nowrap rounded-lg border border-[#D4DDD7] px-3 py-2 text-xs font-medium text-[#4A5D55] hover:bg-[#F4F7F5] dark:border-[#243B32] dark:text-[#9BB5A9] dark:hover:bg-[#182A23]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </section>
  );
};
