import { useCallback, useEffect, useState } from 'react';
import {
  parseStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme';

function readSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    return parseStoredTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function useTheme(): {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (next: ThemePreference) => void;
} {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(readInitialPreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(readSystemPrefersDark);

  const resolvedTheme = resolveTheme(themePreference, systemPrefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    setSystemPrefersDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = themePreference;
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, themePreference]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setThemePreferenceState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage quota / private mode failures
    }
  }, []);

  return { themePreference, resolvedTheme, setThemePreference };
}
