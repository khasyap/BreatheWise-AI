import { categorizeAqi } from './aqiStandards';
import type {
  AqiStandardId,
  YearOverYearPoint,
  YearOverYearWeeklyBucket,
} from '../types/breathewise';

export interface YearOverYearDateRanges {
  monthName: string;
  monthShort: string;
  monthNumber: number;
  currentYear: number;
  previousYear: number;
  daysCompared: number;
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
}

export interface DailyYoyObservation {
  date: string; // YYYY-MM-DD
  avgAqi: number | null;
  avgPm25: number | null;
}

export interface YearOverYearComparisonResult {
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
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function daysInMonthUtc(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

export function computeYearOverYearDateRanges(referenceDate: Date = new Date()): YearOverYearDateRanges {
  const currentYear = referenceDate.getUTCFullYear();
  const previousYear = currentYear - 1;
  const monthIndex0 = referenceDate.getUTCMonth();
  const monthNumber = monthIndex0 + 1;
  const currentDay = referenceDate.getUTCDate();

  const prevMonthDays = daysInMonthUtc(previousYear, monthIndex0);
  const previousEndDay = Math.min(currentDay, prevMonthDays);

  const monthRef = new Date(Date.UTC(currentYear, monthIndex0, 15));
  const monthName = monthRef.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const monthShort = monthRef.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });

  const mm = pad2(monthNumber);
  return {
    monthName,
    monthShort,
    monthNumber,
    currentYear,
    previousYear,
    daysCompared: currentDay,
    currentStart: `${currentYear}-${mm}-01`,
    currentEnd: `${currentYear}-${mm}-${pad2(currentDay)}`,
    previousStart: `${previousYear}-${mm}-01`,
    previousEnd: `${previousYear}-${mm}-${pad2(previousEndDay)}`,
  };
}

export function buildYearOverYearComparison(
  currentObs: DailyYoyObservation[],
  previousObs: DailyYoyObservation[],
  ranges: YearOverYearDateRanges,
  standard: AqiStandardId,
): YearOverYearComparisonResult {
  const currentByDay = new Map<number, DailyYoyObservation>();
  for (const obs of currentObs) {
    const day = Number(obs.date.slice(8, 10));
    if (Number.isInteger(day) && day >= 1 && day <= 31) {
      currentByDay.set(day, obs);
    }
  }

  const previousByDay = new Map<number, DailyYoyObservation>();
  for (const obs of previousObs) {
    const day = Number(obs.date.slice(8, 10));
    if (Number.isInteger(day) && day >= 1 && day <= 31) {
      previousByDay.set(day, obs);
    }
  }

  const mm = pad2(ranges.monthNumber);
  const dailyPoints: YearOverYearPoint[] = [];

  for (let day = 1; day <= ranges.daysCompared; day++) {
    const cur = currentByDay.get(day);
    const prev = previousByDay.get(day);
    const currentAqi = cur?.avgAqi ?? null;
    const previousAqi = prev?.avgAqi ?? null;
    const deltaAqi =
      currentAqi !== null && previousAqi !== null ? Math.round(currentAqi - previousAqi) : null;

    dailyPoints.push({
      dayOfMonth: day,
      label: `${ranges.monthShort} ${pad2(day)}`,
      currentDate: `${ranges.currentYear}-${mm}-${pad2(day)}`,
      previousDate: `${ranges.previousYear}-${mm}-${pad2(day)}`,
      currentAqi,
      previousAqi,
      currentPm25: cur?.avgPm25 ?? null,
      previousPm25: prev?.avgPm25 ?? null,
      deltaAqi,
      currentCategory: currentAqi !== null ? categorizeAqi(currentAqi, standard).category : 'Unavailable',
      previousCategory: previousAqi !== null ? categorizeAqi(previousAqi, standard).category : 'Unavailable',
    });
  }

  const validCurrent = dailyPoints.filter((p) => p.currentAqi !== null).map((p) => p.currentAqi as number);
  const validPrevious = dailyPoints.filter((p) => p.previousAqi !== null).map((p) => p.previousAqi as number);
  const paired = dailyPoints.filter((p) => p.currentAqi !== null && p.previousAqi !== null);

  const currentMonthAvgAqi =
    validCurrent.length > 0
      ? Math.round(validCurrent.reduce((a, b) => a + b, 0) / validCurrent.length)
      : null;
  const previousMonthAvgAqi =
    validPrevious.length > 0
      ? Math.round(validPrevious.reduce((a, b) => a + b, 0) / validPrevious.length)
      : null;

  const avgAqiDelta =
    currentMonthAvgAqi !== null && previousMonthAvgAqi !== null
      ? currentMonthAvgAqi - previousMonthAvgAqi
      : null;
  const avgAqiPctChange =
    avgAqiDelta !== null && previousMonthAvgAqi && previousMonthAvgAqi > 0
      ? Number(((avgAqiDelta / previousMonthAvgAqi) * 100).toFixed(1))
      : null;

  const currentPeakAqi = validCurrent.length > 0 ? Math.max(...validCurrent) : null;
  const previousPeakAqi = validPrevious.length > 0 ? Math.max(...validPrevious) : null;

  const betterDaysCount = paired.filter((p) => (p.currentAqi as number) < (p.previousAqi as number)).length;
  const worseDaysCount = paired.filter((p) => (p.currentAqi as number) > (p.previousAqi as number)).length;
  const comparedDaysCount = paired.length;

  let direction: YearOverYearComparisonResult['direction'] = 'insufficient';
  if (avgAqiDelta !== null) {
    if (avgAqiDelta <= -8) direction = 'improved';
    else if (avgAqiDelta >= 8) direction = 'worsened';
    else direction = 'similar';
  }

  // Group into 7-day week buckets (Days 1–7, 8–14, 15–21, 22–31)
  const weekDefs = [
    { label: 'Week 1', start: 1, end: 7 },
    { label: 'Week 2', start: 8, end: 14 },
    { label: 'Week 3', start: 15, end: 21 },
    { label: 'Week 4+', start: 22, end: 31 },
  ];
  const weeklyBuckets: YearOverYearWeeklyBucket[] = weekDefs
    .filter((w) => w.start <= ranges.daysCompared)
    .map((w) => {
      const endDay = Math.min(w.end, ranges.daysCompared);
      const slice = dailyPoints.filter((p) => p.dayOfMonth >= w.start && p.dayOfMonth <= endDay);
      const curVals = slice.filter((p) => p.currentAqi !== null).map((p) => p.currentAqi as number);
      const prevVals = slice.filter((p) => p.previousAqi !== null).map((p) => p.previousAqi as number);
      const currentAvgAqi = curVals.length ? Math.round(curVals.reduce((a, b) => a + b, 0) / curVals.length) : null;
      const previousAvgAqi = prevVals.length ? Math.round(prevVals.reduce((a, b) => a + b, 0) / prevVals.length) : null;
      return {
        label: `${w.label} (${ranges.monthShort} ${w.start}–${endDay})`,
        dayRange: `${ranges.monthShort} ${w.start}–${endDay}`,
        currentAvgAqi,
        previousAvgAqi,
        deltaAqi: currentAvgAqi !== null && previousAvgAqi !== null ? currentAvgAqi - previousAvgAqi : null,
      };
    });

  let plainInsight = `Historical year-over-year AQI comparison for ${ranges.monthName} is currently unavailable.`;
  if (currentMonthAvgAqi !== null && previousMonthAvgAqi !== null && avgAqiDelta !== null) {
    const pctText =
      avgAqiPctChange !== null
        ? ` (${avgAqiPctChange > 0 ? `+${avgAqiPctChange}` : avgAqiPctChange}%)`
        : '';
    if (direction === 'improved') {
      plainInsight = `${ranges.monthName} ${ranges.currentYear} averaged AQI ${currentMonthAvgAqi} versus ${previousMonthAvgAqi} in ${ranges.monthName} ${ranges.previousYear}${pctText}, with cleaner air recorded on ${betterDaysCount} of ${comparedDaysCount} matched days.`;
    } else if (direction === 'worsened') {
      plainInsight = `${ranges.monthName} ${ranges.currentYear} averaged AQI ${currentMonthAvgAqi} versus ${previousMonthAvgAqi} in ${ranges.monthName} ${ranges.previousYear}${pctText}, with heavier pollution recorded on ${worseDaysCount} of ${comparedDaysCount} matched days.`;
    } else {
      plainInsight = `${ranges.monthName} ${ranges.currentYear} (avg AQI ${currentMonthAvgAqi}) is tracking close to ${ranges.monthName} ${ranges.previousYear} (avg AQI ${previousMonthAvgAqi}${pctText}) across ${comparedDaysCount} matched days.`;
    }
  }

  return {
    daysCompared: ranges.daysCompared,
    currentMonthAvgAqi,
    previousMonthAvgAqi,
    avgAqiDelta,
    avgAqiPctChange,
    currentPeakAqi,
    previousPeakAqi,
    betterDaysCount,
    worseDaysCount,
    comparedDaysCount,
    direction,
    plainInsight,
    dailyPoints,
    weeklyBuckets,
  };
}
