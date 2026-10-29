import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { THEMES, type Theme, type ThemeId } from './themes';

const ThemeContext = createContext<Theme>(THEMES.forest);

export function ThemeProvider({ themeId, children }: { themeId: ThemeId; children: ReactNode }) {
  const theme = useMemo(() => THEMES[themeId] ?? THEMES.forest, [themeId]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
