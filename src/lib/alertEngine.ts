import type { AirQualityPayload, HouseholdProfile, NotificationSettings, SmartAlert } from '../types/breathewise';

export function evaluateSmartAlerts(
  air: AirQualityPayload,
  profile: HouseholdProfile,
  settings: NotificationSettings,
): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const locationLabel = `${air.location.name}${air.location.admin1 ? `, ${air.location.admin1}` : ''}`;
  const nowIso = new Date().toISOString();
  const nextCheck = new Date(Date.now() + 2 * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const aqi = air.aqi;
  const pm25 = air.pollutants.pm25;

  if (aqi !== null && aqi >= settings.severeAqiThreshold) {
    alerts.push({
      id: `alert-severe-${air.location.name}-${Math.floor(aqi / 25)}`,
      category: 'Severe AQI Alert',
      severity: 'critical',
      targetGroup: 'General Household',
      whatHappened: `AQI reached ${aqi} (${air.category}) under ${air.standardLabel}, driven by ${air.primaryPollutant}.`,
      whereHappened: locationLabel,
      whyItMatters: 'Sustained exposure at this level irritates airways even in healthy adults and sharply increases particulate load indoors.',
      whatToDo: 'Cancel non-essential outdoor trips, seal windows and door drafts, run HEPA filtration continuously, and wear a snug N95/FFP2 respirator outdoors.',
      checkAgainAt: `Re-check forecast at ${nextCheck}`,
      createdAt: nowIso,
      isRead: false,
    });
  } else if (aqi !== null && aqi >= 151 && settings.notifyGeneral) {
    alerts.push({
      id: `alert-unhealthy-${air.location.name}`,
      category: 'Unhealthy Outdoor Conditions',
      severity: 'high',
      targetGroup: 'General Household',
      whatHappened: `Outdoor air quality deteriorated to AQI ${aqi} (${air.category}).`,
      whereHappened: locationLabel,
      whyItMatters: 'Outdoor aerobic exertion and rush-hour commuting significantly elevate fine particulate inhalation.',
      whatToDo: 'Shift workouts indoors, combine errands into a single trip, and close roadside-facing windows.',
      checkAgainAt: `Re-check around ${nextCheck}`,
      createdAt: nowIso,
      isRead: false,
    });
  }

  if (pm25 !== null && pm25 >= settings.pm25SpikeThreshold) {
    alerts.push({
      id: `alert-pm25-${air.location.name}`,
      category: 'PM2.5 Spike',
      severity: pm25 >= 150 ? 'critical' : 'high',
      targetGroup: profile.hasChildren || profile.hasInfants ? 'Children' : 'General Household',
      whatHappened: `Fine particulate matter (PM2.5) measured at ${pm25.toFixed(1)} µg/m³ (threshold: ${settings.pm25SpikeThreshold} µg/m³).`,
      whereHappened: locationLabel,
      whyItMatters: 'PM2.5 particles penetrate deep into lung tissue and enter the bloodstream, posing heightened risk to developing lungs.',
      whatToDo: 'Keep children indoors for play, ensure kitchen exhaust is used during cooking, and boost indoor air filtration.',
      checkAgainAt: `Monitor next hourly update at ${nextCheck}`,
      createdAt: nowIso,
      isRead: false,
    });
  }

  if ((profile.hasChildren || profile.hasInfants) && settings.notifyChildren && aqi !== null && aqi >= 101) {
    alerts.push({
      id: `alert-children-${air.location.name}`,
      category: 'Routine Adjustment',
      severity: aqi >= 201 ? 'high' : 'moderate',
      targetGroup: 'Children',
      whatHappened: `Elevated pollution (${aqi} ${air.category}) coincides with children's outdoor hours.`,
      whereHappened: locationLabel,
      whyItMatters: 'Official health guidance classifies infants and children as sensitive groups due to higher respiratory rates per body weight.',
      whatToDo: 'Swap evening park play for indoor activities, keep school commute windows closed, and pack well-fitting youth particulate masks if AQI > 200.',
      checkAgainAt: `Check before school/evening play at ${nextCheck}`,
      createdAt: nowIso,
      isRead: false,
    });
  }

  if (profile.hasElderly && settings.notifyElderly && aqi !== null && aqi >= 101) {
    alerts.push({
      id: `alert-elderly-${air.location.name}`,
      category: 'Routine Adjustment',
      severity: aqi >= 201 ? 'high' : 'moderate',
      targetGroup: 'Elderly',
      whatHappened: `Air quality is ${air.category} (AQI ${aqi}) for senior household members.`,
      whereHappened: locationLabel,
      whyItMatters: 'Older adults face greater cardiovascular and respiratory strain during elevated particulate episodes.',
      whatToDo: 'Replace early-morning walks with gentle indoor walking after breakfast, keep regular prescribed medications accessible, and consult a clinician if symptoms arise.',
      checkAgainAt: `Re-evaluate midday window at ${nextCheck}`,
      createdAt: nowIso,
      isRead: false,
    });
  }

  if (profile.hasOutdoorWorkers && settings.notifyOutdoorWorker && aqi !== null && aqi >= 151) {
    alerts.push({
      id: `alert-worker-${air.location.name}`,
      category: 'Unhealthy Outdoor Conditions',
      severity: aqi >= 250 ? 'critical' : 'high',
      targetGroup: 'Outdoor Workers',
      whatHappened: `Prolonged outdoor shift risk at AQI ${aqi} (${air.category}).`,
      whereHappened: locationLabel,
      whyItMatters: 'Continuous multi-hour exposure near traffic compounds total inhaled particulate dose.',
      whatToDo: 'Wear a properly sealed N95/FFP2 mask (replace when damp or soiled), take breaks inside enclosed spaces, and hydrate frequently.',
      checkAgainAt: `Re-check shift conditions at ${nextCheck}`,
      createdAt: nowIso,
      isRead: false,
    });
  }

  if (air.weather.inversionRisk === 'high') {
    alerts.push({
      id: `alert-inversion-${air.location.name}`,
      category: 'Weather Inversion Risk',
      severity: 'moderate',
      targetGroup: 'General Household',
      whatHappened: 'Meteorological conditions indicate high winter temperature-inversion trapping risk.',
      whereHappened: locationLabel,
      whyItMatters: air.weather.inversionReason,
      whatToDo: 'Anticipate sharper pollution build-up after sunset; finish outdoor errands earlier and avoid airing rooms overnight.',
      checkAgainAt: `Review morning dispersion at 08:00`,
      createdAt: nowIso,
      isRead: false,
    });
  }

  if (!profile.indoorProfile.hasKitchenExhaust || profile.indoorProfile.cookingFuel === 'biomass_solid') {
    alerts.push({
      id: `alert-indoor-risk-${air.location.name}`,
      category: 'Poor Indoor Air Risk',
      severity: 'advisory',
      targetGroup: 'General Household',
      whatHappened: 'Indoor profile indicates elevated cooking-smoke retention risk during closed-window days.',
      whereHappened: `Home indoor environment (${locationLabel})`,
      whyItMatters: 'When exterior windows stay closed for winter smog, unvented cooking aerosols accumulate rapidly indoors.',
      whatToDo: 'Use lidded pots, isolate the kitchen door while cooking, and consider adding an outward-venting exhaust fan.',
      checkAgainAt: 'Review in Indoor Air Optimization Center',
      createdAt: nowIso,
      isRead: false,
    });
  }

  return alerts;
}
