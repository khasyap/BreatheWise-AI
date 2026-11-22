import React, { useState } from 'react';
import { Check, Save, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import type { NotificationSettings, SmartAlert } from '../types/breathewise';

interface NotificationsViewProps {
  alerts: SmartAlert[];
  settings: NotificationSettings;
  onRefreshAlerts: () => Promise<void>;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  alerts,
  settings,
  onRefreshAlerts,
}) => {
  const [draft, setDraft] = useState<NotificationSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      await api.updateAlertSettings(draft);
      await onRefreshAlerts();
      setSavedMsg('Alert thresholds and family notification preferences saved.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkRead(alertId: string) {
    await api.markAlertRead(alertId);
    await onRefreshAlerts();
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E2E8E4] pb-6">
        <p className="text-xs font-medium text-[#546860]">
          Structured 5-Part Alerts · Anti-Fatigue Thresholds · Sensitive-Group Guidance
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#13231D]">Family Protection &amp; Smart Alerts</h1>
        <p className="mt-1 text-sm text-[#4A5D55]">
          Every alert clearly states what happened, where it occurred, why it matters, what action to take, and when to check again.
        </p>
      </div>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Active Alerts List */}
        <div className="space-y-4 lg:col-span-7">
          <h2 className="text-base font-semibold text-[#13231D]">
            Active Alerts ({alerts.filter((a) => !a.isRead).length} unread)
          </h2>

          {alerts.length === 0 ? (
            <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 text-sm text-[#546860]">
              No active pollution alerts for your configured thresholds and household profile right now.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((al) => (
                <article
                  key={al.id}
                  className={`rounded-xl border p-5 ${
                    al.isRead ? 'border-[#E6ECE8] bg-[#F8FAF9] opacity-80' : 'border-[#DCE3DE] bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF2EF] pb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <ShieldAlert
                        className={`h-4 w-4 ${
                          al.severity === 'critical'
                            ? 'text-[#B91C1C]'
                            : al.severity === 'high'
                              ? 'text-[#C2410C]'
                              : 'text-[#B45309]'
                        }`}
                      />
                      <span className="font-semibold text-[#13231D]">{al.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#5E726A]">For: {al.targetGroup}</span>
                    </div>

                    {!al.isRead ? (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(al.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#165B43] hover:underline"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    ) : (
                      <span className="text-xs text-[#6B7E76]">Acknowledged</span>
                    )}
                  </div>

                  <dl className="mt-3 space-y-2 text-xs">
                    <div>
                      <dt className="inline font-semibold text-[#13231D]">1. What happened: </dt>
                      <dd className="inline text-[#354941]">{al.whatHappened}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-[#13231D]">2. Where: </dt>
                      <dd className="inline text-[#354941]">{al.whereHappened}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-[#13231D]">3. Why it matters: </dt>
                      <dd className="inline text-[#354941]">{al.whyItMatters}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-[#165B43]">4. What to do: </dt>
                      <dd className="inline font-medium text-[#13231D]">{al.whatToDo}</dd>
                    </div>
                    <div>
                      <dt className="inline font-semibold text-[#13231D]">5. Next check: </dt>
                      <dd className="inline font-mono text-[#546860]">{al.checkAgainAt}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Threshold Configuration Panel */}
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-5">
          <h2 className="text-base font-semibold text-[#13231D]">Alert Thresholds &amp; Quiet Hours</h2>
          <p className="mt-1 text-xs text-[#5E726A]">
            Tailor thresholds to prevent alert fatigue while protecting vulnerable family members.
          </p>

          <form onSubmit={handleSaveSettings} className="mt-5 space-y-4">
            <div>
              <label htmlFor="severe-aqi-threshold" className="block text-xs font-medium text-[#4A5D55]">
                Severe AQI Alert Threshold (50 – 450)
              </label>
              <input
                id="severe-aqi-threshold"
                type="number"
                min={50}
                max={450}
                value={draft.severeAqiThreshold}
                onChange={(e) => setDraft({ ...draft, severeAqiThreshold: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 font-mono text-sm tabular-nums focus:border-[#165B43] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="pm25-spike-threshold" className="block text-xs font-medium text-[#4A5D55]">
                PM2.5 Spike Alert Threshold (µg/m³)
              </label>
              <input
                id="pm25-spike-threshold"
                type="number"
                min={25}
                max={350}
                value={draft.pm25SpikeThreshold}
                onChange={(e) => setDraft({ ...draft, pm25SpikeThreshold: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 font-mono text-sm tabular-nums focus:border-[#165B43] focus:bg-white focus:outline-none"
              />
            </div>

            <fieldset className="space-y-2.5 border-t border-[#EEF2EF] pt-4">
              <legend className="text-xs font-semibold text-[#13231D]">Tailored Group Notifications</legend>
              {(
                [
                  ['notifyChildren', 'Children & Infants Protection Alerts'],
                  ['notifyElderly', 'Elderly Household Member Alerts'],
                  ['notifyOutdoorWorker', 'Outdoor Worker & Commuter Shift Alerts'],
                  ['notifyGeneral', 'General Household & Routine Alerts'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2.5 text-xs text-[#2D4039]">
                  <input
                    type="checkbox"
                    checked={draft[key]}
                    onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                    className="h-4 w-4 rounded accent-[#165B43]"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>

            <div className="grid grid-cols-2 gap-3 border-t border-[#EEF2EF] pt-4">
              <div>
                <label htmlFor="quiet-start" className="block text-xs font-medium text-[#4A5D55]">
                  Quiet Hours Start
                </label>
                <input
                  id="quiet-start"
                  type="time"
                  value={draft.quietHoursStart}
                  onChange={(e) => setDraft({ ...draft, quietHoursStart: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-2.5 py-2 font-mono text-xs tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="quiet-end" className="block text-xs font-medium text-[#4A5D55]">
                  Quiet Hours End
                </label>
                <input
                  id="quiet-end"
                  type="time"
                  value={draft.quietHoursEnd}
                  onChange={(e) => setDraft({ ...draft, quietHoursEnd: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-2.5 py-2 font-mono text-xs tabular-nums"
                />
              </div>
            </div>

            {savedMsg && <p className="text-xs font-medium text-[#165B43]">{savedMsg}</p>}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#165B43] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#114835] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Alert Preferences'}</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};
