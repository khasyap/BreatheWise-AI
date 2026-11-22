import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  BookOpen,
  CalendarCheck,
  Calculator,
  Home,
  LayoutDashboard,
  Leaf,
  MapPin,
  Menu,
  MessageSquareText,
  Monitor,
  Moon,
  Settings,
  Sun,
  Users,
  Wind,
  X,
} from 'lucide-react';
import { api, setAuthToken } from './services/api';
import { useTheme } from './hooks/useTheme';
import { getNextThemePreference, getThemeLabel, type ThemePreference } from './lib/theme';
import { LocationModal } from './components/LocationModal';
import { DashboardView } from './components/DashboardView';
import { AirQualityView } from './components/AirQualityView';
import { AiAssistantView } from './components/AiAssistantView';
import { DailyPlannerView } from './components/DailyPlannerView';
import { IndoorAirView } from './components/IndoorAirView';
import { SustainableLivingView } from './components/SustainableLivingView';
import { ImpactTrackerView } from './components/ImpactTrackerView';
import { CommunityView } from './components/CommunityView';
import { EducationView } from './components/EducationView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import type {
  AirQualityPayload,
  CommunityCampaign,
  HouseholdProfile,
  LocationInfo,
  NotificationSettings,
  SmartAlert,
  SustainabilityActivityRecord,
  UserAccount,
} from './types/breathewise';
import type { AggregatedImpact, EmissionActionDefinition, PersonalizedSustainableAlternative } from './lib/impactCalculator';

type ViewId =
  | 'dashboard'
  | 'air-quality'
  | 'assistant'
  | 'planner'
  | 'indoor'
  | 'sustainable'
  | 'impact'
  | 'community'
  | 'education'
  | 'notifications'
  | 'profile';

interface NavGroup {
  label: string;
  items: Array<{ id: ViewId; label: string; icon: React.ComponentType<{ className?: string }> }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Monitor',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'air-quality', label: 'Air Quality', icon: Activity },
    ],
  },
  {
    label: 'Daily Guidance',
    items: [
      { id: 'assistant', label: 'AI Assistant', icon: MessageSquareText },
      { id: 'planner', label: 'Daily Planner', icon: CalendarCheck },
      { id: 'indoor', label: 'Indoor Air', icon: Home },
    ],
  },
  {
    label: 'Sustainability',
    items: [
      { id: 'sustainable', label: 'Sustainable Living', icon: Leaf },
      { id: 'impact', label: 'Impact Tracker', icon: Calculator },
      { id: 'community', label: 'Community', icon: Users },
    ],
  },
  {
    label: 'Protect & Learn',
    items: [
      { id: 'education', label: 'Education', icon: BookOpen },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'Profile & Settings', icon: Settings },
    ],
  },
];

const VIEW_TITLES: Record<ViewId, string> = {
  dashboard: 'Dashboard',
  'air-quality': 'Air Quality',
  assistant: 'AI Assistant',
  planner: 'Daily Planner',
  indoor: 'Indoor Air',
  sustainable: 'Sustainable Living',
  impact: 'Impact Tracker',
  community: 'Community',
  education: 'Education',
  notifications: 'Notifications',
  profile: 'Profile & Settings',
};

const FALLBACK_PROFILE: HouseholdProfile = {
  personaType: 'family_children',
  householdSize: 4,
  hasInfants: false,
  hasChildren: true,
  hasElderly: true,
  hasOutdoorWorkers: false,
  hasRespiratorySensitivity: true,
  commuteMode: 'petrol_car',
  dailyCommuteKm: 18,
  budgetTier: 'moderate',
  currency: 'INR',
  indoorProfile: {
    rooms: 3,
    primaryRoomAreaSqFt: 240,
    ceilingHeightFt: 10,
    ventilationType: 'single_side',
    hasAirPurifier: true,
    purifierCadrM3h: 350,
    cookingFuel: 'lpg',
    hasKitchenExhaust: true,
    concerns: ['winter_smog'],
  },
};

const FALLBACK_NOTIF_SETTINGS: NotificationSettings = {
  severeAqiThreshold: 300,
  pm25SpikeThreshold: 120,
  notifyChildren: true,
  notifyElderly: true,
  notifyOutdoorWorker: true,
  notifyGeneral: true,
  quietHoursStart: '22:30',
  quietHoursEnd: '06:30',
};

export default function App() {
  const { themePreference, resolvedTheme, setThemePreference } = useTheme();
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [user, setUser] = useState<UserAccount>({ id: 0, email: '', name: 'Guest Household', isGuest: true });
  const [profile, setProfile] = useState<HouseholdProfile>(FALLBACK_PROFILE);
  const [savedLocations, setSavedLocations] = useState<LocationInfo[]>([]);
  const [airData, setAirData] = useState<AirQualityPayload | null>(null);
  const [loadingAir, setLoadingAir] = useState(true);

  const [alerts, setAlerts] = useState<SmartAlert[]>([]);
  const [alertSettings, setAlertSettings] = useState<NotificationSettings>(FALLBACK_NOTIF_SETTINGS);

  const [impactCurrency, setImpactCurrency] = useState<'INR' | 'USD'>('INR');
  const [impactCatalog, setImpactCatalog] = useState<EmissionActionDefinition[]>([]);
  const [sustainableAlternatives, setSustainableAlternatives] = useState<PersonalizedSustainableAlternative[]>([]);
  const [impactRecords, setImpactRecords] = useState<SustainabilityActivityRecord[]>([]);
  const [aggregatedImpact, setAggregatedImpact] = useState<AggregatedImpact | null>(null);
  const [communityContrib, setCommunityContrib] = useState<{ collectiveCo2Kg: number; activeParticipants: number } | null>(null);

  const [campaigns, setCampaigns] = useState<CommunityCampaign[]>([]);
  const [leaderboard, setLeaderboard] = useState<
    Array<{ cluster: string; participants: number; estimatedCo2Kg: number; primaryDrive: string }>
  >([]);

  const loadAir = useCallback(async (forceRefresh = false) => {
    setLoadingAir(true);
    try {
      const data = await api.getAirQuality(forceRefresh);
      setAirData(data);
    } finally {
      setLoadingAir(false);
    }
  }, []);

  const loadImpact = useCallback(async () => {
    const res = await api.getImpact();
    setImpactCurrency(res.currency);
    setImpactCatalog(res.catalog);
    setSustainableAlternatives(res.personalizedAlternatives);
    setImpactRecords(res.records);
    setAggregatedImpact(res.aggregated);
    setCommunityContrib(res.communityContribution);
  }, []);

  const loadAlerts = useCallback(async () => {
    const res = await api.getAlerts();
    setAlerts(res.alerts);
    setAlertSettings(res.settings);
  }, []);

  const loadCommunity = useCallback(async () => {
    const res = await api.getCommunity();
    setCampaigns(res.campaigns);
    setLeaderboard(res.leaderboard);
  }, []);

  const bootstrapAll = useCallback(async () => {
    const [profileRes, locsRes] = await Promise.all([api.getProfile(), api.getSavedLocations()]);
    setProfile(profileRes.profile);
    setUser(profileRes.user);
    setSavedLocations(locsRes.locations);

    await Promise.all([loadAir(false), loadImpact(), loadAlerts(), loadCommunity()]);
  }, [loadAir, loadImpact, loadAlerts, loadCommunity]);

  useEffect(() => {
    bootstrapAll().catch(() => {
      setLoadingAir(false);
    });
  }, [bootstrapAll]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  async function handleSelectLocation(loc: LocationInfo) {
    if (loc.id) {
      await api.setPrimaryLocation(loc.id);
    } else {
      await api.saveLocation({ ...loc, makePrimary: true });
    }
    const locsRes = await api.getSavedLocations();
    setSavedLocations(locsRes.locations);
    await Promise.all([loadAir(false), loadAlerts(), loadImpact()]);
  }

  async function handleDeleteLocation(id: number) {
    await api.deleteLocation(id);
    const locsRes = await api.getSavedLocations();
    setSavedLocations(locsRes.locations);
  }

  async function handleLogout() {
    setAuthToken(null);
    await bootstrapAll();
  }

  const unreadCount = alerts.filter((a) => !a.isRead).length;
  const locationKey = airData
    ? `${airData.location.latitude.toFixed(2)}_${airData.location.longitude.toFixed(2)}_${profile.householdSize}_${profile.hasChildren}_${profile.hasElderly}`
    : 'init';

  function navigate(view: string) {
    setActiveView(view as ViewId);
    setMobileMenuOpen(false);
  }

  const themeOptions: Array<{
    id: ThemePreference;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div className="flex min-h-screen bg-[#F4F7F5] text-[#11221C] transition-colors dark:bg-[#0A110E] dark:text-[#ECF4F0]">
      {/* Desktop Left Sidebar */}
      <aside className="hidden w-[256px] shrink-0 flex-col border-r border-white/5 bg-[#0F241D] text-[#E8F0EC] lg:flex dark:border-[#1A2B24] dark:bg-[#070E0B]">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6 dark:border-[#182721]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#6EE7B7]/25 bg-[#165B43]/35">
            <Wind className="h-4 w-4 text-[#6EE7B7]" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className="block font-display text-base font-bold tracking-tight text-white whitespace-nowrap">
              BreatheWise AI
            </span>
            <span className="block text-[10px] font-medium text-[#89A79B]">Environmental Health</span>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[11px] font-medium text-[#83A195]">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => navigate(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? 'bg-white/14 text-white shadow-xs dark:bg-[#163026] dark:text-[#ECF4F0]'
                            : 'text-[#B9CFC5] hover:bg-white/6 hover:text-white dark:text-[#98B2A7] dark:hover:bg-[#11221B]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#6EE7B7]' : ''}`}
                            aria-hidden="true"
                          />
                          <span>{item.label}</span>
                        </span>
                        {item.id === 'notifications' && unreadCount > 0 && (
                          <span className="font-mono text-xs font-semibold text-[#FCD34D] tabular-nums">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-xs text-[#9BB4A9] dark:border-[#182721]">
          <p className="font-medium text-white truncate">{user.name}</p>
          <p className="mt-0.5 truncate text-[11px]">
            {user.isGuest ? 'Guest Mode · Local sync' : user.email}
          </p>
          <p className="mt-2 font-mono text-[10px] text-[#7D9D90]">
            Theme: {getThemeLabel(themePreference)}
            {themePreference === 'system' ? ` (${resolvedTheme})` : ''}
          </p>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          data-testid="mobile-sidebar-drawer"
          className="fixed inset-0 z-50 flex h-[100dvh] w-screen lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div
            className="fixed inset-0 z-0 bg-[#081510]/65 backdrop-blur-xs"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[280px] max-w-[82vw] flex-col overflow-hidden border-r border-white/10 bg-[#0F241D] text-[#E8F0EC] shadow-2xl dark:border-[#1A2B24] dark:bg-[#070E0B]">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5 dark:border-[#182721]">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#6EE7B7]/25 bg-[#165B43]/35">
                  <Wind className="h-4 w-4 text-[#6EE7B7]" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <span className="block truncate font-display text-base font-bold tracking-tight text-white">
                    BreatheWise AI
                  </span>
                  <span className="block truncate text-[10px] font-medium text-[#89A79B]">
                    Environmental Health
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="rounded-lg p-2 text-[#B9CFC5] transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav
              className="flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4"
              aria-label="Mobile navigation"
            >
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="px-3 pb-1.5 text-[11px] font-medium text-[#83A195]">{group.label}</p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => navigate(item.id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                              isActive
                                ? 'bg-white/14 text-white shadow-xs dark:bg-[#163026] dark:text-[#ECF4F0]'
                                : 'text-[#B9CFC5] hover:bg-white/8 hover:text-white dark:text-[#98B2A7] dark:hover:bg-[#11221B]'
                            }`}
                          >
                            <span className="flex items-center gap-2.5">
                              <Icon
                                className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#6EE7B7]' : ''}`}
                                aria-hidden="true"
                              />
                              <span>{item.label}</span>
                            </span>
                            {item.id === 'notifications' && unreadCount > 0 && (
                              <span className="font-mono text-xs font-semibold text-[#FCD34D] tabular-nums">
                                {unreadCount}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Mobile Drawer Footer: Theme Selector + Account */}
            <div className="shrink-0 space-y-3 border-t border-white/10 px-4 py-4 dark:border-[#182721]">
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-[#83A195]">Appearance</p>
                <div
                  data-testid="mobile-theme-switcher"
                  role="radiogroup"
                  aria-label="Mobile color theme"
                  className="grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-white/5 p-1"
                >
                  {themeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const active = themePreference === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        aria-label={`${opt.label} theme`}
                        onClick={() => setThemePreference(opt.id)}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? 'bg-white/18 text-white shadow-xs'
                            : 'text-[#A8C2B7] hover:text-white'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="min-w-0 text-xs text-[#9BB4A9]">
                  <p className="truncate font-medium text-white">{user.name}</p>
                  <p className="truncate text-[11px]">
                    {user.isGuest ? 'Guest Mode · Local sync' : user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('profile')}
                  className="shrink-0 rounded-lg bg-[#165B43] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1C7454]"
                >
                  {user.isGuest ? 'Sign In' : 'Profile'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Clean Single-Row Frosted Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-[#DCE4DF] bg-white/88 px-3 backdrop-blur-md sm:gap-3 sm:px-6 lg:px-8 dark:border-[#1E3028] dark:bg-[#0D1713]/88">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#13231D] transition-colors hover:bg-[#F2F5F3] lg:hidden dark:text-[#ECF4F0] dark:hover:bg-[#192B24]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden shrink-0 font-semibold text-[#5E726A] sm:inline dark:text-[#7F9A8E]">
                BreatheWise AI
              </span>
              <span className="hidden shrink-0 text-[#B4C1BA] sm:inline dark:text-[#3A544A]" aria-hidden="true">
                /
              </span>
              <span
                data-testid="header-view-title"
                className="truncate font-semibold text-[#13231D] dark:text-[#ECF4F0]"
              >
                {VIEW_TITLES[activeView]}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {/* Compact Single-Icon Theme Cycle Button on Mobile (< md) */}
            <button
              type="button"
              data-testid="mobile-theme-cycle-btn"
              onClick={() => setThemePreference(getNextThemePreference(themePreference))}
              aria-label={`Color theme: ${getThemeLabel(themePreference)}. Switch to ${getThemeLabel(getNextThemePreference(themePreference))} theme`}
              title={`Theme: ${getThemeLabel(themePreference)} (tap to switch)`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE3DE] bg-[#F2F6F3] text-[#13231D] transition-colors hover:border-[#165B43] hover:bg-[#EAF2ED] md:hidden dark:border-[#23372F] dark:bg-[#13221C] dark:text-[#ECF4F0] dark:hover:border-[#34D399]"
            >
              {themePreference === 'dark' ? (
                <Moon className="h-4 w-4" aria-hidden="true" />
              ) : themePreference === 'light' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Monitor className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {/* Full System / Light / Dark Theme Switcher on Tablet & Desktop (md+) */}
            <div
              data-testid="theme-switcher"
              role="radiogroup"
              aria-label="Color theme"
              className="hidden items-center rounded-lg border border-[#DCE3DE] bg-[#F2F6F3] p-0.5 md:inline-flex dark:border-[#23372F] dark:bg-[#13221C]"
            >
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const active = themePreference === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${opt.label} theme`}
                    title={`${opt.label} theme`}
                    onClick={() => setThemePreference(opt.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-white text-[#11221C] shadow-xs dark:bg-[#21382F] dark:text-white'
                        : 'text-[#546860] hover:text-[#11221C] dark:text-[#86A094] dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="hidden xl:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              aria-label="Change monitoring location"
              className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#DCE3DE] bg-[#FAFBFA] px-2.5 text-xs font-medium text-[#13231D] transition-colors hover:border-[#165B43] hover:bg-[#F2F8F5] sm:px-3 dark:border-[#243931] dark:bg-[#14221C] dark:text-[#ECF4F0] dark:hover:border-[#34D399]"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-[#165B43] dark:text-[#34D399]" />
              <span className="max-w-[76px] truncate sm:max-w-[160px]">
                {airData ? airData.location.name : 'Select city'}
              </span>
              {airData?.aqi !== null && airData?.aqi !== undefined && (
                <span className="font-mono text-[#546860] tabular-nums dark:text-[#98B2A7]">
                  <span className="hidden sm:inline">· AQI </span>
                  <span className="sm:hidden">· </span>
                  {airData.aqi}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('notifications')}
              aria-label={`Notifications (${unreadCount} unread)`}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#4A5D55] transition-colors hover:bg-[#F2F5F3] hover:text-[#13231D] dark:text-[#98B2A7] dark:hover:bg-[#182922] dark:hover:text-white"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 font-mono text-[10px] font-bold text-[#B91C1C] dark:text-[#FCA5A5]">
                  {unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('profile')}
              className="hidden whitespace-nowrap rounded-lg bg-[#112A22] px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#165B43] sm:inline-flex dark:bg-[#1C7454] dark:hover:bg-[#228B65]"
            >
              {user.isGuest ? 'Sign In' : user.name}
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="mx-auto w-full max-w-[1240px] flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {activeView === 'dashboard' && (
            <DashboardView
              airData={airData}
              loadingAir={loadingAir}
              resolvedTheme={resolvedTheme}
              profile={profile}
              userName={user.name}
              alerts={alerts}
              severeAqiThreshold={alertSettings.severeAqiThreshold}
              impact={aggregatedImpact}
              campaigns={campaigns}
              onRefreshAir={() => loadAir(true)}
              onOpenLocationModal={() => setLocationModalOpen(true)}
              onNavigate={navigate}
            />
          )}

          {activeView === 'air-quality' && (
            <AirQualityView
              airData={airData}
              loading={loadingAir}
              resolvedTheme={resolvedTheme}
              onRefresh={() => loadAir(true)}
              onOpenLocationModal={() => setLocationModalOpen(true)}
            />
          )}

          {activeView === 'assistant' && <AiAssistantView airData={airData} profile={profile} />}

          {activeView === 'planner' && <DailyPlannerView locationKey={locationKey} />}

          {activeView === 'indoor' && (
            <IndoorAirView
              profile={profile}
              locationKey={locationKey}
              onProfileSaved={(updated) => {
                setProfile(updated);
                loadAlerts().catch(() => {});
              }}
            />
          )}

          {activeView === 'sustainable' && (
            <SustainableLivingView
              alternatives={sustainableAlternatives}
              currentAqi={airData?.aqi ?? null}
              onActionLogged={loadImpact}
            />
          )}

          {activeView === 'impact' && (
            <ImpactTrackerView
              currency={impactCurrency}
              catalog={impactCatalog}
              records={impactRecords}
              aggregated={aggregatedImpact}
              communityContribution={communityContrib}
              onRefreshImpact={loadImpact}
            />
          )}

          {activeView === 'community' && (
            <CommunityView
              campaigns={campaigns}
              leaderboard={leaderboard}
              onRefreshCommunity={async () => {
                await Promise.all([loadCommunity(), loadImpact()]);
              }}
            />
          )}

          {activeView === 'education' && <EducationView />}

          {activeView === 'notifications' && (
            <NotificationsView alerts={alerts} settings={alertSettings} onRefreshAlerts={loadAlerts} />
          )}

          {activeView === 'profile' && (
            <ProfileSettingsView
              user={user}
              profile={profile}
              savedLocations={savedLocations}
              themePreference={themePreference}
              resolvedTheme={resolvedTheme}
              onChangeTheme={setThemePreference}
              onAuthSuccess={async (loggedInUser) => {
                setUser(loggedInUser);
                await bootstrapAll();
              }}
              onLogout={handleLogout}
              onProfileSaved={(updated) => {
                setProfile(updated);
                Promise.all([loadAlerts(), loadImpact()]).catch(() => {});
              }}
              onSelectLocation={handleSelectLocation}
              onDeleteLocation={handleDeleteLocation}
              onOpenLocationModal={() => setLocationModalOpen(true)}
            />
          )}
        </main>
      </div>

      <LocationModal
        open={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        savedLocations={savedLocations}
        activeLocation={airData?.location ?? null}
        onSelectLocation={handleSelectLocation}
        onDeleteLocation={handleDeleteLocation}
      />
    </div>
  );
}
