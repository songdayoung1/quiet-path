import { useEffect, useState } from 'react';

export const THEME_CHANGE_EVENT = 'qp:theme-mode-changed';

export type ResolvedTheme = 'light' | 'dark';

export const readResolvedTheme = (): ResolvedTheme =>
  document.documentElement.dataset.qpTheme === 'dark' ? 'dark' : 'light';

export const useResolvedTheme = (): ResolvedTheme => {
  const [theme, setTheme] = useState<ResolvedTheme>(() => readResolvedTheme());

  useEffect(() => {
    const syncTheme = () => setTheme(readResolvedTheme());
    const onThemeChange = () => syncTheme();

    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange);
  }, []);

  return theme;
};

export const getThemePalette = (theme: ResolvedTheme) => {
  if (theme === 'dark') {
    return {
      strongText: '#E2E8F0',
      mutedText: '#9FB0C8',
      faintText: '#7386A3',
      cardBg: 'rgba(24,34,52,0.88)',
      cardBgStrong: 'rgba(24,34,52,0.96)',
      cardBgSoft: 'rgba(30,41,59,0.88)',
      cardBgMuted: 'rgba(30,41,59,0.76)',
      border: 'rgba(148,163,184,0.28)',
      divider: 'rgba(148,163,184,0.14)',
      pillBg: 'rgba(35,48,72,0.92)',
      pillBorder: 'rgba(148,163,184,0.24)',
      tabBg: 'rgba(30,41,59,0.92)',
      activeTabBg: 'rgba(255,255,255,0.08)',
      activeTabText: '#C4B5FD',
      shadow: '0 22px 44px rgba(2,6,23,0.42)',
      insetGlow: 'rgba(255,255,255,0.05)',
      emptyCell: 'rgba(30,41,59,0.84)',
      subtleCell: 'rgba(15,23,42,0.72)',
    };
  }

  return {
    strongText: '#475569',
    mutedText: '#64748B',
    faintText: '#94A3B8',
    cardBg: 'rgba(255,255,255,0.85)',
    cardBgStrong: 'rgba(255,255,255,0.92)',
    cardBgSoft: 'rgba(255,255,255,0.80)',
    cardBgMuted: 'rgba(255,255,255,0.70)',
    border: 'rgba(255,255,255,0.72)',
    divider: 'rgba(148,163,184,0.12)',
    pillBg: 'rgba(255,255,255,0.88)',
    pillBorder: 'rgba(255,255,255,0.78)',
    tabBg: 'rgba(255,255,255,0.70)',
    activeTabBg: '#FFFFFF',
    activeTabText: '#8B5CF6',
    shadow: '0 10px 24px rgba(15,23,42,0.06)',
    insetGlow: 'rgba(255,255,255,0.16)',
    emptyCell: 'rgba(241,245,249,0.72)',
    subtleCell: 'rgba(255,255,255,0.56)',
  };
};
