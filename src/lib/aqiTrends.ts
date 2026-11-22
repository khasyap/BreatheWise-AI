import { categorizeAqi, computeAqiFromPollutants, getSeverityVisuals, POLLUTANT_LABELS } from './aqiStandards';
import type { AqiStandardId, DailyAqiPoint, PollutantReadings, SeverityTier } from '../types/breathewise';

export interface AqiCategoryBand {
  id: SeverityTier;
  label: string;
  officialName: string;
  rangeLabel: string;
  min: number;
  max: number;
  fill: string;
  fillOpacity: number;
  darkFillOpacity: number;
  stroke: string;
  darkStroke: string;
  labelColor: string;
  darkLabelColor: string;
  swatchClass: string;
}

export interface TrendYAxisScale {
  max: number;
  ticks: number[];
  visibleBands: AqiCategoryBand[];
}

export function getAqiCategoryBands(standard: AqiStandardId): AqiCategoryBand[] {
  if (standard === 'CPCB_IN') {
    return [
      {
        id: 'good',
        label: 'Good',
        officialName: 'Good',
        rangeLabel: '0–50',
        min: 0,
        max: 50,
        fill: '#15803D',
        fillOpacity: 0.08,
        darkFillOpacity: 0.14,
        stroke: '#15803D',
        darkStroke: '#4ADE80',
        labelColor: '#156A3C',
        darkLabelColor: '#4ADE80',
        swatchClass: 'bg-[#15803D]/25 border-[#15803D]/70 dark:bg-[#4ADE80]/25 dark:border-[#4ADE80]/70',
      },
      {
        id: 'satisfactory',
        label: 'Satisfactory',
        officialName: 'Satisfactory',
        rangeLabel: '51–100',
        min: 50,
        max: 100,
        fill: '#65A30D',
        fillOpacity: 0.09,
        darkFillOpacity: 0.14,
        stroke: '#4D7C0F',
        darkStroke: '#A3E635',
        labelColor: '#3F6212',
        darkLabelColor: '#A3E635',
        swatchClass: 'bg-[#65A30D]/25 border-[#4D7C0F]/70 dark:bg-[#A3E635]/25 dark:border-[#A3E635]/70',
      },
      {
        id: 'moderate',
        label: 'Moderate',
        officialName: 'Moderately Polluted',
        rangeLabel: '101–200',
        min: 100,
        max: 200,
        fill: '#D97706',
        fillOpacity: 0.08,
        darkFillOpacity: 0.13,
        stroke: '#D97706',
        darkStroke: '#FBBF24',
        labelColor: '#9A4B06',
        darkLabelColor: '#FBBF24',
        swatchClass: 'bg-[#D97706]/25 border-[#D97706]/70 dark:bg-[#FBBF24]/25 dark:border-[#FBBF24]/70',
      },
      {
        id: 'poor',
        label: 'Poor',
        officialName: 'Poor',
        rangeLabel: '201–300',
        min: 200,
        max: 300,
        fill: '#EA580C',
        fillOpacity: 0.09,
        darkFillOpacity: 0.14,
        stroke: '#EA580C',
        darkStroke: '#FB923C',
        labelColor: '#B53D0A',
        darkLabelColor: '#FB923C',
        swatchClass: 'bg-[#EA580C]/25 border-[#EA580C]/70 dark:bg-[#FB923C]/25 dark:border-[#FB923C]/70',
      },
      {
        id: 'very_poor',
        label: 'Very Poor',
        officialName: 'Very Poor',
        rangeLabel: '301–400',
        min: 300,
        max: 400,
        fill: '#DC2626',
        fillOpacity: 0.09,
        darkFillOpacity: 0.14,
        stroke: '#DC2626',
        darkStroke: '#F87171',
        labelColor: '#A61B1B',
        darkLabelColor: '#F87171',
        swatchClass: 'bg-[#DC2626]/25 border-[#DC2626]/70 dark:bg-[#F87171]/25 dark:border-[#F87171]/70',
      },
      {
        id: 'severe',
        label: 'Severe',
        officialName: 'Severe',
        rangeLabel: '401–500',
        min: 400,
        max: 500,
        fill: '#881337',
        fillOpacity: 0.11,
        darkFillOpacity: 0.18,
        stroke: '#881337',
        darkStroke: '#FDA4AF',
        labelColor: '#7A121C',
        darkLabelColor: '#FDA4AF',
        swatchClass: 'bg-[#881337]/25 border-[#881337]/70 dark:bg-[#FDA4AF]/25 dark:border-[#FDA4AF]/70',
      },
    ];
  }

  return [
    {
      id: 'good',
      label: 'Good',
      officialName: 'Good',
      rangeLabel: '0–50',
      min: 0,
      max: 50,
      fill: '#15803D',
      fillOpacity: 0.08,
      darkFillOpacity: 0.14,
      stroke: '#15803D',
      darkStroke: '#4ADE80',
      labelColor: '#156A3C',
      darkLabelColor: '#4ADE80',
      swatchClass: 'bg-[#15803D]/25 border-[#15803D]/70 dark:bg-[#4ADE80]/25 dark:border-[#4ADE80]/70',
    },
    {
      id: 'satisfactory',
      label: 'Moderate',
      officialName: 'Moderate',
      rangeLabel: '51–100',
      min: 50,
      max: 100,
      fill: '#65A30D',
      fillOpacity: 0.09,
      darkFillOpacity: 0.14,
      stroke: '#4D7C0F',
      darkStroke: '#A3E635',
      labelColor: '#3F6212',
      darkLabelColor: '#A3E635',
      swatchClass: 'bg-[#65A30D]/25 border-[#4D7C0F]/70 dark:bg-[#A3E635]/25 dark:border-[#A3E635]/70',
    },
    {
      id: 'moderate',
      label: 'Sensitive',
      officialName: 'Unhealthy for Sensitive Groups',
      rangeLabel: '101–150',
      min: 100,
      max: 150,
      fill: '#D97706',
      fillOpacity: 0.08,
      darkFillOpacity: 0.13,
      stroke: '#D97706',
      darkStroke: '#FBBF24',
      labelColor: '#9A4B06',
      darkLabelColor: '#FBBF24',
      swatchClass: 'bg-[#D97706]/25 border-[#D97706]/70 dark:bg-[#FBBF24]/25 dark:border-[#FBBF24]/70',
    },
    {
      id: 'poor',
      label: 'Unhealthy',
      officialName: 'Unhealthy',
      rangeLabel: '151–200',
      min: 150,
      max: 200,
      fill: '#EA580C',
      fillOpacity: 0.09,
      darkFillOpacity: 0.14,
      stroke: '#EA580C',
      darkStroke: '#FB923C',
      labelColor: '#B53D0A',
      darkLabelColor: '#FB923C',
      swatchClass: 'bg-[#EA580C]/25 border-[#EA580C]/70 dark:bg-[#FB923C]/25 dark:border-[#FB923C]/70',
    },
    {
      id: 'very_poor',
      label: 'Very Unhealthy',
      officialName: 'Very Unhealthy',
      rangeLabel: '201–300',
      min: 200,
      max: 300,
      fill: '#DC2626',
      fillOpacity: 0.09,
      darkFillOpacity: 0.14,
      stroke: '#DC2626',
      darkStroke: '#F87171',
      labelColor: '#A61B1B',
      darkLabelColor: '#F87171',
      swatchClass: 'bg-[#DC2626]/25 border-[#DC2626]/70 dark:bg-[#F87171]/25 dark:border-[#F87171]/70',
    },
    {
      id: 'severe',
      label: 'Hazardous',
      officialName: 'Hazardous',
      rangeLabel: '301–500',
      min: 300,
      max: 500,
      fill: '#881337',
      fillOpacity: 0.11,
      darkFillOpacity: 0.18,
      stroke: '#881337',
      darkStroke: '#FDA4AF',
      labelColor: '#7A121C',
      darkLabelColor: '#FDA4AF',
      swatchClass: 'bg-[#881337]/25 border-[#881337]/70 dark:bg-[#FDA4AF]/25 dark:border-[#FDA4AF]/70',
    },
  ];
}

export function getPm25CategoryBands(standard: AqiStandardId): AqiCategoryBand[] {
  if (standard === 'CPCB_IN') {
    return [
      { id: 'good', label: 'Good', officialName: 'Good', rangeLabel: '0–30', min: 0, max: 30, fill: '#15803D', fillOpacity: 0.08, darkFillOpacity: 0.14, stroke: '#15803D', darkStroke: '#4ADE80', labelColor: '#156A3C', darkLabelColor: '#4ADE80', swatchClass: 'bg-[#15803D]/25 border-[#15803D]/70 dark:bg-[#4ADE80]/25 dark:border-[#4ADE80]/70' },
      { id: 'satisfactory', label: 'Satisfactory', officialName: 'Satisfactory', rangeLabel: '31–60', min: 30, max: 60, fill: '#65A30D', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#4D7C0F', darkStroke: '#A3E635', labelColor: '#3F6212', darkLabelColor: '#A3E635', swatchClass: 'bg-[#65A30D]/25 border-[#4D7C0F]/70 dark:bg-[#A3E635]/25 dark:border-[#A3E635]/70' },
      { id: 'moderate', label: 'Moderate', officialName: 'Moderately Polluted', rangeLabel: '61–90', min: 60, max: 90, fill: '#D97706', fillOpacity: 0.08, darkFillOpacity: 0.13, stroke: '#D97706', darkStroke: '#FBBF24', labelColor: '#9A4B06', darkLabelColor: '#FBBF24', swatchClass: 'bg-[#D97706]/25 border-[#D97706]/70 dark:bg-[#FBBF24]/25 dark:border-[#FBBF24]/70' },
      { id: 'poor', label: 'Poor', officialName: 'Poor', rangeLabel: '91–120', min: 90, max: 120, fill: '#EA580C', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#EA580C', darkStroke: '#FB923C', labelColor: '#B53D0A', darkLabelColor: '#FB923C', swatchClass: 'bg-[#EA580C]/25 border-[#EA580C]/70 dark:bg-[#FB923C]/25 dark:border-[#FB923C]/70' },
      { id: 'very_poor', label: 'Very Poor', officialName: 'Very Poor', rangeLabel: '121–250', min: 120, max: 250, fill: '#DC2626', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#DC2626', darkStroke: '#F87171', labelColor: '#A61B1B', darkLabelColor: '#F87171', swatchClass: 'bg-[#DC2626]/25 border-[#DC2626]/70 dark:bg-[#F87171]/25 dark:border-[#F87171]/70' },
      { id: 'severe', label: 'Severe', officialName: 'Severe', rangeLabel: '251–500', min: 250, max: 500, fill: '#881337', fillOpacity: 0.11, darkFillOpacity: 0.18, stroke: '#881337', darkStroke: '#FDA4AF', labelColor: '#7A121C', darkLabelColor: '#FDA4AF', swatchClass: 'bg-[#881337]/25 border-[#881337]/70 dark:bg-[#FDA4AF]/25 dark:border-[#FDA4AF]/70' },
    ];
  }

  return [
    { id: 'good', label: 'Good', officialName: 'Good', rangeLabel: '0–9', min: 0, max: 9, fill: '#15803D', fillOpacity: 0.08, darkFillOpacity: 0.14, stroke: '#15803D', darkStroke: '#4ADE80', labelColor: '#156A3C', darkLabelColor: '#4ADE80', swatchClass: 'bg-[#15803D]/25 border-[#15803D]/70 dark:bg-[#4ADE80]/25 dark:border-[#4ADE80]/70' },
    { id: 'satisfactory', label: 'Moderate', officialName: 'Moderate', rangeLabel: '9.1–35.4', min: 9, max: 35.4, fill: '#65A30D', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#4D7C0F', darkStroke: '#A3E635', labelColor: '#3F6212', darkLabelColor: '#A3E635', swatchClass: 'bg-[#65A30D]/25 border-[#4D7C0F]/70 dark:bg-[#A3E635]/25 dark:border-[#A3E635]/70' },
    { id: 'moderate', label: 'Sensitive', officialName: 'Unhealthy for Sensitive Groups', rangeLabel: '35.5–55.4', min: 35.4, max: 55.4, fill: '#D97706', fillOpacity: 0.08, darkFillOpacity: 0.13, stroke: '#D97706', darkStroke: '#FBBF24', labelColor: '#9A4B06', darkLabelColor: '#FBBF24', swatchClass: 'bg-[#D97706]/25 border-[#D97706]/70 dark:bg-[#FBBF24]/25 dark:border-[#FBBF24]/70' },
    { id: 'poor', label: 'Unhealthy', officialName: 'Unhealthy', rangeLabel: '55.5–125.4', min: 55.4, max: 125.4, fill: '#EA580C', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#EA580C', darkStroke: '#FB923C', labelColor: '#B53D0A', darkLabelColor: '#FB923C', swatchClass: 'bg-[#EA580C]/25 border-[#EA580C]/70 dark:bg-[#FB923C]/25 dark:border-[#FB923C]/70' },
    { id: 'very_poor', label: 'Very Unhealthy', officialName: 'Very Unhealthy', rangeLabel: '125.5–225.4', min: 125.4, max: 225.4, fill: '#DC2626', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#DC2626', darkStroke: '#F87171', labelColor: '#A61B1B', darkLabelColor: '#F87171', swatchClass: 'bg-[#DC2626]/25 border-[#DC2626]/70 dark:bg-[#F87171]/25 dark:border-[#F87171]/70' },
    { id: 'severe', label: 'Hazardous', officialName: 'Hazardous', rangeLabel: '225.5–500', min: 225.4, max: 500, fill: '#881337', fillOpacity: 0.11, darkFillOpacity: 0.18, stroke: '#881337', darkStroke: '#FDA4AF', labelColor: '#7A121C', darkLabelColor: '#FDA4AF', swatchClass: 'bg-[#881337]/25 border-[#881337]/70 dark:bg-[#FDA4AF]/25 dark:border-[#FDA4AF]/70' },
  ];
}

export function getPm10CategoryBands(standard: AqiStandardId): AqiCategoryBand[] {
  if (standard === 'CPCB_IN') {
    return [
      { id: 'good', label: 'Good', officialName: 'Good', rangeLabel: '0–50', min: 0, max: 50, fill: '#15803D', fillOpacity: 0.08, darkFillOpacity: 0.14, stroke: '#15803D', darkStroke: '#4ADE80', labelColor: '#156A3C', darkLabelColor: '#4ADE80', swatchClass: 'bg-[#15803D]/25 border-[#15803D]/70 dark:bg-[#4ADE80]/25 dark:border-[#4ADE80]/70' },
      { id: 'satisfactory', label: 'Satisfactory', officialName: 'Satisfactory', rangeLabel: '51–100', min: 50, max: 100, fill: '#65A30D', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#4D7C0F', darkStroke: '#A3E635', labelColor: '#3F6212', darkLabelColor: '#A3E635', swatchClass: 'bg-[#65A30D]/25 border-[#4D7C0F]/70 dark:bg-[#A3E635]/25 dark:border-[#A3E635]/70' },
      { id: 'moderate', label: 'Moderate', officialName: 'Moderately Polluted', rangeLabel: '101–250', min: 100, max: 250, fill: '#D97706', fillOpacity: 0.08, darkFillOpacity: 0.13, stroke: '#D97706', darkStroke: '#FBBF24', labelColor: '#9A4B06', darkLabelColor: '#FBBF24', swatchClass: 'bg-[#D97706]/25 border-[#D97706]/70 dark:bg-[#FBBF24]/25 dark:border-[#FBBF24]/70' },
      { id: 'poor', label: 'Poor', officialName: 'Poor', rangeLabel: '251–350', min: 250, max: 350, fill: '#EA580C', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#EA580C', darkStroke: '#FB923C', labelColor: '#B53D0A', darkLabelColor: '#FB923C', swatchClass: 'bg-[#EA580C]/25 border-[#EA580C]/70 dark:bg-[#FB923C]/25 dark:border-[#FB923C]/70' },
      { id: 'very_poor', label: 'Very Poor', officialName: 'Very Poor', rangeLabel: '351–430', min: 350, max: 430, fill: '#DC2626', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#DC2626', darkStroke: '#F87171', labelColor: '#A61B1B', darkLabelColor: '#F87171', swatchClass: 'bg-[#DC2626]/25 border-[#DC2626]/70 dark:bg-[#F87171]/25 dark:border-[#F87171]/70' },
      { id: 'severe', label: 'Severe', officialName: 'Severe', rangeLabel: '431–600', min: 430, max: 600, fill: '#881337', fillOpacity: 0.11, darkFillOpacity: 0.18, stroke: '#881337', darkStroke: '#FDA4AF', labelColor: '#7A121C', darkLabelColor: '#FDA4AF', swatchClass: 'bg-[#881337]/25 border-[#881337]/70 dark:bg-[#FDA4AF]/25 dark:border-[#FDA4AF]/70' },
    ];
  }

  return [
    { id: 'good', label: 'Good', officialName: 'Good', rangeLabel: '0–54', min: 0, max: 54, fill: '#15803D', fillOpacity: 0.08, darkFillOpacity: 0.14, stroke: '#15803D', darkStroke: '#4ADE80', labelColor: '#156A3C', darkLabelColor: '#4ADE80', swatchClass: 'bg-[#15803D]/25 border-[#15803D]/70 dark:bg-[#4ADE80]/25 dark:border-[#4ADE80]/70' },
    { id: 'satisfactory', label: 'Moderate', officialName: 'Moderate', rangeLabel: '55–154', min: 54, max: 154, fill: '#65A30D', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#4D7C0F', darkStroke: '#A3E635', labelColor: '#3F6212', darkLabelColor: '#A3E635', swatchClass: 'bg-[#65A30D]/25 border-[#4D7C0F]/70 dark:bg-[#A3E635]/25 dark:border-[#A3E635]/70' },
    { id: 'moderate', label: 'Sensitive', officialName: 'Unhealthy for Sensitive Groups', rangeLabel: '155–254', min: 154, max: 254, fill: '#D97706', fillOpacity: 0.08, darkFillOpacity: 0.13, stroke: '#D97706', darkStroke: '#FBBF24', labelColor: '#9A4B06', darkLabelColor: '#FBBF24', swatchClass: 'bg-[#D97706]/25 border-[#D97706]/70 dark:bg-[#FBBF24]/25 dark:border-[#FBBF24]/70' },
    { id: 'poor', label: 'Unhealthy', officialName: 'Unhealthy', rangeLabel: '255–354', min: 254, max: 354, fill: '#EA580C', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#EA580C', darkStroke: '#FB923C', labelColor: '#B53D0A', darkLabelColor: '#FB923C', swatchClass: 'bg-[#EA580C]/25 border-[#EA580C]/70 dark:bg-[#FB923C]/25 dark:border-[#FB923C]/70' },
    { id: 'very_poor', label: 'Very Unhealthy', officialName: 'Very Unhealthy', rangeLabel: '355–424', min: 354, max: 424, fill: '#DC2626', fillOpacity: 0.09, darkFillOpacity: 0.14, stroke: '#DC2626', darkStroke: '#F87171', labelColor: '#A61B1B', darkLabelColor: '#F87171', swatchClass: 'bg-[#DC2626]/25 border-[#DC2626]/70 dark:bg-[#F87171]/25 dark:border-[#F87171]/70' },
    { id: 'severe', label: 'Hazardous', officialName: 'Hazardous', rangeLabel: '425–604', min: 424, max: 604, fill: '#881337', fillOpacity: 0.11, darkFillOpacity: 0.18, stroke: '#881337', darkStroke: '#FDA4AF', labelColor: '#7A121C', darkLabelColor: '#FDA4AF', swatchClass: 'bg-[#881337]/25 border-[#881337]/70 dark:bg-[#FDA4AF]/25 dark:border-[#FDA4AF]/70' },
  ];
}

export function computeTrendYAxisScale(
  maxObserved: number | null,
  bands: AqiCategoryBand[],
  minFloor: number,
): TrendYAxisScale {
  const highestBandMax = bands[bands.length - 1]?.max ?? 500;
  const target = Math.max(minFloor, (maxObserved ?? 0) + Math.max(10, Math.round((maxObserved ?? 0) * 0.05)));
  const ceilingBand = bands.find((b) => b.max >= target) ?? bands[bands.length - 1];
  const max = ceilingBand ? ceilingBand.max : highestBandMax;
  const visibleBands = bands.filter((b) => b.min < max);
  const ticks = [0, ...visibleBands.map((b) => b.max)];
  return { max, ticks, visibleBands };
}

export interface EnrichedDailyTrendPoint extends DailyAqiPoint {
  formattedDate: string;
  category: string;
  barColor: string;
  textColor: string;
  primaryPollutantCode: keyof PollutantReadings | null;
  primaryPollutantFormula: string;
  primaryPollutantName: string;
  primaryPollutantConcentration: number | null;
  primaryPollutantUnit: string;
}

export function formatTrendTooltipDate(isoDate: string, fallbackLabel: string): string {
  const dt = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(dt.getTime())) return fallbackLabel;
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  });
}

export interface SevenDayTrendAnalysis {
  points: EnrichedDailyTrendPoint[];
  sevenDayAvgAqi: number | null;
  sevenDayAvgPm25: number | null;
  sevenDayAvgPm10: number | null;
  peakDay: { label: string; maxAqi: number; date: string } | null;
  cleanestDay: { label: string; avgAqi: number; date: string } | null;
  peakPm25Day: { label: string; value: number; date: string } | null;
  cleanestPm25Day: { label: string; value: number; date: string } | null;
  elevatedPm25DaysCount: number;
  pm25Threshold: number;
  peakPm10Day: { label: string; value: number; date: string } | null;
  cleanestPm10Day: { label: string; value: number; date: string } | null;
  elevatedPm10DaysCount: number;
  pm10Threshold: number;
  pm25ToPm10Ratio: number | null;
  trendDirection: 'worsening' | 'improving' | 'stable' | 'insufficient';
  trendDelta: number | null;
  thresholdAqi: number;
  thresholdLabel: string;
  elevatedDaysCount: number;
  patternInsight: string;
}

export function analyzeSevenDayTrends(
  daily7d: DailyAqiPoint[],
  standard: AqiStandardId,
): SevenDayTrendAnalysis {
  const thresholdAqi = standard === 'CPCB_IN' ? 200 : 150;
  const thresholdLabel = standard === 'CPCB_IN' ? 'CPCB Poor Threshold (200)' : 'US EPA Unhealthy Threshold (150)';
  const pm25Threshold = standard === 'CPCB_IN' ? 60 : 35.4;
  const pm10Threshold = standard === 'CPCB_IN' ? 100 : 154;

  const points: EnrichedDailyTrendPoint[] = daily7d.map((d) => {
    const formattedDate = formatTrendTooltipDate(d.date, d.label);
    const dailyPollutants: PollutantReadings = {
      pm25: d.avgPm25 ?? null,
      pm10: d.avgPm10 ?? null,
      no2: d.avgNo2 ?? null,
      so2: null,
      co: null,
      o3: d.avgO3 ?? null,
    };
    const dailyComputation = computeAqiFromPollutants(dailyPollutants, standard);
    const primaryCode = dailyComputation.primaryPollutantCode;
    const primaryMeta = primaryCode ? POLLUTANT_LABELS[primaryCode] : null;
    const primaryConcentration = primaryCode ? dailyPollutants[primaryCode] : null;

    if (d.avgAqi === null) {
      return {
        ...d,
        formattedDate,
        category: 'Unavailable',
        barColor: '#94A3B8',
        textColor: 'text-[#5E726A]',
        primaryPollutantCode: primaryCode,
        primaryPollutantFormula: primaryMeta?.formula ?? 'Unavailable',
        primaryPollutantName: primaryMeta?.name ?? 'No pollutant reading',
        primaryPollutantConcentration: primaryConcentration,
        primaryPollutantUnit: primaryMeta?.unit ?? 'µg/m³',
      };
    }
    const cat = categorizeAqi(d.avgAqi, standard);
    const vis = getSeverityVisuals(cat.severityTier);
    return {
      ...d,
      formattedDate,
      category: cat.category,
      barColor: vis.barColor,
      textColor: vis.textColor,
      primaryPollutantCode: primaryCode,
      primaryPollutantFormula: primaryMeta?.formula ?? 'Unavailable',
      primaryPollutantName: primaryMeta?.name ?? 'No pollutant reading',
      primaryPollutantConcentration: primaryConcentration,
      primaryPollutantUnit: primaryMeta?.unit ?? 'µg/m³',
    };
  });

  const valid = points.filter((p) => p.avgAqi !== null) as Array<EnrichedDailyTrendPoint & { avgAqi: number }>;
  if (valid.length === 0) {
    return {
      points,
      sevenDayAvgAqi: null,
      sevenDayAvgPm25: null,
      sevenDayAvgPm10: null,
      peakDay: null,
      cleanestDay: null,
      peakPm25Day: null,
      cleanestPm25Day: null,
      elevatedPm25DaysCount: 0,
      pm25Threshold,
      peakPm10Day: null,
      cleanestPm10Day: null,
      elevatedPm10DaysCount: 0,
      pm10Threshold,
      pm25ToPm10Ratio: null,
      trendDirection: 'insufficient',
      trendDelta: null,
      thresholdAqi,
      thresholdLabel,
      elevatedDaysCount: 0,
      patternInsight: '7-day historical air quality observations are currently unavailable for this location.',
    };
  }

  const sevenDayAvgAqi = Math.round(valid.reduce((acc, p) => acc + p.avgAqi, 0) / valid.length);

  const validPm25 = valid.filter((p) => p.avgPm25 !== null) as Array<EnrichedDailyTrendPoint & { avgPm25: number }>;
  const sevenDayAvgPm25 =
    validPm25.length > 0
      ? Number((validPm25.reduce((acc, p) => acc + p.avgPm25, 0) / validPm25.length).toFixed(1))
      : null;

  const validPm10 = valid.filter((p) => typeof p.avgPm10 === 'number') as Array<EnrichedDailyTrendPoint & { avgPm10: number }>;
  const sevenDayAvgPm10 =
    validPm10.length > 0
      ? Number((validPm10.reduce((acc, p) => acc + p.avgPm10, 0) / validPm10.length).toFixed(1))
      : null;

  const validPeak = valid.filter((p) => p.maxAqi !== null) as Array<EnrichedDailyTrendPoint & { maxAqi: number }>;
  const peakCandidate =
    validPeak.length > 0 ? [...validPeak].sort((a, b) => b.maxAqi - a.maxAqi)[0] : null;
  const peakDay = peakCandidate
    ? { label: peakCandidate.label, maxAqi: peakCandidate.maxAqi, date: peakCandidate.date }
    : null;

  const cleanestCandidate = [...valid].sort((a, b) => a.avgAqi - b.avgAqi)[0];
  const cleanestDay = {
    label: cleanestCandidate.label,
    avgAqi: cleanestCandidate.avgAqi,
    date: cleanestCandidate.date,
  };

  const elevatedDaysCount = valid.filter((p) => p.avgAqi > thresholdAqi).length;

  let trendDirection: SevenDayTrendAnalysis['trendDirection'] = 'insufficient';
  let trendDelta: number | null = null;

  if (valid.length >= 4) {
    const split = Math.floor(valid.length / 2);
    const earlier = valid.slice(0, split);
    const recent = valid.slice(split);
    const earlierAvg = earlier.reduce((s, p) => s + p.avgAqi, 0) / earlier.length;
    const recentAvg = recent.reduce((s, p) => s + p.avgAqi, 0) / recent.length;
    trendDelta = Math.round(recentAvg - earlierAvg);
    if (trendDelta >= 12) {
      trendDirection = 'worsening';
    } else if (trendDelta <= -12) {
      trendDirection = 'improving';
    } else {
      trendDirection = 'stable';
    }
  }

  let patternInsight = `Across the last ${valid.length} days, average AQI was ${sevenDayAvgAqi}`;
  if (elevatedDaysCount > 0) {
    patternInsight += ` with ${elevatedDaysCount} of ${valid.length} days exceeding the ${thresholdLabel}.`;
  } else {
    patternInsight += `, remaining below the ${thresholdLabel} every day.`;
  }

  if (trendDirection === 'worsening' && trendDelta !== null) {
    patternInsight += ` Pollution has intensified by +${trendDelta} AQI points in the second half of the week—keep indoor filtration ready.`;
  } else if (trendDirection === 'improving' && trendDelta !== null) {
    patternInsight += ` Conditions improved by ${Math.abs(trendDelta)} AQI points over recent days, signaling stronger atmospheric dispersion.`;
  } else if (trendDirection === 'stable') {
    patternInsight += ` Pollution levels have held relatively steady across the week.`;
  }

  const peakPm25Candidate =
    validPm25.length > 0 ? [...validPm25].sort((a, b) => b.avgPm25 - a.avgPm25)[0] : null;
  const cleanestPm25Candidate =
    validPm25.length > 0 ? [...validPm25].sort((a, b) => a.avgPm25 - b.avgPm25)[0] : null;
  const elevatedPm25DaysCount = validPm25.filter((p) => p.avgPm25 > pm25Threshold).length;

  const peakPm10Candidate =
    validPm10.length > 0 ? [...validPm10].sort((a, b) => b.avgPm10 - a.avgPm10)[0] : null;
  const cleanestPm10Candidate =
    validPm10.length > 0 ? [...validPm10].sort((a, b) => a.avgPm10 - b.avgPm10)[0] : null;
  const elevatedPm10DaysCount = validPm10.filter((p) => p.avgPm10 > pm10Threshold).length;

  const pm25ToPm10Ratio =
    sevenDayAvgPm25 !== null && sevenDayAvgPm10 !== null && sevenDayAvgPm10 > 0
      ? Number((sevenDayAvgPm25 / sevenDayAvgPm10).toFixed(2))
      : null;

  return {
    points,
    sevenDayAvgAqi,
    sevenDayAvgPm25,
    sevenDayAvgPm10,
    peakDay,
    cleanestDay,
    peakPm25Day: peakPm25Candidate
      ? { label: peakPm25Candidate.label, value: peakPm25Candidate.avgPm25, date: peakPm25Candidate.date }
      : null,
    cleanestPm25Day: cleanestPm25Candidate
      ? { label: cleanestPm25Candidate.label, value: cleanestPm25Candidate.avgPm25, date: cleanestPm25Candidate.date }
      : null,
    elevatedPm25DaysCount,
    pm25Threshold,
    peakPm10Day: peakPm10Candidate
      ? { label: peakPm10Candidate.label, value: peakPm10Candidate.avgPm10, date: peakPm10Candidate.date }
      : null,
    cleanestPm10Day: cleanestPm10Candidate
      ? { label: cleanestPm10Candidate.label, value: cleanestPm10Candidate.avgPm10, date: cleanestPm10Candidate.date }
      : null,
    elevatedPm10DaysCount,
    pm10Threshold,
    pm25ToPm10Ratio,
    trendDirection,
    trendDelta,
    thresholdAqi,
    thresholdLabel,
    elevatedDaysCount,
    patternInsight,
  };
}
