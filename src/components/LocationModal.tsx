import React, { useState } from 'react';
import { MapPin, Navigation, Search, Trash2, X, Check } from 'lucide-react';
import { api } from '../services/api';
import type { LocationInfo } from '../types/breathewise';

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  savedLocations: LocationInfo[];
  activeLocation: LocationInfo | null;
  onSelectLocation: (loc: LocationInfo) => Promise<void>;
  onDeleteLocation: (id: number) => Promise<void>;
}

const POPULAR_CITIES: LocationInfo[] = [
  { name: 'New Delhi', admin1: 'Delhi', country: 'India', countryCode: 'IN', latitude: 28.6139, longitude: 77.209 },
  { name: 'Gurugram', admin1: 'Haryana', country: 'India', countryCode: 'IN', latitude: 28.4595, longitude: 77.0266 },
  { name: 'Mumbai', admin1: 'Maharashtra', country: 'India', countryCode: 'IN', latitude: 19.076, longitude: 72.8777 },
  { name: 'Bengaluru', admin1: 'Karnataka', country: 'India', countryCode: 'IN', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Kolkata', admin1: 'West Bengal', country: 'India', countryCode: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'London', admin1: 'England', country: 'United Kingdom', countryCode: 'GB', latitude: 51.5072, longitude: -0.1276 },
];

export const LocationModal: React.FC<LocationModalProps> = ({
  open,
  onClose,
  savedLocations,
  activeLocation,
  onSelectLocation,
  onDeleteLocation,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) {
      setError('Enter at least 2 characters for a city, locality, or postal area.');
      return;
    }
    setError(null);
    setSearching(true);
    try {
      const res = await api.searchLocations(query.trim());
      setResults(res.results);
      if (res.results.length === 0) {
        setError('No matching locations found. Try a nearby major city name.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to search locations right now.');
    } finally {
      setSearching(false);
    }
  }

  function handleDetectLocation() {
    if (!navigator.geolocation) {
      setError('Browser geolocation is unavailable. Please search manually.');
      return;
    }
    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { location } = await api.reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          await onSelectLocation(location);
          onClose();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to resolve detected coordinates.');
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setError('Location permission declined. You can search or pick a city manually below.');
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#112A22]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div className="w-full max-w-xl rounded-xl border border-[#DCE3DE] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#E7ECE8] px-6 py-4">
          <div>
            <h2 id="location-modal-title" className="text-lg font-semibold text-[#13231D]">
              Select Monitoring Location
            </h2>
            <p className="text-xs text-[#546860]">
              AQI standards switch automatically (CPCB NAQI for India · US EPA 2024 globally).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close location modal"
            className="rounded-lg p-2 text-[#546860] hover:bg-[#F2F5F3] hover:text-[#13231D]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7E76]" />
              <label htmlFor="location-search-input" className="sr-only">
                Search city, locality, or postal code
              </label>
              <input
                id="location-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city, locality, or postal area (e.g., Noida, Pune, Tokyo)"
                className="w-full rounded-lg border border-[#D4DDD7] bg-[#FAFBFA] py-2.5 pl-9 pr-3 text-sm text-[#13231D] placeholder:text-[#7A8C85] focus:border-[#165B43] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="whitespace-nowrap shrink-0 rounded-lg bg-[#165B43] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#114835] disabled:opacity-60"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="flex items-center justify-between border-b border-[#EEF2EF] pb-4">
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locating}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D4DDD7] bg-white px-3.5 py-2 text-sm font-medium text-[#165B43] transition-colors hover:bg-[#F2F7F4] disabled:opacity-60"
            >
              <Navigation className="h-4 w-4" />
              <span>{locating ? 'Detecting location...' : 'Use approximate browser location'}</span>
            </button>
            <span className="text-xs text-[#6B7E76]">Privacy-safe · Never shared publicly</span>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-[#F2B5B5] bg-[#FDECEC] px-3.5 py-2.5 text-sm text-[#991B1B]">
              {error}
            </p>
          )}

          {results.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold text-[#546860]">Search Results</h3>
              <ul className="max-h-44 divide-y divide-[#EEF2EF] overflow-y-auto rounded-lg border border-[#E2E8E4]">
                {results.map((r, idx) => (
                  <li key={`${r.name}-${r.latitude}-${idx}`}>
                    <button
                      type="button"
                      onClick={async () => {
                        await onSelectLocation(r);
                        onClose();
                      }}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#F4F8F6]"
                    >
                      <span>
                        <span className="font-medium text-[#13231D]">{r.name}</span>
                        <span className="text-[#5E726A]">
                          {r.admin1 ? `, ${r.admin1}` : ''} · {r.country}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-[#6B7E76] tabular-nums">
                        {r.countryCode === 'IN' ? 'CPCB' : 'US EPA'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold text-[#546860]">Saved Locations</h3>
            <ul className="divide-y divide-[#EEF2EF] rounded-lg border border-[#E2E8E4]">
              {savedLocations.map((loc) => {
                const isActive =
                  activeLocation &&
                  Math.abs(activeLocation.latitude - loc.latitude) < 0.02 &&
                  Math.abs(activeLocation.longitude - loc.longitude) < 0.02;
                return (
                  <li key={loc.id ?? loc.name} className="flex items-center justify-between px-4 py-2.5">
                    <button
                      type="button"
                      onClick={async () => {
                        await onSelectLocation(loc);
                        onClose();
                      }}
                      className="flex flex-1 items-center gap-2.5 text-left text-sm"
                    >
                      <MapPin className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#165B43]' : 'text-[#7A8C85]'}`} />
                      <div>
                        <span className="font-medium text-[#13231D]">{loc.name}</span>
                        <span className="text-xs text-[#5E726A]">
                          {loc.admin1 ? `, ${loc.admin1}` : ''} · {loc.country} · {loc.countryCode === 'IN' ? 'CPCB NAQI' : 'US EPA'}
                        </span>
                      </div>
                      {isActive && <Check className="ml-2 h-4 w-4 text-[#165B43]" />}
                    </button>
                    {loc.id && savedLocations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteLocation(loc.id!)}
                        aria-label={`Remove ${loc.name}`}
                        className="rounded p-1.5 text-[#7A8C85] hover:bg-[#FDECEC] hover:text-[#B91C1C]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold text-[#546860]">Quick Select Cities</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_CITIES.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={async () => {
                    await onSelectLocation(city);
                    onClose();
                  }}
                  className="rounded-lg border border-[#DCE3DE] bg-[#F8FAF9] px-3 py-1.5 text-xs font-medium text-[#13231D] transition-colors hover:border-[#165B43] hover:bg-[#ECF5F0]"
                >
                  {city.name}, {city.countryCode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
