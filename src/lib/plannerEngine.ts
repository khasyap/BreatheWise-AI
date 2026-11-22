import type { AirQualityPayload, HouseholdProfile, RoutineTask } from '../types/breathewise';

function findWindowAqi(hourly: AirQualityPayload['hourlyForecast24h'], startHour: number, endHour: number, fallbackAqi: number | null): { min: number | null; max: number | null; label: string } {
  const matching = hourly.filter((p) => {
    const h = new Date(p.timestamp).getHours();
    return h >= startHour && h <= endHour && p.aqi !== null;
  });
  if (matching.length === 0) {
    return {
      min: fallbackAqi,
      max: fallbackAqi,
      label: fallbackAqi !== null ? `Est. AQI ~${fallbackAqi}` : 'Forecast pending',
    };
  }
  const vals = matching.map((m) => m.aqi as number);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return {
    min,
    max,
    label: min === max ? `Forecast AQI ${min}` : `Forecast AQI ${min}–${max}`,
  };
}

export function generatePersonalizedDailyRoutine(
  airData: AirQualityPayload,
  profile: HouseholdProfile,
): RoutineTask[] {
  const forecast = airData.hourlyForecast24h.length > 0 ? airData.hourlyForecast24h : airData.hourly24h;
  const currentAqi = airData.aqi;
  const sensitiveHousehold =
    profile.hasInfants ||
    profile.hasChildren ||
    profile.hasElderly ||
    profile.hasRespiratorySensitivity;

  const morning = findWindowAqi(forecast, 6, 9, currentAqi);
  const midday = findWindowAqi(forecast, 12, 16, currentAqi);
  const evening = findWindowAqi(forecast, 17, 20, currentAqi);
  const night = findWindowAqi(forecast, 21, 23, currentAqi);

  const morningMax = morning.max ?? 150;
  const middayMax = midday.max ?? 150;
  const eveningMax = evening.max ?? 150;
  const nightMax = night.max ?? 150;

  const tasks: RoutineTask[] = [
    {
      id: 'task-morning',
      timeBlock: 'Morning',
      scheduledWindow: '06:30 – 08:00',
      title:
        morningMax > 200
          ? 'Keep windows sealed during morning inversion & inspect indoor air'
          : morningMax > 100
            ? 'Check hourly AQI before opening windows; delay heavy outdoor chores'
            : 'Brief 15-minute morning cross-ventilation while air is fresh',
      priority: morningMax > 200 ? 'Critical' : 'High',
      forecastAqiRange: morning.label,
      alternativeActivity:
        morningMax > 150
          ? 'Do 15 minutes of indoor stretching or mobility near filtered air instead of balcony/park routines.'
          : 'Light balcony tea or neighborhood stroll away from main arterial roads.',
      rationale:
        morningMax > 200
          ? `Early morning winter temperature inversion traps ${airData.primaryPollutant} near ground level (${morning.label}).`
          : `Morning dispersion conditions show ${morning.label}; adapt ventilation strictly to observed readings.`,
      completed: false,
      reminderTime: '06:45',
    },
    {
      id: 'task-school',
      timeBlock: 'School Prep',
      scheduledWindow: '07:15 – 08:30',
      title:
        profile.hasChildren || profile.hasInfants
          ? morningMax > 200
            ? 'Pack child-sized N95/KF94 masks & coordinate enclosed school drop-off'
            : 'Prepare hydration bottle & verify school outdoor recess advisory'
          : 'Review household members’ outdoor exposure schedule for the day',
      priority: (profile.hasChildren || profile.hasInfants) && morningMax > 150 ? 'Critical' : 'Recommended',
      forecastAqiRange: morning.label,
      alternativeActivity: 'Request indoor assembly/PE from school coordinators when local AQI exceeds 200.',
      rationale:
        profile.hasChildren || profile.hasInfants
          ? 'Children breathe more air per kilogram of body weight and are closer to vehicle exhaust height.'
          : 'Coordinating family schedules early prevents unplanned exposure during peak traffic hours.',
      completed: false,
      reminderTime: '07:15',
    },
    {
      id: 'task-commute',
      timeBlock: 'Office Commute',
      scheduledWindow: '08:30 – 10:00',
      title:
        profile.commuteMode === 'remote_wfh'
          ? 'Set up filtered indoor workspace away from street-facing windows'
          : morningMax > 200
            ? 'Use closed-window transit / carpool on recirculate mode + N95 mask'
            : 'Choose lower-traffic corridor or public transit for morning commute',
      priority: morningMax > 200 || profile.hasOutdoorWorkers ? 'High' : 'Recommended',
      forecastAqiRange: morning.label,
      alternativeActivity:
        profile.commuteMode !== 'remote_wfh' && morningMax > 300
          ? 'Request remote work or shift arrival by 90 minutes to bypass peak rush-hour smog.'
          : 'Use metro or AC bus rather than open two-wheeler or roadside walking.',
      rationale:
        profile.hasOutdoorWorkers
          ? 'Outdoor workers accumulate high sustained particulate doses; snug particulate respirators and shaded indoor rest breaks are vital.'
          : 'Roadside PM2.5 and NO₂ concentrations can be 2–3× higher than neighborhood background monitors during rush hour.',
      completed: false,
      reminderTime: '08:20',
    },
    {
      id: 'task-exercise',
      timeBlock: 'Exercise',
      scheduledWindow: '07:00 or 18:00',
      title:
        Math.min(morningMax, eveningMax) > 150 || (sensitiveHousehold && Math.min(morningMax, eveningMax) > 100)
          ? 'Move cardio & strength workout indoors (skip outdoor jogging/cycling)'
          : 'Schedule moderate outdoor exercise during the lowest-AQI window only',
      priority: Math.min(morningMax, eveningMax) > 200 ? 'Critical' : 'High',
      forecastAqiRange: `AM ${morning.label} · PM ${evening.label}`,
      alternativeActivity: '30-minute indoor bodyweight circuit, yoga, stationary cycling, or indoor hall walking.',
      rationale: 'Aerobic exercise increases breathing volume 5–10×, drawing fine particulates deep into alveoli when AQI is elevated.',
      completed: false,
      reminderTime: '07:00',
    },
    {
      id: 'task-recreation',
      timeBlock: 'Outdoor Recreation',
      scheduledWindow: '13:30 – 15:30',
      title:
        middayMax <= 100
          ? 'Best window for brief park time or elderly sunlight walk'
          : middayMax <= 200
            ? 'Keep outdoor breaks brief (<20 min) in tree-buffered spaces away from roads'
            : 'Replace outdoor park play with indoor creative or active family time',
      priority: middayMax > 200 ? 'High' : 'Optional',
      forecastAqiRange: midday.label,
      alternativeActivity: 'Indoor board games, library visit, indoor climbing/play zone, or sunlit window reading.',
      rationale: `Evaluated specifically from midday forecast (${midday.label}) rather than assuming afternoon is automatically clean.`,
      completed: false,
      reminderTime: '13:30',
    },
    {
      id: 'task-errands',
      timeBlock: 'Grocery Shopping',
      scheduledWindow: '14:00 – 16:00',
      title:
        middayMax > 200
          ? 'Consolidate essential errands into one midday trip or schedule grouped delivery'
          : 'Combine neighborhood errands using reusable bags during lower-traffic hours',
      priority: 'Recommended',
      forecastAqiRange: midday.label,
      alternativeActivity: 'Use one consolidated weekly order to minimize both personal exposure and delivery traffic.',
      rationale: 'Combining errands avoids repeated exposure and lowers cold-start vehicle emissions.',
      completed: false,
      reminderTime: '14:00',
    },
    {
      id: 'task-chores',
      timeBlock: 'Household Chores',
      scheduledWindow: '11:00 – 13:00',
      title: 'Damp microfiber mopping & kitchen exhaust check before lunch prep',
      priority: 'Recommended',
      forecastAqiRange: midday.label,
      alternativeActivity: 'Use HEPA-equipped vacuuming instead of dry sweeping to keep settled dust airborne-free.',
      rationale: 'Indoor cooking aerosols and swept dust frequently rival outdoor smog when winter windows remain shut.',
      completed: false,
      reminderTime: '11:30',
    },
    {
      id: 'task-evening',
      timeBlock: 'Evening',
      scheduledWindow: '17:30 – 20:00',
      title:
        eveningMax > 200
          ? 'Seal windows before sunset cooling & avoid evening roadside walks'
          : 'Monitor evening AQI drop-off; keep children indoors if haze builds',
      priority: eveningMax > 200 ? 'Critical' : 'High',
      forecastAqiRange: evening.label,
      alternativeActivity: 'Indoor family stretch, reading, or filtered living-room time as traffic peaks.',
      rationale: `Sunset cooling rapidly lowers the atmospheric mixing layer, causing evening ${airData.primaryPollutant} spikes (${evening.label}).`,
      completed: false,
      reminderTime: '17:30',
    },
    {
      id: 'task-night',
      timeBlock: 'Nighttime',
      scheduledWindow: '21:30 – 23:00',
      title: profile.indoorProfile.hasAirPurifier
        ? 'Close bedroom doors, run HEPA purifier on quiet/medium & check pre-filter'
        : 'Seal bedroom window gaps & keep indoor humidity between 40–55% RH',
      priority: nightMax > 150 ? 'High' : 'Recommended',
      forecastAqiRange: night.label,
      alternativeActivity: 'Place damp-wiped entryway mat outside bedroom and avoid incense/candles overnight.',
      rationale: 'Sleep represents 7–9 continuous hours of breathing; keeping bedrooms clean delivers the largest daily dose reduction.',
      completed: false,
      reminderTime: '21:30',
    },
  ];

  return tasks;
}
