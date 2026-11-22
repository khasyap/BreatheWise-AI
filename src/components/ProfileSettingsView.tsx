import React, { useState } from 'react';
import { LogOut, MapPin, Monitor, Moon, Save, Shield, Sun, Trash2, UserCheck } from 'lucide-react';
import { api, setAuthToken } from '../services/api';
import type { ResolvedTheme, ThemePreference } from '../lib/theme';
import type { CommuteMode, HouseholdProfile, LocationInfo, UserAccount } from '../types/breathewise';

interface ProfileSettingsViewProps {
  user: UserAccount;
  profile: HouseholdProfile;
  savedLocations: LocationInfo[];
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  onChangeTheme: (next: ThemePreference) => void;
  onAuthSuccess: (user: UserAccount) => Promise<void>;
  onLogout: () => Promise<void>;
  onProfileSaved: (updated: HouseholdProfile) => void;
  onSelectLocation: (loc: LocationInfo) => Promise<void>;
  onDeleteLocation: (id: number) => Promise<void>;
  onOpenLocationModal: () => void;
}

const PERSONA_OPTIONS: Array<{ value: HouseholdProfile['personaType']; label: string }> = [
  { value: 'family_children', label: 'Family with school-age children' },
  { value: 'parents_infants', label: 'Parents with infants & toddlers' },
  { value: 'elderly', label: 'Elderly individual / senior household' },
  { value: 'student', label: 'Student / campus community' },
  { value: 'office_commuter', label: 'Office employee / hybrid commuter' },
  { value: 'outdoor_worker', label: 'Outdoor worker / delivery professional' },
  { value: 'respiratory_sensitive', label: 'Household with respiratory sensitivity' },
  { value: 'eco_citizen', label: 'Environmentally conscious citizen' },
  { value: 'community_association', label: 'Residential community / RWA coordinator' },
];

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  user,
  profile,
  savedLocations,
  themePreference,
  resolvedTheme,
  onChangeTheme,
  onAuthSuccess,
  onLogout,
  onProfileSaved,
  onSelectLocation,
  onDeleteLocation,
  onOpenLocationModal,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [draft, setDraft] = useState<HouseholdProfile>(profile);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const res =
        authMode === 'register'
          ? await api.register({ name: authName.trim(), email: authEmail.trim(), password: authPassword })
          : await api.login({ email: authEmail.trim(), password: authPassword });
      setAuthToken(res.token);
      setAuthPassword('');
      await onAuthSuccess(res.user);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const { profile: saved } = await api.updateProfile(draft);
      onProfileSaved(saved);
      setProfileMsg('Household personalization saved. Dashboard, AI Assistant, and Daily Planner updated.');
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-[#E2E8E4] pb-6">
        <p className="text-xs font-medium text-[#546860]">
          Appearance · Account Security (bcrypt + JWT) · Household Personalization · Saved Locations
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#13231D]">Profile &amp; Household Settings</h1>
        <p className="mt-1 text-sm text-[#4A5D55]">
          Personalize theme preferences and recommendations for your family without providing sensitive clinical medical records.
        </p>
      </div>

      {/* Appearance & Theme Selector */}
      <section className="rounded-2xl border border-[#DCE3DE] bg-white p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-[#13231D]">Appearance &amp; Theme</h2>
            <p className="text-xs text-[#5E726A]">
              Choose System to automatically follow your device appearance, or lock BreatheWise AI to Light or Dark mode.
            </p>
          </div>
          <span className="font-mono text-xs text-[#546860] tabular-nums">
            Active: <strong className="capitalize text-[#13231D]">{resolvedTheme}</strong>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Appearance theme preference">
          {(
            [
              {
                id: 'system',
                title: 'System Default',
                description: 'Automatically matches your OS light or dark setting.',
                icon: Monitor,
              },
              {
                id: 'light',
                title: 'Light Theme',
                description: 'Crisp daytime alabaster canvas with botanical contrast.',
                icon: Sun,
              },
              {
                id: 'dark',
                title: 'Dark Theme',
                description: 'Low-glare forest-obsidian surfaces for evening reading.',
                icon: Moon,
              },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon;
            const selected = themePreference === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChangeTheme(opt.id)}
                className={`flex flex-col items-start rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? 'border-[#165B43] bg-[#F3F8F5] dark:border-[#34D399] dark:bg-[#142D24]'
                    : 'border-[#DCE3DE] bg-[#FAFBFA] hover:border-[#165B43] dark:border-[#23372F] dark:bg-[#15241E]'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <Icon
                    className={`h-4 w-4 ${selected ? 'text-[#165B43] dark:text-[#4ADE80]' : 'text-[#5E726A]'}`}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[11px] font-medium text-[#165B43] dark:text-[#4ADE80]">
                    {selected ? 'Selected' : ''}
                  </span>
                </div>
                <p className="mt-2.5 text-sm font-semibold text-[#13231D]">{opt.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#5E726A]">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Account & Authentication */}
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#13231D]">Account &amp; Sync</h2>
            <Shield className="h-4 w-4 text-[#165B43]" />
          </div>

          {!user.isGuest ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-[#F3F8F5] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#13231D]">
                  <UserCheck className="h-4 w-4 text-[#165B43]" />
                  <span>{user.name}</span>
                </div>
                <p className="mt-1 font-mono text-xs text-[#546860]">{user.email}</p>
                <p className="mt-2 text-xs text-[#4A5D55]">
                  Signed in securely. Your household profile, saved cities, routine checkoffs, and sustainability impact are persisted privately.
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D4DDD7] bg-white px-4 py-2 text-sm font-medium text-[#13231D] hover:bg-[#FDECEC] hover:text-[#B91C1C]"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-xs leading-relaxed text-[#4A5D55]">
                Currently using <strong>Guest Mode</strong>. Create a free account or sign in to preserve your family profile and impact history across devices.
              </p>

              <div className="inline-flex rounded-lg bg-[#F1F5F2] p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'register'}
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    authMode === 'register' ? 'bg-white text-[#13231D] shadow-sm' : 'text-[#546860]'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={authMode === 'login'}
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    authMode === 'login' ? 'bg-white text-[#13231D] shadow-sm' : 'text-[#546860]'
                  }`}
                >
                  Sign In
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {authMode === 'register' && (
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-medium text-[#4A5D55]">
                      Full Name or Household Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g., Sharma Family"
                      className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 text-sm focus:border-[#165B43] focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-xs font-medium text-[#4A5D55]">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 text-sm focus:border-[#165B43] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="block text-xs font-medium text-[#4A5D55]">
                    Password {authMode === 'register' ? '(min 8 characters)' : ''}
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={authMode === 'register' ? 8 : 1}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 text-sm focus:border-[#165B43] focus:bg-white focus:outline-none"
                  />
                </div>

                {authError && (
                  <p role="alert" className="text-xs font-medium text-[#B91C1C]">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full rounded-lg bg-[#165B43] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#114835] disabled:opacity-60"
                >
                  {authBusy
                    ? 'Please wait...'
                    : authMode === 'register'
                      ? 'Create Secure Account'
                      : 'Sign In'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Household Personalization Form */}
        <div className="rounded-xl border border-[#DCE3DE] bg-white p-6 lg:col-span-7">
          <h2 className="text-base font-semibold text-[#13231D]">Household Composition &amp; Commute</h2>
          <form onSubmit={handleSaveProfile} className="mt-4 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="persona-select" className="block text-xs font-medium text-[#4A5D55]">
                  Primary Household Profile
                </label>
                <select
                  id="persona-select"
                  value={draft.personaType}
                  onChange={(e) =>
                    setDraft({ ...draft, personaType: e.target.value as HouseholdProfile['personaType'] })
                  }
                  className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 text-sm focus:border-[#165B43] focus:bg-white focus:outline-none"
                >
                  {PERSONA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="household-size" className="block text-xs font-medium text-[#4A5D55]">
                  Household Size (members)
                </label>
                <input
                  id="household-size"
                  type="number"
                  min={1}
                  max={20}
                  value={draft.householdSize}
                  onChange={(e) => setDraft({ ...draft, householdSize: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="commute-mode" className="block text-xs font-medium text-[#4A5D55]">
                  Primary Daily Commute Mode
                </label>
                <select
                  id="commute-mode"
                  value={draft.commuteMode}
                  onChange={(e) => setDraft({ ...draft, commuteMode: e.target.value as CommuteMode })}
                  className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 text-sm"
                >
                  <option value="petrol_car">Petrol Car</option>
                  <option value="diesel_car">Diesel Car</option>
                  <option value="two_wheeler">Two-Wheeler / Scooter</option>
                  <option value="public_bus">Public Bus</option>
                  <option value="metro_rail">Metro / Electric Rail</option>
                  <option value="cycling_walking">Cycling / Walking</option>
                  <option value="remote_wfh">Remote / Work from Home</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="commute-km" className="block text-xs font-medium text-[#4A5D55]">
                    Daily Round-Trip (km)
                  </label>
                  <input
                    id="commute-km"
                    type="number"
                    min={0}
                    max={200}
                    value={draft.dailyCommuteKm}
                    onChange={(e) => setDraft({ ...draft, dailyCommuteKm: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 font-mono text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="currency-select" className="block text-xs font-medium text-[#4A5D55]">
                    Currency
                  </label>
                  <select
                    id="currency-select"
                    value={draft.currency}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value as 'INR' | 'USD' })}
                    className="mt-1 w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] px-3 py-2 text-sm"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>
            </div>

            <fieldset className="space-y-2 border-t border-[#EEF2EF] pt-4">
              <legend className="text-xs font-semibold text-[#13231D]">
                Household Sensitivity Factors (no clinical data collected)
              </legend>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(
                  [
                    ['hasInfants', 'Infants / toddlers under 3'],
                    ['hasChildren', 'School-age children'],
                    ['hasElderly', 'Elderly members (65+)'],
                    ['hasOutdoorWorkers', 'Outdoor workers / delivery commuters'],
                    ['hasRespiratorySensitivity', 'General respiratory sensitivity'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-xs text-[#2D4039]">
                    <input
                      type="checkbox"
                      checked={draft[key]}
                      onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                      className="h-4 w-4 rounded accent-[#165B43]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {profileMsg && <p className="text-xs font-medium text-[#165B43]">{profileMsg}</p>}

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-[#165B43] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#114835] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              <span>{savingProfile ? 'Saving...' : 'Save Household Profile'}</span>
            </button>
          </form>
        </div>
      </section>

      {/* Saved Locations Section */}
      <section className="rounded-xl border border-[#DCE3DE] bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#13231D]">Saved Monitoring Locations</h2>
            <p className="text-xs text-[#5E726A]">Switch quickly between home, school, office, or family cities.</p>
          </div>
          <button
            type="button"
            onClick={onOpenLocationModal}
            className="whitespace-nowrap rounded-lg border border-[#165B43] bg-[#F2F8F5] px-3.5 py-2 text-xs font-medium text-[#165B43] hover:bg-[#E4F2EC]"
          >
            + Add Location
          </button>
        </div>
        <ul className="mt-4 divide-y divide-[#EEF2EF]">
          {savedLocations.map((loc) => (
            <li key={loc.id ?? loc.name} className="flex items-center justify-between py-3">
              <button
                type="button"
                onClick={() => onSelectLocation(loc)}
                className="flex items-center gap-2.5 text-left text-sm"
              >
                <MapPin className={`h-4 w-4 ${loc.isPrimary ? 'text-[#165B43]' : 'text-[#8A9D95]'}`} />
                <div>
                  <span className="font-medium text-[#13231D]">{loc.name}</span>
                  <span className="ml-2 text-xs text-[#5E726A]">
                    {loc.admin1 ? `${loc.admin1}, ` : ''}
                    {loc.country} · {loc.countryCode === 'IN' ? 'CPCB NAQI' : 'US EPA'}
                    {loc.isPrimary ? ' · Primary' : ''}
                  </span>
                </div>
              </button>
              {loc.id && savedLocations.length > 1 && (
                <button
                  type="button"
                  onClick={() => onDeleteLocation(loc.id!)}
                  aria-label={`Remove ${loc.name}`}
                  className="rounded p-1.5 text-[#7A8C85] hover:bg-[#FDECEC] hover:text-[#B91C1C]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
