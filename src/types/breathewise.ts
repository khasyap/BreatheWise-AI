export type AqiStandardId = 'CPCB_IN' | 'US_EPA';

export type DataFreshness = 'live' | 'cached' | 'stale' | 'unavailable';

export type SeverityTier = 'good' | 'satisfactory' | 'moderate' | 'poor' | 'very_poor' | 'severe';

export interface PollutantReadings {
  pm25: number | null; // µg/m³
  pm10: number | null; // µg/m³
  no2: number | null;  // µg/m³
  so2: number | null;  // µg/m³
  co: number | null;   // µg/m³ (converted to mg/m³ for CPCB/EPA math)
  o3: number | null;   // µg/m³
}

export interface HourlyAqiPoint {
  timestamp: string;
  label: string;
  aqi: number | null;
  pm25: number | null;
  pm10: number | null;
  o3: number | null;
  no2: number | null;
}

export interface DailyAqiPoint {
  date: string;
  label: string;
  avgAqi: number | null;
  maxAqi: number | null;
  minAqi: number | null;
  avgPm25: number | null;
  avgPm10?: number | null;
  avgNo2?: number | null;
  avgO3?: number | null;
}

export interface WeatherSnapshot {
  temperatureC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number | null;
  windDirectionDeg: number | null;
  windDirectionLabel: string;
  surfacePressureHpa: number | null;
  weatherSummary: string;
  inversionRisk: 'low' | 'moderate' | 'high';
  inversionReason: string;
  source: string;
  fetchedAt: string;
}

export interface LocationInfo {
  id?: number;
  name: string;
  admin1?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  isPrimary?: boolean;
}

export interface AirQualityPayload {
  location: LocationInfo;
  standard: AqiStandardId;
  standardLabel: string;
  aqi: number | null;
  category: string;
  severityTier: SeverityTier;
  primaryPollutant: string;
  primaryPollutantCode: keyof PollutantReadings | null;
  pollutants: PollutantReadings;
  subIndices: Partial<Record<keyof PollutantReadings, number>>;
  plainLanguageSummary: string;
  healthGuidanceGeneral: string;
  healthGuidanceSensitive: string;
  dataQuality: DataFreshness;
  dataQualityNote: string;
  sourceAttribution: string;
  stationInfo: string;
  fetchedAt: string;
  weather: WeatherSnapshot;
  hourly24h: HourlyAqiPoint[];
  hourlyForecast24h: HourlyAqiPoint[];
  daily7d: DailyAqiPoint[];
}

export type BudgetTier = 'minimal' | 'moderate' | 'comprehensive';

export type CookingFuelType = 'lpg' | 'piped_gas' | 'induction_electric' | 'biomass_solid';

export type CommuteMode = 'petrol_car' | 'diesel_car' | 'two_wheeler' | 'public_bus' | 'metro_rail' | 'cycling_walking' | 'remote_wfh';

export interface IndoorProfile {
  rooms: number;
  primaryRoomAreaSqFt: number;
  ceilingHeightFt: number;
  ventilationType: 'cross_ventilation' | 'single_side' | 'sealed_ac' | 'limited';
  hasAirPurifier: boolean;
  purifierCadrM3h: number;
  cookingFuel: CookingFuelType;
  hasKitchenExhaust: boolean;
  concerns: string[];
}

export interface HouseholdProfile {
  personaType:
    | 'family_children'
    | 'parents_infants'
    | 'elderly'
    | 'student'
    | 'office_commuter'
    | 'outdoor_worker'
    | 'respiratory_sensitive'
    | 'eco_citizen'
    | 'community_association';
  householdSize: number;
  hasInfants: boolean;
  hasChildren: boolean;
  hasElderly: boolean;
  hasOutdoorWorkers: boolean;
  hasRespiratorySensitivity: boolean;
  commuteMode: CommuteMode;
  dailyCommuteKm: number;
  budgetTier: BudgetTier;
  currency: 'INR' | 'USD';
  indoorProfile: IndoorProfile;
}

export interface StructuredRecommendation {
  recommendedAction: string;
  whyRecommended: string;
  expectedBenefit: string;
  estimatedEffortOrCost: string;
  relevantTimeOfDay: string;
  environmentalImpact: string;
  confidenceIndicator: string;
}

export interface AiChatMessage {
  id: number | string;
  role: 'user' | 'assistant';
  message: string;
  summary?: string;
  recommendations?: StructuredRecommendation[];
  safetyDisclaimer?: string;
  dataContextUsed?: string;
  rating?: number | null;
  createdAt: string;
}

export interface RoutineTask {
  id: string;
  timeBlock:
    | 'Morning'
    | 'School Prep'
    | 'Office Commute'
    | 'Exercise'
    | 'Outdoor Recreation'
    | 'Grocery Shopping'
    | 'Household Chores'
    | 'Evening'
    | 'Nighttime';
  scheduledWindow: string;
  title: string;
  priority: 'Critical' | 'High' | 'Recommended' | 'Optional';
  forecastAqiRange: string;
  alternativeActivity: string;
  rationale: string;
  completed: boolean;
  reminderTime: string;
}

export interface SustainabilityActivityRecord {
  id: number;
  category: 'transportation' | 'household' | 'shopping' | 'community';
  actionKey: string;
  title: string;
  quantity: number;
  unit: string;
  co2SavedKg: number;
  fuelSavedL: number;
  energySavedKwh: number;
  costSaved: number;
  loggedDate: string;
  notes?: string;
}

export interface NotificationSettings {
  severeAqiThreshold: number;
  pm25SpikeThreshold: number;
  notifyChildren: boolean;
  notifyElderly: boolean;
  notifyOutdoorWorker: boolean;
  notifyGeneral: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface SmartAlert {
  id: string;
  category:
    | 'Severe AQI Alert'
    | 'PM2.5 Spike'
    | 'Unhealthy Outdoor Conditions'
    | 'Poor Indoor Air Risk'
    | 'Weather Inversion Risk'
    | 'Routine Adjustment';
  severity: 'critical' | 'high' | 'moderate' | 'advisory';
  targetGroup: 'Children' | 'Elderly' | 'Outdoor Workers' | 'General Household';
  whatHappened: string;
  whereHappened: string;
  whyItMatters: string;
  whatToDo: string;
  checkAgainAt: string;
  createdAt: string;
  isRead: boolean;
}

export interface CommunityCampaign {
  id: number;
  slug: string;
  title: string;
  category: 'Transport' | 'Anti-Burning' | 'Energy' | 'Awareness' | 'Waste';
  description: string;
  neighborhood: string;
  targetParticipants: number;
  currentParticipants: number;
  durationDays: number;
  collectiveCo2Kg: number;
  status: 'Active' | 'Upcoming';
  joinedByMe: boolean;
  myActionsLogged: number;
}

export interface UserAccount {
  id: number;
  email: string;
  name: string;
  isGuest: boolean;
}

export interface DailySustainabilityGoal {
  goalDate: string;
  presetId: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  updatedAt: string;
}

export interface DailyGoalStatus {
  goalDate: string;
  goal: DailySustainabilityGoal | null;
  streakDays: number;
  completedCount7d: number;
}

export interface YearOverYearPoint {
  dayOfMonth: number;
  label: string;
  currentDate: string;
  previousDate: string;
  currentAqi: number | null;
  previousAqi: number | null;
  currentPm25: number | null;
  previousPm25: number | null;
  deltaAqi: number | null;
  currentCategory: string;
  previousCategory: string;
}

export interface YearOverYearWeeklyBucket {
  label: string;
  dayRange: string;
  currentAvgAqi: number | null;
  previousAvgAqi: number | null;
  deltaAqi: number | null;
}

export interface YearOverYearPayload {
  location: LocationInfo;
  standard: AqiStandardId;
  standardLabel: string;
  monthName: string;
  monthShort: string;
  currentYear: number;
  previousYear: number;
  daysCompared: number;
  currentMonthAvgAqi: number | null;
  previousMonthAvgAqi: number | null;
  avgAqiDelta: number | null;
  avgAqiPctChange: number | null;
  currentPeakAqi: number | null;
  previousPeakAqi: number | null;
  betterDaysCount: number;
  worseDaysCount: number;
  comparedDaysCount: number;
  direction: 'improved' | 'worsened' | 'similar' | 'insufficient';
  plainInsight: string;
  dailyPoints: YearOverYearPoint[];
  weeklyBuckets: YearOverYearWeeklyBucket[];
  dataQuality: DataFreshness;
  dataQualityNote: string;
  sourceAttribution: string;
  fetchedAt: string;
}


