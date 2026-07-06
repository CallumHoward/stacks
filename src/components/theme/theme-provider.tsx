import { useCallback, useState } from "react";

import { ThemeContext } from "#/components/theme/theme-context";
import { applyTheme, type Theme } from "#/lib/theme";

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  }, []);

  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>;
}
