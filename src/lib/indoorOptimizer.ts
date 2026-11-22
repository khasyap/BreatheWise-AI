import type { BudgetTier, HourlyAqiPoint, IndoorProfile } from '../types/breathewise';

export interface IndoorRecommendationItem {
  id: string;
  category: 'Ventilation' | 'Filtration' | 'Dust & Cleaning' | 'Cooking & Combustion' | 'Humidity & Mold';
  title: string;
  budgetTier: 'Free' | 'Low Cost' | 'Moderate' | 'Equipment Investment';
  priority: 'Essential' | 'High' | 'Recommended';
  actionDetail: string;
  scientificBasis: string;
}

export interface IndoorOptimizationPlan {
  roomVolumeM3: number;
  recommendedCadrM3h: number;
  targetAch: number;
  purifierCoverageStatus: 'Adequate' | 'Undersized' | 'No Purifier Configured';
  purifierCoverageNote: string;
  ventilationGuidance: {
    status: 'Open Brief Window' | 'Keep Windows Sealed' | 'Check Local Readings';
    bestWindowLabel: string;
    detail: string;
  };
  humidityTarget: string;
  recommendations: IndoorRecommendationItem[];
  checklist: Array<{ id: string; label: string; category: string }>;
  houseplantScienceNote: string;
}

export function generateIndoorOptimizationPlan(
  indoor: IndoorProfile,
  budgetTier: BudgetTier,
  currentAqi: number | null,
  hourlyForecast: HourlyAqiPoint[],
): IndoorOptimizationPlan {
  const areaSqM = Math.max(8, indoor.primaryRoomAreaSqFt * 0.092903);
  const heightM = Math.max(2.2, indoor.ceilingHeightFt * 0.3048);
  const roomVolumeM3 = Number((areaSqM * heightM).toFixed(1));

  // Target Air Changes per Hour (ACH): 4.8 ACH during severe smog (>200 AQI), 3.5 ACH moderate, 2.5 ACH good
  const targetAch = currentAqi !== null && currentAqi > 200 ? 4.8 : currentAqi !== null && currentAqi > 100 ? 3.5 : 2.5;
  const recommendedCadrM3h = Math.round(roomVolumeM3 * targetAch);

  let purifierCoverageStatus: IndoorOptimizationPlan['purifierCoverageStatus'] = 'No Purifier Configured';
  let purifierCoverageNote = `For your ${indoor.primaryRoomAreaSqFt} sq ft primary room (${roomVolumeM3} m³), look for a True HEPA (H13) unit rated at least ${recommendedCadrM3h} m³/h CADR (${targetAch} air changes/hour) without ozone-generating ionizers.`;

  if (indoor.hasAirPurifier) {
    if (indoor.purifierCadrM3h >= recommendedCadrM3h * 0.9) {
      purifierCoverageStatus = 'Adequate';
      purifierCoverageNote = `Your purifier (${indoor.purifierCadrM3h} m³/h CADR) meets the ${recommendedCadrM3h} m³/h target for this room. Place it at least 30 cm from walls and run continuously on medium/auto during smog episodes.`;
    } else {
      purifierCoverageStatus = 'Undersized';
      purifierCoverageNote = `Your current purifier (${indoor.purifierCadrM3h} m³/h CADR) is below the ${recommendedCadrM3h} m³/h target for ${indoor.primaryRoomAreaSqFt} sq ft. Close bedroom doors at night so the purifier cleans a smaller enclosed sleeping zone effectively.`;
    }
  }

  // Analyze hourly forecast for safest ventilation window
  const validHours = hourlyForecast.filter((h) => h.aqi !== null) as Array<HourlyAqiPoint & { aqi: number }>;
  let ventilationGuidance: IndoorOptimizationPlan['ventilationGuidance'];
  if (validHours.length === 0) {
    ventilationGuidance = {
      status: 'Check Local Readings',
      bestWindowLabel: 'Forecast unavailable',
      detail: 'Hourly outdoor forecast is currently unavailable. Ventilate briefly only when visibility is clear and traffic is minimal.',
    };
  } else {
    const safest = [...validHours].sort((a, b) => a.aqi - b.aqi)[0];
    if (safest.aqi <= 100) {
      ventilationGuidance = {
        status: 'Open Brief Window',
        bestWindowLabel: `${safest.label} (Forecast AQI ~${safest.aqi})`,
        detail: `Cross-ventilate for 15–20 minutes around ${safest.label} to flush indoor CO₂ and cooking VOCs while outdoor particulate levels are lowest.`,
      };
    } else if (safest.aqi <= 200) {
      ventilationGuidance = {
        status: 'Open Brief Window',
        bestWindowLabel: `${safest.label} (Lowest window: AQI ~${safest.aqi})`,
        detail: `Outdoor air remains moderately polluted. Limit natural airing to a brief 5–10 minute flush at ${safest.label} with purifier boosted immediately afterward.`,
      };
    } else {
      ventilationGuidance = {
        status: 'Keep Windows Sealed',
        bestWindowLabel: `No clean window today (Lowest forecast AQI ~${safest.aqi} at ${safest.label})`,
        detail: `Outdoor AQI remains Poor to Severe across the forecast. Keep windows closed, use draft stoppers on gaps, and rely on mechanical HEPA filtration.`,
      };
    }
  }

  const recommendations: IndoorRecommendationItem[] = [
    {
      id: 'vent-timing',
      category: 'Ventilation',
      title: 'Forecast-timed ventilation & door draft sealing',
      budgetTier: 'Free',
      priority: 'Essential',
      actionDetail: `${ventilationGuidance.detail} Place rolled cotton towels or inexpensive EPDM weather-stripping along balcony and entrance door gaps during winter inversion peaks.`,
      scientificBasis: 'Outdoor PM2.5 infiltrates leaky apartment envelopes within 1–2 hours; sealing drafts can lower indoor-to-outdoor infiltration ratios by 30–50%.',
    },
    {
      id: 'cooking-exhaust',
      category: 'Cooking & Combustion',
      title: indoor.cookingFuel === 'biomass_solid'
        ? 'Transition away from indoor solid fuel & maximize kitchen cross-exhaust'
        : 'Active kitchen exhaust during all high-heat cooking & frying',
      budgetTier: indoor.hasKitchenExhaust ? 'Free' : 'Moderate',
      priority: 'Essential',
      actionDetail: indoor.hasKitchenExhaust
        ? 'Switch on the kitchen chimney/exhaust fan 5 minutes before cooking and keep it running 10 minutes after finishing, keeping the kitchen door closed to isolate smoke.'
        : 'Install a window-mounted kitchen exhaust fan blowing outward and use lidded pressure cooking to drastically cut indoor PM2.5 and NO₂ spikes.',
      scientificBasis: 'Unvented gas cooking and oil frying routinely spike indoor PM2.5 above 250 µg/m³—comparable to severe outdoor smog.',
    },
    {
      id: 'zero-combustion',
      category: 'Cooking & Combustion',
      title: 'Eliminate indoor incense, mosquito coils, candles & tobacco smoke',
      budgetTier: 'Free',
      priority: 'Essential',
      actionDetail: 'Replace indoor incense sticks, dhoop, scented candles, and burning mosquito coils with electric liquid vaporizers, window mesh screens, or non-combustive options.',
      scientificBasis: 'A single burning incense stick or mosquito coil inside a closed winter room can release PM2.5 equivalent to dozens of cigarettes.',
    },
    {
      id: 'wet-mopping',
      category: 'Dust & Cleaning',
      title: 'Switch from dry sweeping/dusting to damp microfiber mopping',
      budgetTier: 'Free',
      priority: 'High',
      actionDetail: 'Avoid dry brooms and feather dusters that re-suspend settled PM10 and fine dust into breathing height. Wipe surfaces with a damp microfiber cloth and mop floors daily; enforce a shoes-off entryway.',
      scientificBasis: 'Dry sweeping re-aerosolizes settled heavy metals and crustal dust for up to 2 hours.',
    },
    {
      id: 'hepa-filtration',
      category: 'Filtration',
      title: indoor.hasAirPurifier
        ? 'Optimize HEPA purifier placement & filter maintenance schedule'
        : budgetTier === 'minimal'
          ? 'Build a low-cost MERV-13 / HEPA box-fan DIY purifier (Corsi-Rosenthal approach)'
          : `Select a True HEPA H13 purifier sized for ${recommendedCadrM3h} m³/h CADR`,
      budgetTier: indoor.hasAirPurifier ? 'Low Cost' : budgetTier === 'minimal' ? 'Low Cost' : 'Equipment Investment',
      priority: currentAqi !== null && currentAqi > 150 ? 'Essential' : 'Recommended',
      actionDetail: indoor.hasAirPurifier
        ? 'Vacuum the washable mesh pre-filter every 2 weeks (never wash the paper HEPA cartridge with water). Replace the HEPA filter every 6–9 months during heavy winter smog seasons.'
        : budgetTier === 'minimal'
          ? 'Tape a pleated MERV-13 or replacement H13 filter sealed cleanly to the intake of a standard box fan for bedroom nighttime filtration at a fraction of commercial cost.'
          : `${purifierCoverageNote} Prioritize bedrooms first since families spend 7–9 hours sleeping there.`,
      scientificBasis: 'Mechanical True HEPA (H13) captures ≥99.95% of 0.3 µm particles without emitting indoor ozone.',
    },
    {
      id: 'humidity-mold',
      category: 'Humidity & Mold',
      title: 'Maintain 40–55% relative indoor humidity without creating dampness',
      budgetTier: 'Low Cost',
      priority: 'Recommended',
      actionDetail: 'Use an inexpensive digital hygrometer. Run bathroom exhaust fans after hot showers, dry laundry outside or in ventilated utility spaces rather than bedrooms, and fix wall condensation promptly.',
      scientificBasis: 'Humidity above 60% accelerates dust mites and mold spores; below 30% dries nasal mucosa, reducing natural airway defense against smog.',
    },
  ];

  const checklist = [
    { id: 'chk-1', label: 'Close exterior windows & seal entry door gaps during high-AQI hours', category: 'Ventilation' },
    { id: 'chk-2', label: 'Run kitchen exhaust fan before, during, and 10 min after cooking', category: 'Cooking' },
    { id: 'chk-3', label: 'Keep home free of incense, candles, mosquito coils, and tobacco smoke', category: 'Combustion' },
    { id: 'chk-4', label: 'Damp-mop floors & wipe surfaces instead of dry broom sweeping', category: 'Dust Control' },
    { id: 'chk-5', label: 'Inspect purifier pre-filter mesh and keep bedroom door shut while purifying', category: 'Filtration' },
    { id: 'chk-6', label: 'Verify indoor relative humidity stays between 40% and 55%', category: 'Humidity' },
    { id: 'chk-7', label: 'Store outdoor shoes and smog-exposed outer coats near the entrance', category: 'Dust Control' },
  ];

  return {
    roomVolumeM3,
    recommendedCadrM3h,
    targetAch,
    purifierCoverageStatus,
    purifierCoverageNote,
    ventilationGuidance,
    humidityTarget: '40% – 55% RH (comfortable airway moisture without mold growth)',
    recommendations,
    checklist,
    houseplantScienceNote:
      'Scientific fact: Peer-reviewed chamber studies (Cummings & Waring, 2020) show that ordinary houseplants provide negligible whole-room air cleaning—you would need 100+ plants per square meter to match a single HEPA purifier or modest ventilation. Enjoy houseplants for wellbeing and visual calm, never as a substitute for HEPA filtration or source control.',
  };
}
