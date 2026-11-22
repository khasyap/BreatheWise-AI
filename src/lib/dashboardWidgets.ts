import type { AirQualityPayload, HouseholdProfile } from '../types/breathewise';

export interface SevereAlertBannerState {
  visible: boolean;
  aqi: number | null;
  threshold: number;
  exceededBy: number;
  category: string;
  locationName: string;
  primaryPollutant: string;
  headline: string;
  summary: string;
  protectiveSteps: string[];
}

export function evaluateSevereAlertBanner(
  airData: AirQualityPayload | null,
  severeAqiThreshold: number,
  profile: HouseholdProfile,
): SevereAlertBannerState {
  const safeThreshold = Number.isFinite(severeAqiThreshold) ? severeAqiThreshold : 300;

  if (!airData || airData.aqi === null || airData.aqi <= safeThreshold) {
    return {
      visible: false,
      aqi: airData?.aqi ?? null,
      threshold: safeThreshold,
      exceededBy: 0,
      category: airData?.category ?? 'Unavailable',
      locationName: airData?.location.name ?? '',
      primaryPollutant: airData?.primaryPollutant ?? '',
      headline: '',
      summary: '',
      protectiveSteps: [],
    };
  }

  const exceededBy = Math.round(airData.aqi - safeThreshold);
  const protectiveSteps: string[] = [];

  if (profile.indoorProfile.hasAirPurifier) {
    protectiveSteps.push(
      'Close all windows and exterior doors now, and run your HEPA air purifier continuously on medium-high.',
    );
  } else {
    protectiveSteps.push(
      'Keep windows and door drafts sealed, avoid burning incense or frying without exhaust, and set up one closed clean room.',
    );
  }

  protectiveSteps.push(
    'Cancel non-essential outdoor trips and outdoor exercise; wear a snug N95 or FFP2 respirator if stepping outside is unavoidable.',
  );

  const sensitiveGroups: string[] = [];
  if (profile.hasInfants) sensitiveGroups.push('infants');
  if (profile.hasChildren) sensitiveGroups.push('children');
  if (profile.hasElderly) sensitiveGroups.push('elderly family members');
  if (profile.hasRespiratorySensitivity) sensitiveGroups.push('respiratory-sensitive members');

  if (sensitiveGroups.length > 0) {
    protectiveSteps.push(
      `Keep ${sensitiveGroups.join(', ')} indoors and keep prescribed inhalers or routine medications within easy reach.`,
    );
  } else {
    protectiveSteps.push(
      'Stay hydrated, avoid heavy roadside commutes during peak hours, and re-check hourly dispersion before ventilating.',
    );
  }

  return {
    visible: true,
    aqi: airData.aqi,
    threshold: safeThreshold,
    exceededBy,
    category: airData.category,
    locationName: airData.location.name,
    primaryPollutant: airData.primaryPollutant,
    headline: `Severe Air Quality Alert — AQI ${airData.aqi} (${airData.category})`,
    summary: `${airData.location.name} is ${exceededBy} AQI points above your ${safeThreshold} alert threshold (${airData.standardLabel}), primarily driven by ${airData.primaryPollutant}.`,
    protectiveSteps,
  };
}

export interface DailyGoalPreset {
  id: string;
  title: string;
  category: 'indoor' | 'mobility' | 'energy';
  outdoorRequired: boolean;
  safeMaxAqi: number | null;
  impactHint: string;
  smogCaution?: string;
}

export interface EvaluatedDailyGoalPreset extends DailyGoalPreset {
  isRecommendedToday: boolean;
  cautionNote: string | null;
}

export const DAILY_GOAL_PRESETS: DailyGoalPreset[] = [
  {
    id: 'use_air_purifier',
    title: 'Use air purifier',
    category: 'indoor',
    outdoorRequired: false,
    safeMaxAqi: null,
    impactHint: 'Cuts indoor PM2.5 by up to 60–80% in a closed bedroom or living room.',
  },
  {
    id: 'walk_to_work',
    title: 'Walk to work',
    category: 'mobility',
    outdoorRequired: true,
    safeMaxAqi: 150,
    impactHint: 'Eliminates solo tailpipe NO₂ and ~0.9 kg CO₂e on short daily trips.',
    smogCaution: 'Outdoor AQI is elevated today — wear a well-fitting N95 mask or choose a transit/indoor goal instead.',
  },
  {
    id: 'take_public_transit',
    title: 'Take metro or public bus',
    category: 'mobility',
    outdoorRequired: false,
    safeMaxAqi: null,
    impactHint: 'Cuts per-commuter road emissions by over 70% versus solo driving.',
  },
  {
    id: 'seal_windows_peak',
    title: 'Keep windows sealed during peak smog',
    category: 'indoor',
    outdoorRequired: false,
    safeMaxAqi: null,
    impactHint: 'Prevents morning and evening inversion particulates from building up indoors.',
  },
  {
    id: 'clean_cooking_exhaust',
    title: 'Cook with exhaust fan & lidded pots',
    category: 'indoor',
    outdoorRequired: false,
    safeMaxAqi: null,
    impactHint: 'Reduces indoor cooking PM2.5/NO₂ spikes and saves household fuel.',
  },
  {
    id: 'combine_errands_wfh',
    title: 'Work from home or combine errands',
    category: 'mobility',
    outdoorRequired: false,
    safeMaxAqi: null,
    impactHint: 'Avoids cold-start vehicle trips and reduces rush-hour smog exposure.',
  },
];

export function getDailyGoalSuggestions(currentAqi: number | null): EvaluatedDailyGoalPreset[] {
  const evaluated = DAILY_GOAL_PRESETS.map((preset) => {
    const isElevatedForOutdoor =
      preset.outdoorRequired &&
      preset.safeMaxAqi !== null &&
      currentAqi !== null &&
      currentAqi > preset.safeMaxAqi;

    return {
      ...preset,
      isRecommendedToday: !isElevatedForOutdoor,
      cautionNote: isElevatedForOutdoor ? preset.smogCaution ?? 'Outdoor AQI is elevated today.' : null,
    };
  });

  // Sort smog-safe recommendations first while keeping both "Use air purifier" and "Walk to work" easily accessible
  return evaluated.sort((a, b) => Number(b.isRecommendedToday) - Number(a.isRecommendedToday));
}

export function computeDailyGoalStreak(
  history: Array<{ goalDate: string; completed: boolean }>,
  todayIso: string,
): number {
  const completedDates = new Set(history.filter((h) => h.completed).map((h) => h.goalDate));
  if (completedDates.size === 0) return 0;

  const parseUtc = (iso: string): Date => new Date(`${iso}T12:00:00Z`);
  const formatUtc = (dt: Date): string => dt.toISOString().slice(0, 10);

  let cursor = parseUtc(todayIso);
  if (Number.isNaN(cursor.getTime())) return 0;

  // If today is not yet completed, allow active streak continuing through yesterday
  if (!completedDates.has(formatUtc(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!completedDates.has(formatUtc(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (completedDates.has(formatUtc(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export interface HealthPrecautionItem {
  id: 'mask' | 'exercise' | 'indoor' | 'sensitive';
  categoryLabel: string;
  status: string;
  severity: 'low' | 'moderate' | 'high' | 'critical' | 'unavailable';
  detail: string;
}

export interface HealthPrecautionsPlan {
  advisoryLevel: string;
  severityTier: AirQualityPayload['severityTier'] | 'unavailable';
  aqi: number | null;
  category: string;
  items: HealthPrecautionItem[];
  disclaimer: string;
}

export function generateHealthPrecautions(
  airData: AirQualityPayload | null,
  profile: HouseholdProfile,
): HealthPrecautionsPlan {
  const disclaimer =
    'Precautions are based on official environmental AQI bands to reduce exposure and do not replace medical advice from a clinician.';

  if (!airData || airData.aqi === null) {
    return {
      advisoryLevel: 'Telemetry Unavailable',
      severityTier: 'unavailable',
      aqi: null,
      category: 'Unavailable',
      disclaimer,
      items: [
        {
          id: 'mask',
          categoryLabel: 'Mask Guidance',
          status: 'Check Local Visibility',
          severity: 'unavailable',
          detail: 'Live AQI is currently offline. Carry an N95/FFP2 mask if visible winter haze or smoke is present outdoors.',
        },
        {
          id: 'exercise',
          categoryLabel: 'Exercise & Exertion',
          status: 'Use Caution Outdoors',
          severity: 'unavailable',
          detail: 'Avoid heavy roadside workouts until live monitoring resumes or check your national AQI portal.',
        },
        {
          id: 'indoor',
          categoryLabel: 'Indoor Protection',
          status: 'Standard Filtration',
          severity: 'unavailable',
          detail: 'Use kitchen exhaust while cooking and avoid indoor smoke sources while outdoor air status is unknown.',
        },
        {
          id: 'sensitive',
          categoryLabel: 'Sensitive Groups',
          status: 'Monitor Symptoms',
          severity: 'unavailable',
          detail: 'Children, elderly members, and asthma-prone individuals should keep routine medications handy.',
        },
      ],
    };
  }

  const tier = airData.severityTier;
  const hasPurifier = profile.indoorProfile.hasAirPurifier;
  const sensitiveNames: string[] = [];
  if (profile.hasInfants) sensitiveNames.push('infants');
  if (profile.hasChildren) sensitiveNames.push('children');
  if (profile.hasElderly) sensitiveNames.push('elderly adults');
  if (profile.hasRespiratorySensitivity) sensitiveNames.push('respiratory-sensitive members');
  const sensitiveLabel = sensitiveNames.length > 0 ? sensitiveNames.join(', ') : 'children and older adults';

  if (tier === 'good') {
    return {
      advisoryLevel: 'Low Exposure Risk',
      severityTier: tier,
      aqi: airData.aqi,
      category: airData.category,
      disclaimer,
      items: [
        {
          id: 'mask',
          categoryLabel: 'Mask Guidance',
          status: 'No Mask Needed',
          severity: 'low',
          detail: `Air quality is ${airData.category} (AQI ${airData.aqi}). Particulate masks are unnecessary for normal outdoor activities.`,
        },
        {
          id: 'exercise',
          categoryLabel: 'Exercise & Exertion',
          status: 'Unrestricted Outdoors',
          severity: 'low',
          detail: 'Great window for running, cycling, brisk walks, and outdoor sports away from idling traffic.',
        },
        {
          id: 'indoor',
          categoryLabel: 'Indoor Protection',
          status: 'Open Windows to Ventilate',
          severity: 'low',
          detail: 'Use natural cross-ventilation for 20–30 minutes to flush indoor CO₂ and cooking moisture.',
        },
        {
          id: 'sensitive',
          categoryLabel: 'Sensitive Groups',
          status: 'Normal Outdoor Routine',
          severity: 'low',
          detail: `Safe conditions for ${sensitiveLabel} to enjoy parks, school recess, and outdoor walks.`,
        },
      ],
    };
  }

  if (tier === 'satisfactory') {
    return {
      advisoryLevel: 'Mild Precaution',
      severityTier: tier,
      aqi: airData.aqi,
      category: airData.category,
      disclaimer,
      items: [
        {
          id: 'mask',
          categoryLabel: 'Mask Guidance',
          status: 'Optional in Heavy Traffic',
          severity: 'low',
          detail: `AQI is ${airData.aqi} (${airData.category}). Most people do not need a mask; sensitive commuters can carry an N95 near busy roads.`,
        },
        {
          id: 'exercise',
          categoryLabel: 'Exercise & Exertion',
          status: 'Safe — Prefer Parks',
          severity: 'low',
          detail: 'Outdoor workouts are generally fine; choose green spaces over roadside corridors during rush hour.',
        },
        {
          id: 'indoor',
          categoryLabel: 'Indoor Protection',
          status: 'Midday Cross-Ventilation',
          severity: 'low',
          detail: 'Air rooms during afternoon hours when wind dispersion is strongest, and run exhaust while cooking.',
        },
        {
          id: 'sensitive',
          categoryLabel: 'Sensitive Groups',
          status: 'Watch for Mild Irritation',
          severity: 'moderate',
          detail: `Unusually sensitive individuals among ${sensitiveLabel} should pace prolonged high-intensity exertion.`,
        },
      ],
    };
  }

  if (tier === 'moderate') {
    return {
      advisoryLevel: 'Moderate Precautions',
      severityTier: tier,
      aqi: airData.aqi,
      category: airData.category,
      disclaimer,
      items: [
        {
          id: 'mask',
          categoryLabel: 'Mask Guidance',
          status: 'N95 for Sensitive & Commutes',
          severity: 'moderate',
          detail: `At AQI ${airData.aqi} (${airData.primaryPollutant}), wear an N95/FFP2 mask on open two-wheelers, walks near traffic, or if sensitive.`,
        },
        {
          id: 'exercise',
          categoryLabel: 'Exercise & Exertion',
          status: 'Scale Back Intense Cardio',
          severity: 'moderate',
          detail: 'Shorten vigorous outdoor runs or shift high-exertion workouts indoors to limit deep particulate inhalation.',
        },
        {
          id: 'indoor',
          categoryLabel: 'Indoor Protection',
          status: hasPurifier ? 'Run HEPA on Low–Medium' : 'Limit Roadside Ventilation',
          severity: 'moderate',
          detail: hasPurifier
            ? 'Close roadside windows during morning/evening peaks and run your HEPA purifier in bedrooms.'
            : 'Keep traffic-facing windows closed during rush hours and ventilate briefly only around midday.',
        },
        {
          id: 'sensitive',
          categoryLabel: 'Sensitive Groups',
          status: 'Reduce Prolonged Exposure',
          severity: 'high',
          detail: `Limit extended outdoor play or walks for ${sensitiveLabel}; take frequent breaks indoors.`,
        },
      ],
    };
  }

  if (tier === 'poor') {
    return {
      advisoryLevel: 'High Protection Required',
      severityTier: tier,
      aqi: airData.aqi,
      category: airData.category,
      disclaimer,
      items: [
        {
          id: 'mask',
          categoryLabel: 'Mask Guidance',
          status: 'Wear N95 / FFP2 Outdoors',
          severity: 'high',
          detail: `AQI ${airData.aqi} (${airData.category}) makes a tight-fitting N95/FFP2 respirator strongly advisable outdoors. Cloth or surgical masks do not filter PM2.5.`,
        },
        {
          id: 'exercise',
          categoryLabel: 'Exercise & Exertion',
          status: 'Move Exercise Indoors',
          severity: 'high',
          detail: 'Avoid outdoor jogging, cycling, and sports. Switch to indoor mobility, yoga, or strength training.',
        },
        {
          id: 'indoor',
          categoryLabel: 'Indoor Protection',
          status: hasPurifier ? 'Seal Rooms & Run HEPA' : 'Seal Drafts & Avoid Smoke',
          severity: 'high',
          detail: hasPurifier
            ? 'Keep exterior windows closed, run HEPA filtration continuously in occupied rooms, and use kitchen exhaust.'
            : 'Keep windows sealed, wet-mop floors instead of dry sweeping, and avoid incense or unvented frying.',
        },
        {
          id: 'sensitive',
          categoryLabel: 'Sensitive Groups',
          status: 'Keep Indoors Most of Day',
          severity: 'high',
          detail: `Keep ${sensitiveLabel} indoors during morning and evening smog peaks and ensure routine medications are accessible.`,
        },
      ],
    };
  }

  // very_poor or severe
  return {
    advisoryLevel: tier === 'severe' ? 'Emergency Smog Precautions' : 'Strict Protective Measures',
    severityTier: tier,
    aqi: airData.aqi,
    category: airData.category,
    disclaimer,
    items: [
      {
        id: 'mask',
        categoryLabel: 'Mask Guidance',
        status: 'Snug N95 / FFP2 Required',
        severity: 'critical',
        detail: `Hazardous particulate load (AQI ${airData.aqi}, ${airData.primaryPollutant}). Wear a well-sealed N95/KN95/FFP2 respirator for every essential outdoor trip.`,
      },
      {
        id: 'exercise',
        categoryLabel: 'Exercise & Exertion',
        status: 'Suspend All Outdoor Exercise',
        severity: 'critical',
        detail: 'Do not run, cycle, or walk briskly outdoors—elevated breathing rates multiply inhaled fine particulate dose.',
      },
      {
        id: 'indoor',
        categoryLabel: 'Indoor Protection',
        status: hasPurifier ? 'Continuous HEPA + Sealed Doors' : 'Create One Sealed Clean Room',
        severity: 'critical',
        detail: hasPurifier
          ? 'Keep all windows sealed, run HEPA purifiers continuously on medium-high, and use door draft stoppers.'
          : 'Seal window gaps with damp towels or weather-stripping, isolate one clean bedroom, and halt all indoor combustion.',
      },
      {
        id: 'sensitive',
        categoryLabel: 'Sensitive Groups',
        status: 'Strictly Remain Indoors',
        severity: 'critical',
        detail: `Cancel outdoor school play and walks for ${sensitiveLabel}. Seek prompt clinical care if wheezing, chest tightness, or breathlessness develops.`,
      },
    ],
  };
}

export interface WeatherSmogInfluence {
  smogTrappingLevel: 'High' | 'Moderate' | 'Low' | 'Unavailable';
  temperatureNote: string;
  humidityNote: string;
  windNote: string;
  overallBehavior: string;
}

export function analyzeWeatherSmogInfluence(
  weather: AirQualityPayload['weather'] | null,
  aqi: number | null,
): WeatherSmogInfluence {
  if (!weather || (weather.temperatureC === null && weather.humidityPct === null && weather.windSpeedKmh === null)) {
    return {
      smogTrappingLevel: 'Unavailable',
      temperatureNote: 'Live temperature unavailable.',
      humidityNote: 'Live humidity unavailable.',
      windNote: 'Live wind speed unavailable.',
      overallBehavior: 'Local meteorological data is temporarily unavailable to assess winter smog dispersion.',
    };
  }

  const temp = weather.temperatureC;
  const humidity = weather.humidityPct;
  const wind = weather.windSpeedKmh;

  const temperatureNote =
    temp === null
      ? 'Temperature unavailable.'
      : temp <= 15
        ? `Cool ${temp}°C air compresses the lower boundary layer, strengthening ground-level winter smog trapping.`
        : temp <= 24
          ? `Mild ${temp}°C temperatures allow partial midday vertical mixing, though overnight cooling can still trap haze.`
          : `Warm ${temp}°C surface air promotes stronger thermal updrafts and faster pollutant dispersion.`;

  const humidityNote =
    humidity === null
      ? 'Humidity unavailable.'
      : humidity >= 70
        ? `High ${humidity}% humidity causes PM2.5 particles to absorb moisture (hygroscopic growth), thickening visible winter smog.`
        : humidity >= 45
          ? `Moderate ${humidity}% humidity supports light haze persistence without heavy fog lock-in.`
          : `Dry ${humidity}% air limits wet smog formation, though dry surface dust (PM10) can remain suspended.`;

  const windNote =
    wind === null
      ? 'Wind telemetry unavailable.'
      : wind < 6
        ? `Calm ${wind} km/h winds (${weather.windDirectionLabel}) cause stagnant air—emissions accumulate rapidly near street level.`
        : wind < 14
          ? `Light ${wind} km/h breeze (${weather.windDirectionLabel}) offers slow lateral clearing across the city.`
          : `Brisk ${wind} km/h winds (${weather.windDirectionLabel}) actively disperse surface particulates.`;

  const smogTrappingLevel: WeatherSmogInfluence['smogTrappingLevel'] =
    weather.inversionRisk === 'high'
      ? 'High'
      : weather.inversionRisk === 'moderate'
        ? 'Moderate'
        : 'Low';

  const aqiSuffix =
    aqi !== null && aqi > 200
      ? ` Combined with current AQI ${aqi}, expect slow clearing until wind speeds rise or daytime warming peaks.`
      : '';

  return {
    smogTrappingLevel,
    temperatureNote,
    humidityNote,
    windNote,
    overallBehavior: `${weather.inversionReason}${aqiSuffix}`,
  };
}

