import { db } from '../db';
import {
  classifyDataFreshness,
  computeAqiFromPollutants,
  degreesToCompass,
  evaluateInversionRisk,
  getStandardLabel,
  selectStandardForCountry,
} from '../../src/lib/aqiStandards';
import {
  buildYearOverYearComparison,
  computeYearOverYearDateRanges,
  type DailyYoyObservation,
} from '../../src/lib/yearOverYear';
import type {
  AirQualityPayload,
  DailyAqiPoint,
  HourlyAqiPoint,
  LocationInfo,
  PollutantReadings,
  WeatherSnapshot,
  YearOverYearPayload,
} from '../../src/types/breathewise';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const YOY_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours for month-to-date YoY comparisons
const inFlightRequests = new Map<string, Promise<AirQualityPayload>>();
const inFlightYoyRequests = new Map<string, Promise<YearOverYearPayload>>();

const WMO_WEATHER_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog / Winter Haze',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Light snow',
  80: 'Rain showers',
  95: 'Thunderstorm',
};

function locationCacheKey(lat: number, lon: number, countryCode: string): string {
  return `${lat.toFixed(2)}_${lon.toFixed(2)}_${countryCode.toUpperCase()}`;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'BreatheWise-AI/1.0' },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchLocations(query: string): Promise<LocationInfo[]> {
  const cleaned = query.trim();
  if (cleaned.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleaned)}&count=8&language=en&format=json`;
  const data = await fetchJsonWithTimeout<{
    results?: Array<{
      name: string;
      admin1?: string;
      country: string;
      country_code: string;
      latitude: number;
      longitude: number;
    }>;
  }>(url, 6000);

  return (data.results ?? []).map((r) => ({
    name: r.name,
    admin1: r.admin1 ?? '',
    country: r.country,
    countryCode: (r.country_code || 'US').toUpperCase(),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

export async function reverseGeocodeApproximate(lat: number, lon: number): Promise<LocationInfo> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const data = await fetchJsonWithTimeout<{
      city?: string;
      locality?: string;
      principalSubdivision?: string;
      countryName?: string;
      countryCode?: string;
    }>(url, 5000);
    return {
      name: data.city || data.locality || `Coordinates ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      admin1: data.principalSubdivision || '',
      country: data.countryName || 'Unknown',
      countryCode: (data.countryCode || 'US').toUpperCase(),
      latitude: lat,
      longitude: lon,
    };
  } catch {
    return {
      name: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
      admin1: '',
      country: 'Detected Coordinates',
      countryCode: lat >= 6 && lat <= 37 && lon >= 68 && lon <= 98 ? 'IN' : 'US',
      latitude: lat,
      longitude: lon,
    };
  }
}

interface OpenMeteoAirResponse {
  timezone?: string;
  current?: {
    time: string;
    pm2_5: number | null;
    pm10: number | null;
    nitrogen_dioxide: number | null;
    sulphur_dioxide: number | null;
    carbon_monoxide: number | null;
    ozone: number | null;
  };
  hourly?: {
    time: string[];
    pm2_5: Array<number | null>;
    pm10: Array<number | null>;
    nitrogen_dioxide: Array<number | null>;
    sulphur_dioxide: Array<number | null>;
    carbon_monoxide: Array<number | null>;
    ozone: Array<number | null>;
  };
}

interface OpenMeteoWeatherResponse {
  current?: {
    time: string;
    temperature_2m: number | null;
    relative_humidity_2m: number | null;
    wind_speed_10m: number | null;
    wind_direction_10m: number | null;
    surface_pressure: number | null;
    weather_code: number | null;
  };
}

interface WttrResponse {
  current_condition?: Array<{
    temp_C?: string;
    humidity?: string;
    windspeedKmph?: string;
    winddirDegree?: string;
    winddir16Point?: string;
    pressure?: string;
    weatherDesc?: Array<{ value: string }>;
  }>;
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? Number(n.toFixed(1)) : null;
}

async function fetchLiveWeather(location: LocationInfo, fetchedAt: string): Promise<WeatherSnapshot> {
  const weatherUrl =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,surface_pressure,weather_code` +
    `&timezone=auto`;

  try {
    const weatherRes = await fetchJsonWithTimeout<OpenMeteoWeatherResponse>(weatherUrl, 7000);
    const w = weatherRes.current;
    const tempC = numOrNull(w?.temperature_2m);
    const humidityPct = numOrNull(w?.relative_humidity_2m);
    const windSpeedKmh = numOrNull(w?.wind_speed_10m);
    const windDeg = numOrNull(w?.wind_direction_10m);
    const inv = evaluateInversionRisk(tempC, humidityPct, windSpeedKmh);
    return {
      temperatureC: tempC,
      humidityPct,
      windSpeedKmh,
      windDirectionDeg: windDeg,
      windDirectionLabel: degreesToCompass(windDeg),
      surfacePressureHpa: numOrNull(w?.surface_pressure),
      weatherSummary: WMO_WEATHER_LABELS[w?.weather_code ?? -1] ?? 'Observed atmospheric conditions',
      inversionRisk: inv.risk,
      inversionReason: inv.reason,
      source: 'Open-Meteo Weather API',
      fetchedAt,
    };
  } catch {
    // Secondary live meteorological provider (wttr.in) if Open-Meteo weather rate-limits
    try {
      const wttrUrl = `https://wttr.in/${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}?format=j1`;
      const wttr = await fetchJsonWithTimeout<WttrResponse>(wttrUrl, 7000);
      const cur = wttr.current_condition?.[0];
      if (!cur) throw new Error('Empty wttr weather response');
      const tempC = numOrNull(cur.temp_C);
      const humidityPct = numOrNull(cur.humidity);
      const windSpeedKmh = numOrNull(cur.windspeedKmph);
      const windDeg = numOrNull(cur.winddirDegree);
      const inv = evaluateInversionRisk(tempC, humidityPct, windSpeedKmh);
      return {
        temperatureC: tempC,
        humidityPct,
        windSpeedKmh,
        windDirectionDeg: windDeg,
        windDirectionLabel: cur.winddir16Point || degreesToCompass(windDeg),
        surfacePressureHpa: numOrNull(cur.pressure),
        weatherSummary: cur.weatherDesc?.[0]?.value || 'Observed conditions',
        inversionRisk: inv.risk,
        inversionReason: inv.reason,
        source: 'wttr.in Meteorological Feed',
        fetchedAt,
      };
    } catch {
      return {
        temperatureC: null,
        humidityPct: null,
        windSpeedKmh: null,
        windDirectionDeg: null,
        windDirectionLabel: '—',
        surfacePressureHpa: null,
        weatherSummary: 'Meteorology temporarily rate-limited',
        inversionRisk: 'moderate',
        inversionReason: 'Live wind and temperature telemetry temporarily unavailable.',
        source: 'Weather API Unavailable',
        fetchedAt,
      };
    }
  }
}

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const weatherCache = new Map<string, { fetchedAtMs: number; snapshot: WeatherSnapshot }>();
const inFlightWeatherRequests = new Map<string, Promise<WeatherSnapshot>>();

export async function getLocalWeather(
  location: LocationInfo,
  forceRefresh = false,
): Promise<{ location: LocationInfo; weather: WeatherSnapshot; cached: boolean }> {
  const key = `wx_${locationCacheKey(location.latitude, location.longitude, location.countryCode)}`;
  if (!forceRefresh) {
    const cached = weatherCache.get(key);
    if (cached && Date.now() - cached.fetchedAtMs < WEATHER_CACHE_TTL_MS) {
      return { location, weather: cached.snapshot, cached: true };
    }
  }

  let pending = !forceRefresh ? inFlightWeatherRequests.get(key) : undefined;
  if (!pending) {
    const fetchedAt = new Date().toISOString();
    pending = fetchLiveWeather(location, fetchedAt)
      .then((snapshot) => {
        if (snapshot.temperatureC !== null || snapshot.humidityPct !== null) {
          weatherCache.set(key, { fetchedAtMs: Date.now(), snapshot });
        }
        return snapshot;
      })
      .finally(() => {
        inFlightWeatherRequests.delete(key);
      });
    inFlightWeatherRequests.set(key, pending);
  }

  const weather = await pending;
  return { location, weather, cached: false };
}

export async function getAirQualityAndWeather(location: LocationInfo, forceRefresh = false): Promise<AirQualityPayload> {
  const key = locationCacheKey(location.latitude, location.longitude, location.countryCode);

  if (!forceRefresh) {
    const cachedRow = db
      .prepare('SELECT fetched_at, payload_json FROM air_quality_records WHERE location_key = ?')
      .get(key) as { fetched_at: string; payload_json: string } | undefined;

    if (cachedRow) {
      const ageMs = Date.now() - new Date(cachedRow.fetched_at).getTime();
      if (ageMs < CACHE_TTL_MS) {
        const parsed = JSON.parse(cachedRow.payload_json) as AirQualityPayload;
        const hasExtendedDaily = parsed.daily7d.length === 0 || parsed.daily7d[0].avgPm10 !== undefined;
        if (hasExtendedDaily) {
          const freshness = classifyDataFreshness(cachedRow.fetched_at, true);
          return {
            ...parsed,
            location,
            dataQuality: freshness.quality,
            dataQualityNote: freshness.note,
          };
        }
      }
    }
  }

  // Single-flight deduplication: coalesce concurrent requests for the same location
  const existingInFlight = inFlightRequests.get(key);
  if (existingInFlight && !forceRefresh) {
    return existingInFlight;
  }

  const work = fetchAirQualityAndWeatherUncached(location, key).finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, work);
  return work;
}

async function fetchAirQualityAndWeatherUncached(location: LocationInfo, key: string): Promise<AirQualityPayload> {
  const standard = selectStandardForCountry(location.countryCode);

  const cachedRow = db
    .prepare('SELECT fetched_at, payload_json FROM air_quality_records WHERE location_key = ?')
    .get(key) as { fetched_at: string; payload_json: string } | undefined;

  const aqUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone` +
    `&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone` +
    `&past_days=6&forecast_days=2&timezone=auto`;

  try {
    const fetchedAt = new Date().toISOString();
    const [aqOutcome, weatherOutcome] = await Promise.allSettled([
      fetchJsonWithTimeout<OpenMeteoAirResponse>(aqUrl, 9000),
      fetchLiveWeather(location, fetchedAt),
    ]);

    if (aqOutcome.status !== 'fulfilled') {
      throw aqOutcome.reason;
    }

    const aqRes = aqOutcome.value;
    const weather: WeatherSnapshot =
      weatherOutcome.status === 'fulfilled'
        ? weatherOutcome.value
        : {
            temperatureC: null,
            humidityPct: null,
            windSpeedKmh: null,
            windDirectionDeg: null,
            windDirectionLabel: '—',
            surfacePressureHpa: null,
            weatherSummary: 'Unavailable',
            inversionRisk: 'moderate',
            inversionReason: 'Live meteorological feed unavailable.',
            source: 'Weather API Unavailable',
            fetchedAt,
          };

    const cur = aqRes.current;
    const pollutants: PollutantReadings = {
      pm25: numOrNull(cur?.pm2_5),
      pm10: numOrNull(cur?.pm10),
      no2: numOrNull(cur?.nitrogen_dioxide),
      so2: numOrNull(cur?.sulphur_dioxide),
      co: numOrNull(cur?.carbon_monoxide),
      o3: numOrNull(cur?.ozone),
    };

    const computed = computeAqiFromPollutants(pollutants, standard);

    const times = aqRes.hourly?.time ?? [];
    const nowTimeStr = cur?.time ?? new Date().toISOString().slice(0, 13) + ':00';
    let currentIdx = times.findIndex((t) => t === nowTimeStr);
    if (currentIdx === -1) {
      currentIdx = Math.max(0, times.length - 48);
    }

    const buildHourlyPoint = (idx: number): HourlyAqiPoint => {
      const p: PollutantReadings = {
        pm25: numOrNull(aqRes.hourly?.pm2_5[idx]),
        pm10: numOrNull(aqRes.hourly?.pm10[idx]),
        no2: numOrNull(aqRes.hourly?.nitrogen_dioxide[idx]),
        so2: numOrNull(aqRes.hourly?.sulphur_dioxide[idx]),
        co: numOrNull(aqRes.hourly?.carbon_monoxide[idx]),
        o3: numOrNull(aqRes.hourly?.ozone[idx]),
      };
      const c = computeAqiFromPollutants(p, standard);
      const ts = times[idx];
      return {
        timestamp: ts,
        label: ts.slice(11, 16),
        aqi: c.aqi,
        pm25: p.pm25,
        pm10: p.pm10,
        o3: p.o3,
        no2: p.no2,
      };
    };

    const hourly24h: HourlyAqiPoint[] = [];
    for (let i = Math.max(0, currentIdx - 23); i <= currentIdx && i < times.length; i++) {
      hourly24h.push(buildHourlyPoint(i));
    }

    const hourlyForecast24h: HourlyAqiPoint[] = [];
    for (let i = currentIdx; i < Math.min(times.length, currentIdx + 24); i++) {
      hourlyForecast24h.push(buildHourlyPoint(i));
    }

    const dayBuckets = new Map<
      string,
      { aqis: number[]; pm25s: number[]; pm10s: number[]; no2s: number[]; o3s: number[] }
    >();
    for (let i = 0; i <= currentIdx && i < times.length; i++) {
      const dateStr = times[i].slice(0, 10);
      const pt = buildHourlyPoint(i);
      const bucket = dayBuckets.get(dateStr) ?? { aqis: [], pm25s: [], pm10s: [], no2s: [], o3s: [] };
      if (pt.aqi !== null) bucket.aqis.push(pt.aqi);
      if (pt.pm25 !== null) bucket.pm25s.push(pt.pm25);
      if (pt.pm10 !== null) bucket.pm10s.push(pt.pm10);
      if (pt.no2 !== null) bucket.no2s.push(pt.no2);
      if (pt.o3 !== null) bucket.o3s.push(pt.o3);
      dayBuckets.set(dateStr, bucket);
    }

    const avgOrNull = (arr: number[]) =>
      arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

    const daily7d: DailyAqiPoint[] = Array.from(dayBuckets.entries())
      .slice(-7)
      .map(([date, bucket]) => {
        const dt = new Date(`${date}T12:00:00Z`);
        const label = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return {
          date,
          label,
          avgAqi: bucket.aqis.length ? Math.round(bucket.aqis.reduce((a, b) => a + b, 0) / bucket.aqis.length) : null,
          maxAqi: bucket.aqis.length ? Math.max(...bucket.aqis) : null,
          minAqi: bucket.aqis.length ? Math.min(...bucket.aqis) : null,
          avgPm25: avgOrNull(bucket.pm25s),
          avgPm10: avgOrNull(bucket.pm10s),
          avgNo2: avgOrNull(bucket.no2s),
          avgO3: avgOrNull(bucket.o3s),
        };
      });

    const freshness = classifyDataFreshness(fetchedAt, false);
    const payload: AirQualityPayload = {
      location,
      standard,
      standardLabel: getStandardLabel(standard),
      aqi: computed.aqi,
      category: computed.category,
      severityTier: computed.severityTier,
      primaryPollutant: computed.primaryPollutant,
      primaryPollutantCode: computed.primaryPollutantCode,
      pollutants,
      subIndices: computed.subIndices,
      plainLanguageSummary: computed.plainLanguageSummary,
      healthGuidanceGeneral: computed.healthGuidanceGeneral,
      healthGuidanceSensitive: computed.healthGuidanceSensitive,
      dataQuality: freshness.quality,
      dataQualityNote: freshness.note,
      sourceAttribution:
        standard === 'CPCB_IN'
          ? 'Open-Meteo CAMS Atmospheric Reanalysis + Official CPCB India NAQI Breakpoints'
          : 'Open-Meteo Atmospheric Air Quality API + Official US EPA 2024 Breakpoints',
      stationInfo: `Atmospheric Grid (${location.latitude.toFixed(3)}°N, ${location.longitude.toFixed(3)}°E · ${aqRes.timezone || 'Local Time'})`,
      fetchedAt,
      weather,
      hourly24h,
      hourlyForecast24h,
      daily7d,
    };

    db.prepare(`
      INSERT INTO air_quality_records (location_key, fetched_at, standard, aqi, category, primary_pollutant, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(location_key) DO UPDATE SET
        fetched_at = excluded.fetched_at,
        standard = excluded.standard,
        aqi = excluded.aqi,
        category = excluded.category,
        primary_pollutant = excluded.primary_pollutant,
        payload_json = excluded.payload_json
    `).run(key, fetchedAt, standard, payload.aqi, payload.category, payload.primaryPollutant, JSON.stringify(payload));

    return payload;
  } catch (err) {
    if (cachedRow) {
      const parsed = JSON.parse(cachedRow.payload_json) as AirQualityPayload;
      return {
        ...parsed,
        location,
        dataQuality: 'stale',
        dataQualityNote: `Live atmospheric feed temporarily unreachable (${err instanceof Error ? err.message : 'network error'}). Showing last verified reading from ${new Date(cachedRow.fetched_at).toLocaleString()}.`,
      };
    }

    const nowIso = new Date().toISOString();
    return {
      location,
      standard,
      standardLabel: getStandardLabel(standard),
      aqi: null,
      category: 'Unavailable',
      severityTier: 'moderate',
      primaryPollutant: 'Unavailable',
      primaryPollutantCode: null,
      pollutants: { pm25: null, pm10: null, no2: null, so2: null, co: null, o3: null },
      subIndices: {},
      plainLanguageSummary:
        'Live air quality measurements could not be retrieved from Open-Meteo at this moment. BreatheWise AI never fabricates live AQI readings.',
      healthGuidanceGeneral: 'Please retry shortly or verify conditions via your official national environmental portal (e.g., CPCB Sameer or AirNow).',
      healthGuidanceSensitive: 'If visible winter haze or smoke is present outdoors, sensitive family members should limit outdoor exertion until live data resumes.',
      dataQuality: 'unavailable',
      dataQualityNote: `Upstream environmental data unavailable (${err instanceof Error ? err.message : 'connection error'}).`,
      sourceAttribution: 'Open-Meteo Air Quality & Weather API (Currently Unreachable)',
      stationInfo: `Coordinates (${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)})`,
      fetchedAt: nowIso,
      weather: {
        temperatureC: null,
        humidityPct: null,
        windSpeedKmh: null,
        windDirectionDeg: null,
        windDirectionLabel: '—',
        surfacePressureHpa: null,
        weatherSummary: 'Unavailable',
        inversionRisk: 'moderate',
        inversionReason: 'Live meteorological feed unavailable.',
        source: 'Open-Meteo Weather API',
        fetchedAt: nowIso,
      },
      hourly24h: [],
      hourlyForecast24h: [],
      daily7d: [],
    };
  }
}

function aggregateHourlyToDailyYoy(
  aqRes: OpenMeteoAirResponse,
  standard: ReturnType<typeof selectStandardForCountry>,
): DailyYoyObservation[] {
  const times = aqRes.hourly?.time ?? [];
  const buckets = new Map<string, { aqis: number[]; pm25s: number[] }>();

  for (let i = 0; i < times.length; i++) {
    const dateStr = times[i].slice(0, 10);
    const p: PollutantReadings = {
      pm25: numOrNull(aqRes.hourly?.pm2_5?.[i]),
      pm10: numOrNull(aqRes.hourly?.pm10?.[i]),
      no2: numOrNull(aqRes.hourly?.nitrogen_dioxide?.[i]),
      so2: null,
      co: null,
      o3: numOrNull(aqRes.hourly?.ozone?.[i]),
    };
    const computed = computeAqiFromPollutants(p, standard);
    const bucket = buckets.get(dateStr) ?? { aqis: [], pm25s: [] };
    if (computed.aqi !== null) bucket.aqis.push(computed.aqi);
    if (p.pm25 !== null) bucket.pm25s.push(p.pm25);
    buckets.set(dateStr, bucket);
  }

  return Array.from(buckets.entries()).map(([date, b]) => ({
    date,
    avgAqi: b.aqis.length ? Math.round(b.aqis.reduce((a, c) => a + c, 0) / b.aqis.length) : null,
    avgPm25: b.pm25s.length ? Number((b.pm25s.reduce((a, c) => a + c, 0) / b.pm25s.length).toFixed(1)) : null,
  }));
}

export async function getYearOverYearAirQuality(
  location: LocationInfo,
  forceRefresh = false,
): Promise<YearOverYearPayload> {
  const ranges = computeYearOverYearDateRanges(new Date());
  const key = `yoy_${locationCacheKey(location.latitude, location.longitude, location.countryCode)}_${ranges.currentEnd}`;

  if (!forceRefresh) {
    const cachedRow = db
      .prepare('SELECT fetched_at, payload_json FROM air_quality_records WHERE location_key = ?')
      .get(key) as { fetched_at: string; payload_json: string } | undefined;

    if (cachedRow) {
      const ageMs = Date.now() - new Date(cachedRow.fetched_at).getTime();
      if (ageMs < YOY_CACHE_TTL_MS) {
        const parsed = JSON.parse(cachedRow.payload_json) as YearOverYearPayload;
        const freshness = classifyDataFreshness(cachedRow.fetched_at, true);
        return {
          ...parsed,
          location,
          dataQuality: freshness.quality,
          dataQualityNote: freshness.note,
        };
      }
    }
  }

  const existingInFlight = inFlightYoyRequests.get(key);
  if (existingInFlight && !forceRefresh) {
    return existingInFlight;
  }

  const work = fetchYearOverYearUncached(location, key, ranges).finally(() => {
    inFlightYoyRequests.delete(key);
  });
  inFlightYoyRequests.set(key, work);
  return work;
}

async function fetchYearOverYearUncached(
  location: LocationInfo,
  key: string,
  ranges: ReturnType<typeof computeYearOverYearDateRanges>,
): Promise<YearOverYearPayload> {
  const standard = selectStandardForCountry(location.countryCode);
  const cachedRow = db
    .prepare('SELECT fetched_at, payload_json FROM air_quality_records WHERE location_key = ?')
    .get(key) as { fetched_at: string; payload_json: string } | undefined;

  const baseUrl =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${location.latitude}&longitude=${location.longitude}` +
    `&hourly=pm2_5,pm10,nitrogen_dioxide,ozone&timezone=auto`;

  const currentUrl = `${baseUrl}&start_date=${ranges.currentStart}&end_date=${ranges.currentEnd}`;
  const previousUrl = `${baseUrl}&start_date=${ranges.previousStart}&end_date=${ranges.previousEnd}`;

  try {
    const fetchedAt = new Date().toISOString();
    const [currentRes, previousRes] = await Promise.all([
      fetchJsonWithTimeout<OpenMeteoAirResponse>(currentUrl, 10000),
      fetchJsonWithTimeout<OpenMeteoAirResponse>(previousUrl, 10000),
    ]);

    const currentDaily = aggregateHourlyToDailyYoy(currentRes, standard);
    const previousDaily = aggregateHourlyToDailyYoy(previousRes, standard);
    const comparison = buildYearOverYearComparison(currentDaily, previousDaily, ranges, standard);
    const freshness = classifyDataFreshness(fetchedAt, false);

    const payload: YearOverYearPayload = {
      location,
      standard,
      standardLabel: getStandardLabel(standard),
      monthName: ranges.monthName,
      monthShort: ranges.monthShort,
      currentYear: ranges.currentYear,
      previousYear: ranges.previousYear,
      ...comparison,
      dataQuality: freshness.quality,
      dataQualityNote: freshness.note,
      sourceAttribution:
        standard === 'CPCB_IN'
          ? 'Open-Meteo CAMS Historical Reanalysis + Official CPCB India NAQI Breakpoints'
          : 'Open-Meteo CAMS Historical Reanalysis + Official US EPA 2024 Breakpoints',
      fetchedAt,
    };

    db.prepare(`
      INSERT INTO air_quality_records (location_key, fetched_at, standard, aqi, category, primary_pollutant, payload_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(location_key) DO UPDATE SET
        fetched_at = excluded.fetched_at,
        standard = excluded.standard,
        aqi = excluded.aqi,
        category = excluded.category,
        primary_pollutant = excluded.primary_pollutant,
        payload_json = excluded.payload_json
    `).run(
      key,
      fetchedAt,
      standard,
      payload.currentMonthAvgAqi,
      payload.direction,
      'Year-over-Year',
      JSON.stringify(payload),
    );

    return payload;
  } catch (err) {
    if (cachedRow) {
      const parsed = JSON.parse(cachedRow.payload_json) as YearOverYearPayload;
      return {
        ...parsed,
        location,
        dataQuality: 'stale',
        dataQualityNote: `Historical YoY archive temporarily unreachable (${err instanceof Error ? err.message : 'network error'}). Showing cached comparison from ${new Date(cachedRow.fetched_at).toLocaleString()}.`,
      };
    }

    const nowIso = new Date().toISOString();
    return {
      location,
      standard,
      standardLabel: getStandardLabel(standard),
      monthName: ranges.monthName,
      monthShort: ranges.monthShort,
      currentYear: ranges.currentYear,
      previousYear: ranges.previousYear,
      daysCompared: ranges.daysCompared,
      currentMonthAvgAqi: null,
      previousMonthAvgAqi: null,
      avgAqiDelta: null,
      avgAqiPctChange: null,
      currentPeakAqi: null,
      previousPeakAqi: null,
      betterDaysCount: 0,
      worseDaysCount: 0,
      comparedDaysCount: 0,
      direction: 'insufficient',
      plainInsight: `Historical ${ranges.monthName} comparison data could not be retrieved right now. BreatheWise AI never fabricates historical AQI records.`,
      dailyPoints: [],
      weeklyBuckets: [],
      dataQuality: 'unavailable',
      dataQualityNote: `Upstream historical feed unavailable (${err instanceof Error ? err.message : 'connection error'}).`,
      sourceAttribution: 'Open-Meteo Historical Air Quality API (Currently Unreachable)',
      fetchedAt: nowIso,
    };
  }
}

