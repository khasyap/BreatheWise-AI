import React, { useEffect, useMemo, useState } from 'react';
import {
  CloudSun,
  Droplets,
  Gauge,
  RefreshCw,
  Thermometer,
  Wind,
} from 'lucide-react';
import { analyzeWeatherSmogInfluence } from '../lib/dashboardWidgets';
import { api } from '../services/api';
import type { LocationInfo, WeatherSnapshot } from '../types/breathewise';

interface LocalWeatherCardProps {
  location: LocationInfo | null;
  initialWeather: WeatherSnapshot | null;
  currentAqi: number | null;
}

function getTrappingAccent(level: 'High' | 'Moderate' | 'Low' | 'Unavailable') {
  switch (level) {
    case 'High':
      return {
        text: 'text-[#B53D0A] dark:text-[#FB923C]',
        border: 'border-l-[#C85A17] dark:border-l-[#FB923C]',
        surface: 'bg-[#FFF7F1] dark:bg-[#231912]',
      };
    case 'Moderate':
      return {
        text: 'text-[#9A6700] dark:text-[#FBBF24]',
        border: 'border-l-[#CA8A04] dark:border-l-[#FBBF24]',
        surface: 'bg-[#FEFBF2] dark:bg-[#211E11]',
      };
    case 'Low':
      return {
        text: 'text-[#165B43] dark:text-[#4ADE80]',
        border: 'border-l-[#165B43] dark:border-l-[#34D399]',
        surface: 'bg-[#F3F8F5] dark:bg-[#13261E]',
      };
    default:
      return {
        text: 'text-[#5E726A] dark:text-[#8EA89C]',
        border: 'border-l-[#94A89F] dark:border-l-[#4B6359]',
        surface: 'bg-[#F7F9F7] dark:bg-[#15241E]',
      };
  }
}

export const LocalWeatherCard: React.FC<LocalWeatherCardProps> = ({
  location,
  initialWeather,
  currentAqi,
}) => {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(initialWeather);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialWeather) {
      setWeather(initialWeather);
    }
  }, [initialWeather]);

  useEffect(() => {
    if (!location) return;
    let cancelled = false;

    async function fetchWeather() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getLocalWeather(
          {
            lat: location!.latitude,
            lon: location!.longitude,
            name: location!.name,
            countryCode: location!.countryCode,
          },
          false,
        );
        if (!cancelled) {
          setWeather(res.weather);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to fetch local weather.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchWeather();
    return () => {
      cancelled = true;
    };
  }, [location?.latitude, location?.longitude, location?.name, location?.countryCode]);

  async function handleManualRefresh() {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getLocalWeather(
        {
          lat: location.latitude,
          lon: location.longitude,
          name: location.name,
          countryCode: location.countryCode,
        },
        true,
      );
      setWeather(res.weather);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh local weather right now.');
    } finally {
      setLoading(false);
    }
  }

  const influence = useMemo(
    () => analyzeWeatherSmogInfluence(weather, currentAqi),
    [weather, currentAqi],
  );
  const accent = getTrappingAccent(influence.smogTrappingLevel);

  return (
    <div
      data-testid="local-weather-card"
      className="flex flex-col justify-between rounded-xl border border-[#DCE3DE] bg-white p-6 dark:border-[#22362E] dark:bg-[#111C17] lg:col-span-7"
    >
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EEF2EF] pb-4 dark:border-[#1E3129]">
          <div>
            <p className="text-xs font-medium text-[#546860] dark:text-[#8EA89C]">
              Local Weather &amp; Smog Dispersion · {location ? location.name : 'Active Location'}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#13231D] dark:text-[#EDF5F1]">
                <CloudSun className="h-4 w-4 text-[#165B43] dark:text-[#34D399]" />
                <span>{weather?.weatherSummary ?? 'Loading conditions'}</span>
              </h2>
              <span
                data-testid="weather-smog-risk"
                className={`text-xs font-semibold ${accent.text}`}
              >
                Smog Trapping Risk: {influence.smogTrappingLevel}
              </span>
            </div>
          </div>

          <button
            type="button"
            data-testid="refresh-weather-btn"
            onClick={handleManualRefresh}
            disabled={loading || !location}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#D4DDD7] bg-white px-3 py-1.5 text-xs font-medium text-[#13231D] transition-colors hover:border-[#165B43] hover:bg-[#F3F8F5] disabled:opacity-50 dark:border-[#283E35] dark:bg-[#15241E] dark:text-[#EDF5F1] dark:hover:border-[#34D399] dark:hover:bg-[#1A2E26]"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#546860] dark:text-[#8EA89C] ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Updating...' : 'Refresh Weather'}</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-[#F2B5B5] bg-[#FDECEC] px-3 py-2 text-xs text-[#991B1B] dark:border-[#6E252A] dark:bg-[#2B1517] dark:text-[#FCA5A5]">
            {error}
          </div>
        )}

        {/* Primary Meteorological Readings */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-[#F7F9F7] px-3.5 py-3 dark:bg-[#15241E]">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#5E726A] dark:text-[#8EA89C]">
              <Thermometer className="h-3.5 w-3.5 text-[#165B43] dark:text-[#34D399]" />
              Temperature
            </span>
            <p
              data-testid="weather-temp"
              className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-[#EDF5F1]"
            >
              {weather?.temperatureC !== null && weather?.temperatureC !== undefined
                ? `${weather.temperatureC}°C`
                : '—'}
            </p>
          </div>

          <div className="rounded-lg bg-[#F7F9F7] px-3.5 py-3 dark:bg-[#15241E]">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#5E726A] dark:text-[#8EA89C]">
              <Droplets className="h-3.5 w-3.5 text-[#2563EB] dark:text-[#60A5FA]" />
              Humidity
            </span>
            <p
              data-testid="weather-humidity"
              className="mt-1 font-mono text-xl font-semibold text-[#13231D] tabular-nums dark:text-[#EDF5F1]"
            >
              {weather?.humidityPct !== null && weather?.humidityPct !== undefined
                ? `${weather.humidityPct}%`
                : '—'}
            </p>
          </div>

          <div className="rounded-lg bg-[#F7F9F7] px-3.5 py-3 dark:bg-[#15241E]">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#5E726A] dark:text-[#8EA89C]">
              <Wind className="h-3.5 w-3.5 text-[#546860] dark:text-[#94B0A4]" />
              Wind
            </span>
            <p
              data-testid="weather-wind"
              className="mt-1 font-mono text-lg font-semibold text-[#13231D] tabular-nums dark:text-[#EDF5F1]"
            >
              {weather?.windSpeedKmh !== null && weather?.windSpeedKmh !== undefined
                ? `${weather.windSpeedKmh} km/h`
                : '—'}
              {weather?.windDirectionLabel && weather.windDirectionLabel !== 'Calm' ? (
                <span className="ml-1 text-xs font-medium text-[#5E726A] dark:text-[#8EA89C]">
                  {weather.windDirectionLabel}
                </span>
              ) : null}
            </p>
          </div>

          <div className="rounded-lg bg-[#F7F9F7] px-3.5 py-3 dark:bg-[#15241E]">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#5E726A] dark:text-[#8EA89C]">
              <Gauge className="h-3.5 w-3.5 text-[#546860] dark:text-[#94B0A4]" />
              Pressure
            </span>
            <p
              data-testid="weather-pressure"
              className="mt-1 font-mono text-lg font-semibold text-[#13231D] tabular-nums dark:text-[#EDF5F1]"
            >
              {weather?.surfacePressureHpa !== null && weather?.surfacePressureHpa !== undefined
                ? `${Math.round(weather.surfacePressureHpa)} hPa`
                : '—'}
            </p>
          </div>
        </div>

        {/* Winter Smog Behavior Breakdown */}
        <div className={`mt-4 rounded-lg border-l-4 px-4 py-3 ${accent.border} ${accent.surface}`}>
          <p className="text-xs font-semibold text-[#13231D] dark:text-[#EDF5F1]">
            How Current Weather Shapes Winter Smog
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#2D4039] dark:text-[#C5D8CF]">
            {influence.overallBehavior}
          </p>
          <dl className="mt-3 grid grid-cols-1 gap-2 border-t border-[#DCE3DE]/70 pt-2.5 text-xs dark:border-[#243830] sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-[#13231D] dark:text-[#EDF5F1]">Temperature</dt>
              <dd className="mt-0.5 leading-snug text-[#4A5D55] dark:text-[#9FB8AC]">
                {influence.temperatureNote}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[#13231D] dark:text-[#EDF5F1]">Humidity</dt>
              <dd className="mt-0.5 leading-snug text-[#4A5D55] dark:text-[#9FB8AC]">
                {influence.humidityNote}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-[#13231D] dark:text-[#EDF5F1]">Wind Mixing</dt>
              <dd className="mt-0.5 leading-snug text-[#4A5D55] dark:text-[#9FB8AC]">
                {influence.windNote}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Footer Source Attribution */}
      <p className="mt-4 border-t border-[#EEF2EF] pt-3 text-[11px] text-[#6B7E76] dark:border-[#1E3129] dark:text-[#7F9A8E]">
        Weather source: {weather?.source ?? 'Connecting...'} · Updated{' '}
        <span className="font-mono tabular-nums">
          {weather?.fetchedAt
            ? new Date(weather.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      </p>
    </div>
  );
};
