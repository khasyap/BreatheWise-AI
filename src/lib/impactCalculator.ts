import type { HouseholdProfile, SustainabilityActivityRecord } from '../types/breathewise';

export interface EmissionActionDefinition {
  actionKey: string;
  category: 'transportation' | 'household' | 'shopping' | 'community';
  title: string;
  unitLabel: string;
  defaultQuantity: number;
  // Transparent, auditable emission & resource factors
  co2KgPerUnit: number;
  fuelLPerUnit: number;
  energyKwhPerUnit: number;
  costSavedInrPerUnit: number;
  costSavedUsdPerUnit: number;
  sourceCitation: string;
  currentBehavior: string;
  suggestedAlternative: string;
  implementationSteps: string[];
  environmentalBenefit: string;
  requiresSafeOutdoorAir?: boolean;
}

// Configurable transparent emission factor catalog
// Sources: Central Electricity Authority (CEA) India CO2 Baseline v19 (0.716 kg CO2/kWh),
// UK DEFRA / IPCC 2024 transport factors (petrol car ~0.171 kg CO2/km, metro ~0.035 kg CO2/km, bus ~0.089 kg CO2/km).
export const EMISSION_ACTION_CATALOG: EmissionActionDefinition[] = [
  {
    actionKey: 'car_to_metro',
    category: 'transportation',
    title: 'Replace solo petrol car trip with Metro / Electric Rail',
    unitLabel: 'km shifted',
    defaultQuantity: 15,
    co2KgPerUnit: 0.136, // 0.171 - 0.035 kg CO2e/km
    fuelLPerUnit: 0.072, // ~13.8 km/L city petrol economy
    energyKwhPerUnit: 0,
    costSavedInrPerUnit: 5.2,
    costSavedUsdPerUnit: 0.14,
    sourceCitation: 'DEFRA 2024 passenger car vs. urban electric rail factor',
    currentBehavior: 'Solo petrol car commute through congested city arterials',
    suggestedAlternative: 'Electric metro/rail commute with enclosed station transit',
    implementationSteps: [
      'Use a transit smart card to eliminate ticket queue wait time.',
      'Wear a fitted N95 mask on last-mile approaches during Poor+ AQI days.',
      'Pair with e-rickshaw or feeder bus rather than walking when AQI exceeds 150.',
    ],
    environmentalBenefit: 'Cuts tailpipe NOx, CO, and lifecycle CO2e per passenger-kilometer by ~80%.',
  },
  {
    actionKey: 'car_to_bus',
    category: 'transportation',
    title: 'Shift petrol car commute to CNG / Electric Public Bus',
    unitLabel: 'km shifted',
    defaultQuantity: 12,
    co2KgPerUnit: 0.082, // 0.171 - 0.089 kg CO2e/km
    fuelLPerUnit: 0.072,
    energyKwhPerUnit: 0,
    costSavedInrPerUnit: 6.0,
    costSavedUsdPerUnit: 0.16,
    sourceCitation: 'IPCC & MoRTH urban public transit lifecycle factor',
    currentBehavior: 'Daily single-occupancy car commuting',
    suggestedAlternative: 'Scheduled AC public bus or shuttle transit',
    implementationSteps: [
      'Check live bus arrival times to minimize roadside standing exposure.',
      'Select AC or closed-window electric buses on high-particulate days.',
    ],
    environmentalBenefit: 'Reduces urban road congestion and per-passenger fuel consumption.',
  },
  {
    actionKey: 'carpool_commute',
    category: 'transportation',
    title: 'Share commute via 3-person office or school carpool',
    unitLabel: 'km shared',
    defaultQuantity: 18,
    co2KgPerUnit: 0.114, // 2/3 of 0.171 kg CO2e/km avoided
    fuelLPerUnit: 0.048,
    energyKwhPerUnit: 0,
    costSavedInrPerUnit: 4.8,
    costSavedUsdPerUnit: 0.12,
    sourceCitation: 'Calculated from 3-occupant split of DEFRA average petrol car (0.171 kg/km)',
    currentBehavior: 'Three separate vehicles running the same school or office corridor',
    suggestedAlternative: 'Rotating neighborhood carpool with cabin air set to recirculate',
    implementationSteps: [
      'Coordinate pickup rotation with 2 neighbors on the same route.',
      'Replace vehicle cabin air filter with HEPA/activated-carbon grade.',
      'Keep cabin ventilation on recirculate mode during winter smog traffic.',
    ],
    environmentalBenefit: 'Removes two active exhaust sources per shared corridor trip.',
  },
  {
    actionKey: 'remote_work_day',
    category: 'transportation',
    title: 'Work remotely instead of commuting on severe smog days',
    unitLabel: 'round-trip km avoided',
    defaultQuantity: 24,
    co2KgPerUnit: 0.171,
    fuelLPerUnit: 0.072,
    energyKwhPerUnit: 0,
    costSavedInrPerUnit: 7.5,
    costSavedUsdPerUnit: 0.19,
    sourceCitation: 'DEFRA 2024 average petrol vehicle tailpipe + fuel cost estimate',
    currentBehavior: 'Peak-hour two-way commute during severe winter inversion',
    suggestedAlternative: 'Approved remote-work day with filtered indoor workspace',
    implementationSteps: [
      'Request smog-day remote flexibility when forecast AQI exceeds 300.',
      'Consolidate in-person meetings onto lower-AQI mid-week afternoons.',
    ],
    environmentalBenefit: 'Zero commute tailpipe emissions while eliminating roadside PM2.5 inhalation.',
  },
  {
    actionKey: 'active_mobility_clean_air',
    category: 'transportation',
    title: 'Walk or cycle short errands (only when outdoor AQI is safe)',
    unitLabel: 'km shifted',
    defaultQuantity: 4,
    co2KgPerUnit: 0.171,
    fuelLPerUnit: 0.075,
    energyKwhPerUnit: 0,
    costSavedInrPerUnit: 7.8,
    costSavedUsdPerUnit: 0.2,
    sourceCitation: 'Short cold-start car trip factor (higher per-km fuel use)',
    currentBehavior: 'Driving short <3 km neighborhood errands with a cold engine',
    suggestedAlternative: 'Walking or cycling along low-traffic lanes when AQI ≤ 100',
    implementationSteps: [
      'Verify current AQI is Good or Satisfactory (≤100) before choosing active travel.',
      'Choose residential back-streets rather than arterial roads.',
    ],
    environmentalBenefit: 'Eliminates high-emission cold-start exhaust bursts.',
    requiresSafeOutdoorAir: true,
  },
  {
    actionKey: 'led_standby_savings',
    category: 'household',
    title: 'Cut household electricity waste (LEDs, smart strips, 24°C AC/heater control)',
    unitLabel: 'kWh saved',
    defaultQuantity: 4,
    co2KgPerUnit: 0.716, // CEA India Grid Emission Factor v19
    fuelLPerUnit: 0,
    energyKwhPerUnit: 1.0,
    costSavedInrPerUnit: 8.5,
    costSavedUsdPerUnit: 0.16,
    sourceCitation: 'Central Electricity Authority (CEA) India CO2 Baseline v19 (0.716 kg/kWh)',
    currentBehavior: 'Idle appliances, uninsulated heating, and inefficient bulbs',
    suggestedAlternative: '5-star inverter appliances, LED lighting, and standby cutoff switches',
    implementationSteps: [
      'Switch off standby power strips overnight (routers/purifiers excluded).',
      'Use insulated curtains in winter to retain indoor warmth without space heaters.',
    ],
    environmentalBenefit: 'Lowers peak coal-fired grid demand and household electricity bills.',
  },
  {
    actionKey: 'clean_induction_cooking',
    category: 'household',
    title: 'Use pressure cooking / electric induction with exhaust hood',
    unitLabel: 'meals cooked efficiently',
    defaultQuantity: 2,
    co2KgPerUnit: 0.32,
    fuelLPerUnit: 0,
    energyKwhPerUnit: 0.45,
    costSavedInrPerUnit: 12,
    costSavedUsdPerUnit: 0.25,
    sourceCitation: 'TERI clean-cooking thermal efficiency comparison (open pan vs. lidded/induction)',
    currentBehavior: 'Open-flame prolonged simmering without lids or exhaust ventilation',
    suggestedAlternative: 'Lidded pressure cooking or induction with active kitchen exhaust',
    implementationSteps: [
      'Keep lids on pots to cut fuel/energy use by 30–40%.',
      'Run the kitchen chimney or exhaust fan 5 minutes before and 10 minutes after cooking.',
    ],
    environmentalBenefit: 'Cuts indoor NO2 and ultrafine cooking aerosols alongside lower fuel consumption.',
  },
  {
    actionKey: 'waste_segregation_compost',
    category: 'shopping',
    title: 'Segregate household waste & avoid open leaf/trash burning',
    unitLabel: 'kg organic/recyclable diverted',
    defaultQuantity: 3,
    co2KgPerUnit: 0.65,
    fuelLPerUnit: 0,
    energyKwhPerUnit: 0,
    costSavedInrPerUnit: 5,
    costSavedUsdPerUnit: 0.1,
    sourceCitation: 'EPA WARM methane & open-burning avoidance estimate (conservative average)',
    currentBehavior: 'Mixed waste disposal or neighborhood garden-leaf burning',
    suggestedAlternative: 'Dry/wet segregation + community composting + reusable carry bags',
    implementationSteps: [
      'Maintain separate wet (compostable) and dry (recyclable) bins at home.',
      'Coordinate with RWA/apartment management to compost winter fallen leaves instead of burning.',
    ],
    environmentalBenefit: 'Prevents toxic local smoke plumes and landfill methane emissions.',
  },
  {
    actionKey: 'local_reusable_shopping',
    category: 'shopping',
    title: 'Consolidate local grocery runs & use reusable containers',
    unitLabel: 'trips/packages avoided',
    defaultQuantity: 2,
    co2KgPerUnit: 0.85,
    fuelLPerUnit: 0.22,
    energyKwhPerUnit: 0,
    costSavedInrPerUnit: 45,
    costSavedUsdPerUnit: 1.2,
    sourceCitation: 'Last-mile delivery & single-use packaging lifecycle midpoint estimate',
    currentBehavior: 'Multiple separate quick-commerce deliveries and single-use plastic bags',
    suggestedAlternative: 'Weekly consolidated list + reusable cloth bags & steel containers',
    implementationSteps: [
      'Combine weekly produce and household orders into a single scheduled slot.',
      'Keep two washable cloth bags near the entryway.',
    ],
    environmentalBenefit: 'Reduces two-wheeler delivery traffic and plastic packaging waste.',
  },
  {
    actionKey: 'anti_burning_pledge',
    category: 'community',
    title: 'Report or replace neighborhood open waste / biomass burning',
    unitLabel: 'incidents prevented',
    defaultQuantity: 1,
    co2KgPerUnit: 4.5,
    fuelLPerUnit: 0,
    energyKwhPerUnit: 0,
    costSavedInrPerUnit: 0,
    costSavedUsdPerUnit: 0,
    sourceCitation: 'Conservative estimate per 5 kg dry biomass/leaf pile diverted from open burning',
    currentBehavior: 'Security guards or sweepers burning winter leaves and plastic scraps',
    suggestedAlternative: 'Provide warm winter gear/electric heaters for guards & municipal leaf collection',
    implementationSteps: [
      'Pool RWA funds to provide thermal jackets and safe electric heaters for night guards.',
      'Designate a neighborhood leaf-mulching corner in the community park.',
    ],
    environmentalBenefit: 'Directly prevents dense localized smoke and carcinogenic particulate plumes.',
  },
];

export function calculateActionImpact(
  actionKey: string,
  quantity: number,
  currency: 'INR' | 'USD',
): {
  definition: EmissionActionDefinition;
  co2SavedKg: number;
  fuelSavedL: number;
  energySavedKwh: number;
  costSaved: number;
} {
  const definition = EMISSION_ACTION_CATALOG.find((a) => a.actionKey === actionKey);
  if (!definition) {
    throw new Error(`Unknown sustainability action key: ${actionKey}`);
  }
  const safeQty = Math.max(0, Number(quantity) || 0);
  const costPerUnit = currency === 'INR' ? definition.costSavedInrPerUnit : definition.costSavedUsdPerUnit;
  return {
    definition,
    co2SavedKg: Number((safeQty * definition.co2KgPerUnit).toFixed(2)),
    fuelSavedL: Number((safeQty * definition.fuelLPerUnit).toFixed(2)),
    energySavedKwh: Number((safeQty * definition.energyKwhPerUnit).toFixed(2)),
    costSaved: Number((safeQty * costPerUnit).toFixed(2)),
  };
}

export interface AggregatedImpact {
  daily: { co2Kg: number; fuelL: number; energyKwh: number; costSaved: number; actions: number };
  weekly: { co2Kg: number; fuelL: number; energyKwh: number; costSaved: number; actions: number };
  monthly: { co2Kg: number; fuelL: number; energyKwh: number; costSaved: number; actions: number };
  allTime: { co2Kg: number; fuelL: number; energyKwh: number; costSaved: number; actions: number };
}

export function aggregateImpactRecords(
  records: SustainabilityActivityRecord[],
  nowDate: Date = new Date(),
): AggregatedImpact {
  const todayStr = nowDate.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(nowDate.getTime() - 6 * 86400000).toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(nowDate.getTime() - 29 * 86400000).toISOString().slice(0, 10);

  const blank = () => ({ co2Kg: 0, fuelL: 0, energyKwh: 0, costSaved: 0, actions: 0 });
  const daily = blank();
  const weekly = blank();
  const monthly = blank();
  const allTime = blank();

  for (const r of records) {
    const add = (bucket: ReturnType<typeof blank>) => {
      bucket.co2Kg = Number((bucket.co2Kg + r.co2SavedKg).toFixed(2));
      bucket.fuelL = Number((bucket.fuelL + r.fuelSavedL).toFixed(2));
      bucket.energyKwh = Number((bucket.energyKwh + r.energySavedKwh).toFixed(2));
      bucket.costSaved = Number((bucket.costSaved + r.costSaved).toFixed(2));
      bucket.actions += 1;
    };
    add(allTime);
    if (r.loggedDate >= thirtyDaysAgo) add(monthly);
    if (r.loggedDate >= sevenDaysAgo) add(weekly);
    if (r.loggedDate === todayStr) add(daily);
  }

  return { daily, weekly, monthly, allTime };
}

export interface PersonalizedSustainableAlternative {
  actionKey: string;
  category: EmissionActionDefinition['category'];
  title: string;
  currentBehavior: string;
  suggestedAlternative: string;
  estimatedMonthlyCo2Kg: number;
  estimatedMonthlySavings: number;
  currency: 'INR' | 'USD';
  implementationSteps: string[];
  environmentalBenefit: string;
  airSafetyNote: string;
  isSafeToday: boolean;
}

export function getPersonalizedSustainableAlternatives(
  profile: HouseholdProfile,
  currentAqi: number | null,
): PersonalizedSustainableAlternative[] {
  const unsafeOutdoorAir = currentAqi !== null && currentAqi > 100;

  return EMISSION_ACTION_CATALOG.map((item) => {
    const isSafeToday = !(item.requiresSafeOutdoorAir && unsafeOutdoorAir);
    const monthlyMultiplier = item.category === 'transportation' ? 20 : item.category === 'community' ? 4 : 15;
    const baseQty =
      item.category === 'transportation' && profile.dailyCommuteKm > 0
        ? Math.min(profile.dailyCommuteKm, 35)
        : item.defaultQuantity;

    const unitImpact = calculateActionImpact(item.actionKey, baseQty * monthlyMultiplier, profile.currency);

    let airSafetyNote = 'Safe to adopt regardless of outdoor winter smog levels.';
    if (item.requiresSafeOutdoorAir) {
      airSafetyNote = unsafeOutdoorAir
        ? `Deferred today: Current AQI (${currentAqi}) is elevated. Do not walk or cycle outdoors for sustainability when exposure is unsafe; choose enclosed transit or consolidate errands instead.`
        : 'Outdoor air quality currently permits low-traffic walking or cycling.';
    } else if (item.actionKey === 'remote_work_day' && currentAqi !== null && currentAqi > 200) {
      airSafetyNote = 'Strongly recommended today: eliminates peak-hour roadside PM2.5 exposure.';
    }

    return {
      actionKey: item.actionKey,
      category: item.category,
      title: item.title,
      currentBehavior: item.currentBehavior,
      suggestedAlternative: item.suggestedAlternative,
      estimatedMonthlyCo2Kg: unitImpact.co2SavedKg,
      estimatedMonthlySavings: unitImpact.costSaved,
      currency: profile.currency,
      implementationSteps: item.implementationSteps,
      environmentalBenefit: item.environmentalBenefit,
      airSafetyNote,
      isSafeToday,
    };
  }).sort((a, b) => Number(b.isSafeToday) - Number(a.isSafeToday));
}
