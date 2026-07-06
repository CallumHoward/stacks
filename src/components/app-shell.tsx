import { ThemeProvider } from "#/components/theme/theme-provider";
import { ThemeToggle } from "#/components/theme/theme-toggle";
import type { Theme } from "#/lib/theme";

/**
 * The in-body application shell: provides theme context and the global header with the theme
 * toggle. Kept separate from the route's document shell so it can be unit-tested without a
 * router/SSR context.
 */
export function AppShell({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return (
    <ThemeProvider initialTheme={theme}>
      <header className="flex h-14 w-full items-center justify-between border-b px-4">
        <span className="font-mono text-sm font-semibold tracking-tight">
          stacks<span className="text-strata">/</span>
        </span>
        <ThemeToggle />
      </header>
      {children}
    </ThemeProvider>
  );
}
