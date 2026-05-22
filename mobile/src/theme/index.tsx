import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Platform } from 'react-native';

// ── Light Palette ──────────────────────────────────────────────────────────────
export const LightColors = {
  bg: '#F4F6FB',
  bgBase: '#F4F6FB',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F0F2F8',
  bgInput: '#F7F8FC',
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  primaryDark: '#5A52E0',
  teal: '#00B5AC',
  tealLight: '#00CEC9',
  tealDark: '#009E96',
  income: '#16A34A',
  incomeLight: '#DCFCE7',
  expense: '#DC2626',
  expenseLight: '#FEE2E2',
  danger: '#DC2626',
  success: '#16A34A',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
};

// ── Dark Palette ───────────────────────────────────────────────────────────────
export const DarkColors = {
  bg: '#0D0F1A',
  bgBase: '#0D0F1A',
  bgCard: '#161929',
  bgCardAlt: '#1C2035',
  bgInput: '#1A1D2E',
  primary: '#6C63FF',
  primaryLight: '#8B84FF',
  primaryDark: '#5A52E0',
  teal: '#00D2C8',
  tealLight: '#33DDD4',
  tealDark: '#00B5AC',
  income: '#22C55E',
  incomeLight: '#DCFCE7',
  expense: '#EF4444',
  expenseLight: '#FEE2E2',
  danger: '#EF4444',
  success: '#22C55E',
  textPrimary: '#F1F5F9',
  textSecondary: '#8892A4',
  textMuted: '#505A6E',
  border: '#232740',
  borderLight: '#2E3352',
};

export type ColorTheme = typeof DarkColors;

export const Fonts = {
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};

export const Radii = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
};

export const makeShadows = (isDark: boolean) => ({
  violet: {
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.4 : 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  teal: {
    shadowColor: '#00D2C8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: isDark ? '#000' : '#C0C8E0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
});

// ── Context ────────────────────────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorTheme;
  shadows: ReturnType<typeof makeShadows>;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  isDark: true,
  colors: DarkColors,
  shadows: makeShadows(true),
  setMode: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// ── Provider ───────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    // Load saved preference
    try {
      if (Platform.OS === 'web') {
        const saved = localStorage.getItem('themeMode') as ThemeMode | null;
        if (saved) setModeState(saved);
      }
    } catch {}
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      if (Platform.OS === 'web') localStorage.setItem('themeMode', newMode);
    } catch {}
  };

  const isDark = mode === 'system'
    ? systemScheme === 'dark'
    : mode === 'dark';

  const colors = isDark ? DarkColors : LightColors;
  const shadows = makeShadows(isDark);

  const toggleTheme = () => setMode(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, shadows, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ── Legacy static export (for backwards compat with existing screens) ──────────
export const Colors = DarkColors;
export const Shadows = makeShadows(true);
