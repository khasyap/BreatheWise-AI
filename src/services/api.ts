import type {
  AiChatMessage,
  AirQualityPayload,
  AqiStandardId,
  CommunityCampaign,
  DailyAqiPoint,
  DailyGoalStatus,
  DataFreshness,
  HouseholdProfile,
  LocationInfo,
  NotificationSettings,
  RoutineTask,
  SmartAlert,
  StructuredRecommendation,
  SustainabilityActivityRecord,
  UserAccount,
  WeatherSnapshot,
  YearOverYearPayload,
} from '../types/breathewise';

export interface AirQualityTrendsResponse {
  location: LocationInfo;
  standard: AqiStandardId;
  standardLabel: string;
  daily7d: DailyAqiPoint[];
  fetchedAt: string | null;
  dataQuality: DataFreshness;
  sourceAttribution: string;
}
import type { AggregatedImpact, EmissionActionDefinition, PersonalizedSustainableAlternative } from '../lib/impactCalculator';
import type { IndoorOptimizationPlan } from '../lib/indoorOptimizer';

const TOKEN_KEY = 'breathewise_auth_token';
const GUEST_KEY = 'breathewise_guest_session';

function getGuestSessionId(): string {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Guest-Session': getGuestSessionId(),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`) as Error & { payload?: unknown; status?: number };
    err.payload = data;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  // Auth
  getMe: () => request<{ user: UserAccount }>('/api/auth/me'),
  register: (payload: { name: string; email: string; password: string }) =>
    request<{ user: UserAccount; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ user: UserAccount; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Locations & Air Quality
  searchLocations: (q: string) => request<{ results: LocationInfo[] }>(`/api/locations/search?q=${encodeURIComponent(q)}`),
  reverseGeocode: (lat: number, lon: number) =>
    request<{ location: LocationInfo }>(`/api/locations/reverse?lat=${lat}&lon=${lon}`),
  getSavedLocations: () => request<{ locations: LocationInfo[] }>('/api/locations'),
  saveLocation: (loc: LocationInfo & { makePrimary?: boolean }) =>
    request<{ location: LocationInfo }>('/api/locations', {
      method: 'POST',
      body: JSON.stringify(loc),
    }),
  setPrimaryLocation: (id: number) =>
    request<{ ok: boolean }>(`/api/locations/${id}/primary`, { method: 'PATCH' }),
  deleteLocation: (id: number) =>
    request<{ ok: boolean }>(`/api/locations/${id}`, { method: 'DELETE' }),
  getAirQuality: (refresh = false) =>
    request<AirQualityPayload>(`/api/air-quality${refresh ? '?refresh=1' : ''}`),
  getAirQualityTrends: (refresh = false) =>
    request<AirQualityTrendsResponse>(`/api/air-quality/trends${refresh ? '?refresh=1' : ''}`),
  getAirQualityYearOverYear: (refresh = false) =>
    request<YearOverYearPayload>(`/api/air-quality/year-over-year${refresh ? '?refresh=1' : ''}`),
  getLocalWeather: (
    coords?: { lat: number; lon: number; name?: string; countryCode?: string },
    refresh = false,
  ) => {
    const params = new URLSearchParams();
    if (coords) {
      params.set('lat', String(coords.lat));
      params.set('lon', String(coords.lon));
      if (coords.name) params.set('name', coords.name);
      if (coords.countryCode) params.set('countryCode', coords.countryCode);
    }
    if (refresh) params.set('refresh', '1');
    const qs = params.toString();
    return request<{ location: LocationInfo; weather: WeatherSnapshot; cached: boolean }>(
      `/api/weather${qs ? `?${qs}` : ''}`,
    );
  },

  // Profile
  getProfile: () => request<{ profile: HouseholdProfile; user: UserAccount }>('/api/profile'),
  updateProfile: (profile: HouseholdProfile, name?: string) =>
    request<{ profile: HouseholdProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ profile, name }),
    }),

  // Daily Planner
  getPlanner: () =>
    request<{
      planDate: string;
      location: LocationInfo;
      aqi: number | null;
      category: string;
      tasks: RoutineTask[];
    }>('/api/planner'),
  updatePlannerTask: (taskKey: string, completed: boolean, reminderTime?: string) =>
    request<{ ok: boolean }>(`/api/planner/${encodeURIComponent(taskKey)}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed, reminderTime }),
    }),

  // Indoor Air
  getIndoor: () =>
    request<{ plan: IndoorOptimizationPlan; indoorProfile: HouseholdProfile['indoorProfile']; checkedIds: string[] }>(
      '/api/indoor',
    ),
  toggleIndoorChecklist: (itemId: string, completed: boolean) =>
    request<{ ok: boolean }>(`/api/indoor/checklist/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }),

  // Impact & Sustainability
  getImpact: () =>
    request<{
      currency: 'INR' | 'USD';
      catalog: EmissionActionDefinition[];
      personalizedAlternatives: PersonalizedSustainableAlternative[];
      records: SustainabilityActivityRecord[];
      aggregated: AggregatedImpact;
      communityContribution: { collectiveCo2Kg: number; activeParticipants: number };
    }>('/api/impact'),
  logImpactAction: (payload: { actionKey: string; quantity: number; loggedDate?: string; notes?: string }) =>
    request<{ record: SustainabilityActivityRecord }>('/api/impact/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteImpactRecord: (id: number) =>
    request<{ ok: boolean }>(`/api/impact/${id}`, { method: 'DELETE' }),

  // Daily Sustainability Goal
  getDailyGoal: () => request<DailyGoalStatus>('/api/daily-goal'),
  saveDailyGoal: (payload: { title: string; presetId?: string; completed?: boolean }) =>
    request<DailyGoalStatus>('/api/daily-goal', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  toggleDailyGoal: (completed: boolean) =>
    request<DailyGoalStatus>('/api/daily-goal/toggle', {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    }),

  // Alerts
  getAlerts: () => request<{ alerts: SmartAlert[]; settings: NotificationSettings }>('/api/alerts'),
  updateAlertSettings: (settings: NotificationSettings) =>
    request<{ settings: NotificationSettings }>('/api/alerts/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    }),
  markAlertRead: (alertId: string) =>
    request<{ ok: boolean }>(`/api/alerts/${encodeURIComponent(alertId)}/read`, { method: 'POST' }),

  // Community
  getCommunity: () =>
    request<{
      campaigns: CommunityCampaign[];
      leaderboard: Array<{ cluster: string; participants: number; estimatedCo2Kg: number; primaryDrive: string }>;
    }>('/api/community'),
  joinCommunityCampaign: (id: number) =>
    request<{ ok: boolean }>(`/api/community/${id}/join`, { method: 'POST' }),

  // AI Assistant
  getAiHistory: () => request<{ messages: AiChatMessage[] }>('/api/ai/history'),
  clearAiHistory: () => request<{ ok: boolean }>('/api/ai/history', { method: 'DELETE' }),
  sendAiChat: (message: string) =>
    request<{ reply: AiChatMessage }>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
  getAiDailyBrief: () =>
    request<{
      brief: {
        summary: string;
        recommendations: StructuredRecommendation[];
        safetyDisclaimer: string;
        modelUsed: string;
      };
      dataContextUsed: string;
    }>('/api/ai/daily-brief', { method: 'POST' }),
  submitAiFeedback: (conversationId: number, rating: 1 | -1) =>
    request<{ ok: boolean }>('/api/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({ conversationId, rating }),
    }),
};
