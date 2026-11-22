import type { AqiStandardId, DataFreshness, PollutantReadings, SeverityTier } from '../types/breathewise';

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

// Official CPCB India National Air Quality Index (NAQI, 2014) breakpoints
// Units: PM2.5, PM10, NO2, SO2, O3 in µg/m³; CO in mg/m³
const CPCB_BREAKPOINTS: Record<keyof PollutantReadings, Breakpoint[]> = {
  pm25: [
    { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
    { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
    { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
    { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 },
  ],
  pm10: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 },
  ],
  no2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
    { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
    { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
    { cLow: 401, cHigh: 600, iLow: 401, iHigh: 500 },
  ],
  so2: [
    { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
    { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
    { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
    { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
    { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
    { cLow: 1601, cHigh: 2100, iLow: 401, iHigh: 500 },
  ],
  co: [
    { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
    { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
    { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
    { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
    { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
    { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 },
  ],
  o3: [
    { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
    { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
    { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
    { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
    { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
    { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 },
  ],
};

// Official US EPA 2024 Revised PM2.5 & standard pollutant breakpoints (converted to µg/m³ for O3/NO2/SO2, mg/m³ for CO)
const US_EPA_BREAKPOINTS: Record<keyof PollutantReadings, Breakpoint[]> = {
  pm25: [
    { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
    { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
    { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
    { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
    { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
    { cLow: 225.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
  ],
  pm10: [
    { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
    { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
    { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
    { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
    { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
    { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 },
  ],
  o3: [
    { cLow: 0, cHigh: 108, iLow: 0, iHigh: 50 },
    { cLow: 109, cHigh: 140, iLow: 51, iHigh: 100 },
    { cLow: 141, cHigh: 170, iLow: 101, iHigh: 150 },
    { cLow: 171, cHigh: 210, iLow: 151, iHigh: 200 },
    { cLow: 211, cHigh: 400, iLow: 201, iHigh: 300 },
    { cLow: 401, cHigh: 800, iLow: 301, iHigh: 500 },
  ],
  no2: [
    { cLow: 0, cHigh: 100, iLow: 0, iHigh: 50 },
    { cLow: 101, cHigh: 188, iLow: 51, iHigh: 100 },
    { cLow: 189, cHigh: 677, iLow: 101, iHigh: 150 },
    { cLow: 678, cHigh: 1220, iLow: 151, iHigh: 200 },
    { cLow: 1221, cHigh: 2349, iLow: 201, iHigh: 300 },
    { cLow: 2350, cHigh: 3853, iLow: 301, iHigh: 500 },
  ],
  so2: [
    { cLow: 0, cHigh: 92, iLow: 0, iHigh: 50 },
    { cLow: 93, cHigh: 196, iLow: 51, iHigh: 100 },
    { cLow: 197, cHigh: 485, iLow: 101, iHigh: 150 },
    { cLow: 486, cHigh: 796, iLow: 151, iHigh: 200 },
    { cLow: 797, cHigh: 1582, iLow: 201, iHigh: 300 },
    { cLow: 1583, cHigh: 2630, iLow: 301, iHigh: 500 },
  ],
  co: [
    { cLow: 0, cHigh: 5.0, iLow: 0, iHigh: 50 },
    { cLow: 5.1, cHigh: 10.8, iLow: 51, iHigh: 100 },
    { cLow: 10.9, cHigh: 14.2, iLow: 101, iHigh: 150 },
    { cLow: 14.3, cHigh: 17.6, iLow: 151, iHigh: 200 },
    { cLow: 17.7, cHigh: 34.8, iLow: 201, iHigh: 300 },
    { cLow: 34.9, cHigh: 57.7, iLow: 301, iHigh: 500 },
  ],
};

export const POLLUTANT_LABELS: Record<keyof PollutantReadings, { name: string; formula: string; unit: string; description: string }> = {
  pm25: {
    name: 'Fine Particulate Matter',
    formula: 'PM2.5',
    unit: 'µg/m³',
    description: 'Microscopic particles ≤2.5 µm that reach deep into lungs; primary winter smog driver.',
  },
  pm10: {
    name: 'Coarse Particulate Matter',
    formula: 'PM10',
    unit: 'µg/m³',
    description: 'Road dust, construction particles, and smoke ≤10 µm that irritate upper airways.',
  },
  no2: {
    name: 'Nitrogen Dioxide',
    formula: 'NO₂',
    unit: 'µg/m³',
    description: 'Combustion gas primarily from vehicle exhaust and diesel generators.',
  },
  so2: {
    name: 'Sulfur Dioxide',
    formula: 'SO₂',
    unit: 'µg/m³',
    description: 'Industrial and coal-combustion gas that aggravates sensitive airways.',
  },
  co: {
    name: 'Carbon Monoxide',
    formula: 'CO',
    unit: 'µg/m³',
    description: 'Colorless gas from incomplete fuel combustion in traffic and indoor biomass.',
  },
  o3: {
    name: 'Ground-Level Ozone',
    formula: 'O₃',
    unit: 'µg/m³',
    description: 'Secondary pollutant formed when sunlight reacts with vehicle and industrial emissions.',
  },
};

export function selectStandardForCountry(countryCode: string): AqiStandardId {
  return countryCode.trim().toUpperCase() === 'IN' ? 'CPCB_IN' : 'US_EPA';
}

export function getStandardLabel(standard: AqiStandardId): string {
  return standard === 'CPCB_IN' ? 'CPCB India NAQI (0–500)' : 'US EPA AQI 2024 (0–500)';
}

function interpolateSubIndex(concentration: number, table: Breakpoint[]): number {
  if (!Number.isFinite(concentration) || concentration < 0) return 0;
  for (const bp of table) {
    if (concentration <= bp.cHigh) {
      const span = bp.cHigh - bp.cLow;
      if (span <= 0) return bp.iHigh;
      const clampedC = Math.max(concentration, bp.cLow);
      const val = ((bp.iHigh - bp.iLow) / span) * (clampedC - bp.cLow) + bp.iLow;
      return Math.round(val);
    }
  }
  const last = table[table.length - 1];
  const prev = table[table.length - 2];
  const slope = (last.iHigh - prev.iHigh) / Math.max(1, last.cHigh - prev.cHigh);
  return Math.min(500, Math.round(last.iHigh + slope * (concentration - last.cHigh)));
}

export interface AqiComputationResult {
  aqi: number | null;
  category: string;
  severityTier: SeverityTier;
  primaryPollutantCode: keyof PollutantReadings | null;
  primaryPollutant: string;
  subIndices: Partial<Record<keyof PollutantReadings, number>>;
  plainLanguageSummary: string;
  healthGuidanceGeneral: string;
  healthGuidanceSensitive: string;
}

export function computeAqiFromPollutants(
  pollutants: PollutantReadings,
  standard: AqiStandardId,
): AqiComputationResult {
  const tableSet = standard === 'CPCB_IN' ? CPCB_BREAKPOINTS : US_EPA_BREAKPOINTS;
  const subIndices: Partial<Record<keyof PollutantReadings, number>> = {};

  (Object.keys(tableSet) as Array<keyof PollutantReadings>).forEach((key) => {
    const raw = pollutants[key];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
      // Open-Meteo returns CO in µg/m³; breakpoints use mg/m³ (1 mg/m³ = 1000 µg/m³)
      const normalized = key === 'co' ? raw / 1000 : raw;
      subIndices[key] = interpolateSubIndex(normalized, tableSet[key]);
    }
  });

  const entries = Object.entries(subIndices) as Array<[keyof PollutantReadings, number]>;
  if (entries.length === 0) {
    return {
      aqi: null,
      category: 'Unavailable',
      severityTier: 'moderate',
      primaryPollutantCode: null,
      primaryPollutant: 'Unavailable',
      subIndices: {},
      plainLanguageSummary: 'Live pollutant measurements are temporarily unavailable for this location.',
      healthGuidanceGeneral: 'Check official local monitoring portals before strenuous outdoor activity.',
      healthGuidanceSensitive: 'Sensitive individuals should keep respiratory protection handy until live data resumes.',
    };
  }

  entries.sort((a, b) => b[1] - a[1]);
  const [primaryCode, maxAqi] = entries[0];
  const categoryInfo = categorizeAqi(maxAqi, standard);

  return {
    aqi: maxAqi,
    category: categoryInfo.category,
    severityTier: categoryInfo.severityTier,
    primaryPollutantCode: primaryCode,
    primaryPollutant: `${POLLUTANT_LABELS[primaryCode].formula} (${POLLUTANT_LABELS[primaryCode].name})`,
    subIndices,
    plainLanguageSummary: buildPlainLanguageSummary(maxAqi, categoryInfo.category, primaryCode, standard),
    healthGuidanceGeneral: categoryInfo.guidanceGeneral,
    healthGuidanceSensitive: categoryInfo.guidanceSensitive,
  };
}

export function categorizeAqi(
  aqi: number,
  standard: AqiStandardId,
): {
  category: string;
  severityTier: SeverityTier;
  guidanceGeneral: string;
  guidanceSensitive: string;
} {
  if (standard === 'CPCB_IN') {
    if (aqi <= 50) {
      return {
        category: 'Good',
        severityTier: 'good',
        guidanceGeneral: 'Minimal health impact. Outdoor activities and natural cross-ventilation are comfortable.',
        guidanceSensitive: 'Air quality is favorable for children, elderly family members, and sensitive groups.',
      };
    }
    if (aqi <= 100) {
      return {
        category: 'Satisfactory',
        severityTier: 'satisfactory',
        guidanceGeneral: 'Acceptable air quality for routine outdoor activity and commuting.',
        guidanceSensitive: 'Minor breathing discomfort possible for people with heightened respiratory sensitivity.',
      };
    }
    if (aqi <= 200) {
      return {
        category: 'Moderately Polluted',
        severityTier: 'moderate',
        guidanceGeneral: 'Reduce prolonged vigorous outdoor exertion near heavy traffic corridors.',
        guidanceSensitive: 'Children, elderly individuals, and people with asthma or heart sensitivities should shorten outdoor exertion.',
      };
    }
    if (aqi <= 300) {
      return {
        category: 'Poor',
        severityTier: 'poor',
        guidanceGeneral: 'Move aerobic workouts indoors, consolidate errands, and close windows during traffic peaks.',
        guidanceSensitive: 'Avoid prolonged outdoor play or walks; use well-fitted N95/FFP2 masks when travel is necessary.',
      };
    }
    if (aqi <= 400) {
      return {
        category: 'Very Poor',
        severityTier: 'very_poor',
        guidanceGeneral: 'Avoid outdoor exercise; keep windows sealed and operate HEPA filtration indoors if available.',
        guidanceSensitive: 'Infants, children, and elderly family members should remain indoors with clean indoor air management.',
      };
    }
    return {
      category: 'Severe',
      severityTier: 'severe',
      guidanceGeneral: 'Health alert: even healthy people face respiratory irritation. Avoid non-essential outdoor exposure and wear N95 protection outdoors.',
      guidanceSensitive: 'Strictly remain indoors, seal window drafts, run HEPA air purifiers continuously, and follow local official health advisories.',
    };
  }

  // US EPA 2024 Categories
  if (aqi <= 50) {
    return {
      category: 'Good',
      severityTier: 'good',
      guidanceGeneral: 'Air quality is satisfactory with little or no risk from outdoor pollution.',
      guidanceSensitive: 'Safe for outdoor recreation, school sports, and opening windows for fresh air.',
    };
  }
  if (aqi <= 100) {
    return {
      category: 'Moderate',
      severityTier: 'satisfactory',
      guidanceGeneral: 'Air quality is acceptable for most people during routine daily schedules.',
      guidanceSensitive: 'Unusually sensitive individuals should monitor symptoms during prolonged outdoor exertion.',
    };
  }
  if (aqi <= 150) {
    return {
      category: 'Unhealthy for Sensitive Groups',
      severityTier: 'moderate',
      guidanceGeneral: 'General public is less likely to be affected, though heavy roadside exertion should be moderated.',
      guidanceSensitive: 'Children, older adults, and people with respiratory sensitivity should limit prolonged outdoor activity.',
    };
  }
  if (aqi <= 200) {
    return {
      category: 'Unhealthy',
      severityTier: 'poor',
      guidanceGeneral: 'Everyone may begin to experience irritation; shift intense exercise indoors.',
      guidanceSensitive: 'Avoid prolonged outdoor exertion; keep indoor windows closed and filter indoor air.',
    };
  }
  if (aqi <= 300) {
    return {
      category: 'Very Unhealthy',
      severityTier: 'very_poor',
      guidanceGeneral: 'Health alert: avoid outdoor exercise and wear well-fitted particulate respirators for necessary trips.',
      guidanceSensitive: 'Remain indoors with air filtration running and reschedule non-urgent outdoor trips.',
    };
  }
  return {
    category: 'Hazardous',
    severityTier: 'severe',
    guidanceGeneral: 'Emergency air conditions: everyone should avoid outdoor physical activity and minimize outdoor exposure.',
    guidanceSensitive: 'Remain indoors in a filtered clean room and follow official public health guidance.',
  };
}

function buildPlainLanguageSummary(
  aqi: number,
  category: string,
  primaryCode: keyof PollutantReadings,
  standard: AqiStandardId,
): string {
  const pollutantName = POLLUTANT_LABELS[primaryCode].formula;
  const stdName = standard === 'CPCB_IN' ? 'CPCB India' : 'US EPA';
  if (aqi <= 100) {
    return `Air quality is ${category} (${aqi} on the ${stdName} scale) with ${pollutantName} as the leading measured parameter. Normal daily routines and brief ventilation are generally appropriate.`;
  }
  if (aqi <= 200) {
    return `Air quality is ${category} (${aqi} ${stdName}), led by ${pollutantName}. Sensitive family members should trim outdoor exertion and avoid rush-hour roadsides.`;
  }
  if (aqi <= 300) {
    return `Air quality is ${category} (${aqi} ${stdName}), driven primarily by elevated ${pollutantName}. Move exercise indoors, close windows during haze peaks, and wear N95 protection for necessary commutes.`;
  }
  return `Air quality is ${category} (${aqi} ${stdName}) due to heavy ${pollutantName} accumulation. Avoid outdoor exertion, keep windows sealed, and prioritize filtered indoor spaces for children and elderly family members.`;
}

export function getSeverityVisuals(tier: SeverityTier): {
  textColor: string;
  bgSoft: string;
  borderColor: string;
  barColor: string;
  scaleIndex: string;
} {
  switch (tier) {
    case 'good':
      return {
        textColor: 'text-[#156A3C] dark:text-[#4ADE80]',
        bgSoft: 'bg-[#E9F6EE] dark:bg-[#132C1E]',
        borderColor: 'border-[#B8DEC7] dark:border-[#245C3B]',
        barColor: '#15803D',
        scaleIndex: 'Level 1 of 6',
      };
    case 'satisfactory':
      return {
        textColor: 'text-[#3F6212] dark:text-[#A3E635]',
        bgSoft: 'bg-[#F2F7E6] dark:bg-[#1E2B14]',
        borderColor: 'border-[#CFE0A8] dark:border-[#3F5922]',
        barColor: '#4D7C0F',
        scaleIndex: 'Level 2 of 6',
      };
    case 'moderate':
      return {
        textColor: 'text-[#9A4B06] dark:text-[#FBBF24]',
        bgSoft: 'bg-[#FEF6E6] dark:bg-[#2E220F]',
        borderColor: 'border-[#F3D299] dark:border-[#6B4B17]',
        barColor: '#D97706',
        scaleIndex: 'Level 3 of 6',
      };
    case 'poor':
      return {
        textColor: 'text-[#B53D0A] dark:text-[#FB923C]',
        bgSoft: 'bg-[#FFF1E8] dark:bg-[#311B11]',
        borderColor: 'border-[#F6C0A4] dark:border-[#783919]',
        barColor: '#EA580C',
        scaleIndex: 'Level 4 of 6',
      };
    case 'very_poor':
      return {
        textColor: 'text-[#A61B1B] dark:text-[#F87171]',
        bgSoft: 'bg-[#FDECEC] dark:bg-[#311417]',
        borderColor: 'border-[#F2B5B5] dark:border-[#78242A]',
        barColor: '#DC2626',
        scaleIndex: 'Level 5 of 6',
      };
    case 'severe':
      return {
        textColor: 'text-[#7A121C] dark:text-[#FDA4AF]',
        bgSoft: 'bg-[#F9E4E7] dark:bg-[#35111D]',
        borderColor: 'border-[#E6A3AC] dark:border-[#7E213C]',
        barColor: '#9F1239',
        scaleIndex: 'Level 6 of 6',
      };
  }
}

export function classifyDataFreshness(fetchedAtIso: string | null, isCacheHit: boolean): {
  quality: DataFreshness;
  note: string;
} {
  if (!fetchedAtIso) {
    return { quality: 'unavailable', note: 'Live upstream feed unavailable; no measurements fabricated.' };
  }
  const ageMinutes = Math.max(0, Math.round((Date.now() - new Date(fetchedAtIso).getTime()) / 60000));
  if (ageMinutes > 90) {
    return {
      quality: 'stale',
      note: `Delayed observation (${ageMinutes} min old). Verify before planning sensitive outdoor activity.`,
    };
  }
  if (isCacheHit) {
    return {
      quality: 'cached',
      note: `Verified atmospheric feed cached ${ageMinutes} min ago (15-min refresh cycle).`,
    };
  }
  return {
    quality: 'live',
    note: 'Live observation fetched from Open-Meteo atmospheric & weather services.',
  };
}

export function degreesToCompass(deg: number | null): string {
  if (deg === null || !Number.isFinite(deg)) return '—';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export function evaluateInversionRisk(
  tempC: number | null,
  humidityPct: number | null,
  windKmh: number | null,
): { risk: 'low' | 'moderate' | 'high'; reason: string } {
  if (windKmh === null || tempC === null) {
    return { risk: 'moderate', reason: 'Insufficient meteorological inputs to evaluate atmospheric dispersion.' };
  }
  if (windKmh < 7 && tempC <= 18 && (humidityPct ?? 0) >= 65) {
    return {
      risk: 'high',
      reason: `Calm winds (${windKmh.toFixed(1)} km/h), cool air (${tempC.toFixed(1)}°C), and elevated humidity (${humidityPct}%) strongly favor winter smog trapping.`,
    };
  }
  if (windKmh < 6) {
    return {
      risk: 'moderate',
      reason: `Calm winds (${windKmh.toFixed(1)} km/h) limit lateral dispersion, allowing surface pollutants to linger despite ${tempC.toFixed(1)}°C air.`,
    };
  }
  if (windKmh < 12 && tempC <= 22) {
    return {
      risk: 'moderate',
      reason: `Light wind dispersion (${windKmh.toFixed(1)} km/h) can allow evening and early-morning particulate build-up.`,
    };
  }
  if (windKmh < 12) {
    return {
      risk: 'low',
      reason: `Warm surface air (${tempC.toFixed(1)}°C) promotes vertical mixing, though light winds (${windKmh.toFixed(1)} km/h) slow horizontal clearing.`,
    };
  }
  return {
    risk: 'low',
    reason: `Active wind movement (${windKmh.toFixed(1)} km/h) supports faster atmospheric dispersion of surface pollutants.`,
  };
}
