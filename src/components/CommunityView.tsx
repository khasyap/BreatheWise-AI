import React, { useState } from 'react';
import { ShieldCheck, Users, Check, Plus } from 'lucide-react';
import { api } from '../services/api';
import type { CommunityCampaign } from '../types/breathewise';

interface CommunityViewProps {
  campaigns: CommunityCampaign[];
  leaderboard: Array<{ cluster: string; participants: number; estimatedCo2Kg: number; primaryDrive: string }>;
  onRefreshCommunity: () => Promise<void>;
}

const COMMUNITY_EVENTS = [
  {
    date: 'Saturday · 10:00 AM',
    title: 'RWA Winter Leaf Composting & Guard Heater Distribution Workshop',
    scope: 'Residential Associations · Online & Community Hall',
  },
  {
    date: 'Wednesday · 06:30 PM',
    title: 'Parent & School Indoor Recess Air-Quality Protocol Briefing',
    scope: 'Local Parent-Teacher Networks · Virtual Session',
  },
  {
    date: 'Next Sunday · 09:30 AM',
    title: 'Metro Feeder & Office Carpool Coordination Meetup',
    scope: 'Major Transit Corridors · Ward Volunteers',
  },
];

export const CommunityView: React.FC<CommunityViewProps> = ({
  campaigns,
  leaderboard,
  onRefreshCommunity,
}) => {
  const [busyId, setBusyId] = useState<number | null>(null);

  async function handleJoinOrLog(id: number) {
    setBusyId(id);
    try {
      await api.joinCommunityCampaign(id);
      await onRefreshCommunity();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E2E8E4] pb-6">
        <p className="text-xs font-medium text-[#546860]">
          Voluntary Clean-Air Challenges · Privacy-Preserving Ward Aggregates
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#13231D]">Community Clean Air Hub</h1>
        <p className="mt-1 text-sm text-[#4A5D55]">
          Join neighborhood transit, zero-burning, and household energy initiatives while keeping your home address and daily routines strictly private.
        </p>
      </div>

      {/* Privacy Guarantee */}
      <div className="flex items-start gap-3 rounded-xl border border-[#DCE3DE] bg-[#F3F8F5] p-4 text-xs text-[#2D4039]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#165B43]" />
        <p>
          <strong className="text-[#13231D]">Privacy-first community reporting:</strong> BreatheWise AI publishes only ward-level aggregate counts and collective CO₂e estimates. Individual households, street addresses, and personal daily schedules are never exposed.
        </p>
      </div>

      {/* Voluntary Challenges Grid */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[#13231D]">Voluntary Clean-Air Challenges</h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {campaigns.map((c) => {
            const pct = Math.min(100, Math.round((c.currentParticipants / c.targetParticipants) * 100));
            return (
              <article
                key={c.id}
                className="flex flex-col justify-between rounded-xl border border-[#DCE3DE] bg-white p-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#5E726A]">
                    <span>
                      {c.category} · {c.durationDays} days · {c.status}
                    </span>
                    <span className="font-mono font-medium text-[#165B43] tabular-nums">
                      {c.collectiveCo2Kg.toLocaleString()} kg CO₂e
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#13231D]">{c.title}</h3>
                  <p className="text-xs leading-relaxed text-[#4A5D55]">{c.description}</p>
                  <p className="text-xs text-[#5E726A]">Area scope: {c.neighborhood}</p>

                  <div className="pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[#13231D] tabular-nums">
                        <Users className="h-3.5 w-3.5 text-[#165B43]" />
                        {c.currentParticipants} / {c.targetParticipants} participants
                      </span>
                      <span className="font-mono text-[#5E726A] tabular-nums">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EEF2EF]">
                      <div className="h-full rounded-full bg-[#165B43]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#EEF2EF] pt-4">
                  <span className="text-xs text-[#5E726A]">
                    {c.joinedByMe
                      ? `Participating · ${c.myActionsLogged} action${c.myActionsLogged === 1 ? '' : 's'} logged`
                      : 'Open voluntary enrollment'}
                  </span>
                  <button
                    type="button"
                    disabled={busyId === c.id}
                    onClick={() => handleJoinOrLog(c.id)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
                      c.joinedByMe
                        ? 'border border-[#165B43] bg-[#F2F8F5] text-[#165B43] hover:bg-[#E4F2EC]'
                        : 'bg-[#165B43] text-white hover:bg-[#114835]'
                    }`}
                  >
                    {c.joinedByMe ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>{busyId === c.id ? 'Updating...' : 'Log Check-in (+1)'}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>{busyId === c.id ? 'Joining...' : 'Join Challenge'}</span>
                      </>
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Aggregated Leaderboard + Events */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-7">
          <h2 className="text-base font-semibold text-[#13231D]">Aggregated Neighborhood Impact Leaderboard</h2>
          <p className="mt-1 text-xs text-[#5E726A]">Anonymized ward &amp; transit-corridor clusters (no individual tracking).</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E2E8E4] text-[#546860]">
                  <th className="py-2 pr-3 font-medium">Cluster</th>
                  <th className="py-2 pr-3 font-medium">Primary Drive</th>
                  <th className="py-2 pr-3 text-right font-medium">Participants</th>
                  <th className="py-2 text-right font-medium">Est. CO₂e Avoided</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2EF]">
                {leaderboard.map((row) => (
                  <tr key={row.cluster}>
                    <td className="py-3 pr-3 font-medium text-[#13231D]">{row.cluster}</td>
                    <td className="py-3 pr-3 text-[#4A5D55]">{row.primaryDrive}</td>
                    <td className="py-3 pr-3 text-right font-mono text-[#13231D] tabular-nums">{row.participants}</td>
                    <td className="py-3 text-right font-mono font-medium text-[#165B43] tabular-nums">
                      {row.estimatedCo2Kg.toLocaleString()} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-5">
          <h2 className="text-base font-semibold text-[#13231D]">Community Events &amp; Briefings</h2>
          <ul className="mt-4 divide-y divide-[#EEF2EF]">
            {COMMUNITY_EVENTS.map((ev) => (
              <li key={ev.title} className="py-3.5 first:pt-0 last:pb-0">
                <span className="font-mono text-[11px] text-[#165B43]">{ev.date}</span>
                <p className="mt-1 text-sm font-medium text-[#13231D]">{ev.title}</p>
                <p className="mt-0.5 text-xs text-[#5E726A]">{ev.scope}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};
