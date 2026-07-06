import { createFileRoute, useRouter, useRouterState } from "@tanstack/react-router";
import { Background, BackgroundVariant, Controls, Panel, ReactFlow } from "@xyflow/react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { PrNode } from "#/components/flow/pr-node";
import { TrunkNode } from "#/components/flow/trunk-node";
import { useTheme } from "#/components/theme/theme-context";
import { getStackedPrsServerFn } from "#/lib/github";
import { buildStackLayout } from "#/lib/stack";

import "@xyflow/react/dist/style.css";

import type { StackedPrData } from "#/lib/stack";

interface StacksSearch {
  /** Repository as owner/repo; absent means the repo the dev server runs in. */
  repo?: string;
}

type LoaderResult = { data: StackedPrData; error?: never } | { data?: never; error: string };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): StacksSearch => ({
    repo: typeof search.repo === "string" && search.repo !== "" ? search.repo : undefined,
  }),

  loaderDeps: ({ search }) => ({ repo: search.repo ?? "" }),

  // Errors (bad repo, gh not authed) are data, not crashes: the toolbar must stay usable.
  loader: async ({ deps }): Promise<LoaderResult> => {
    try {
      return { data: await getStackedPrsServerFn({ data: { repo: deps.repo } }) };
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : String(cause) };
    }
  },

  component: App,
});

const nodeTypes = { pr: PrNode, trunk: TrunkNode };

const REFRESH_INTERVAL_MS = 120_000;

function subscribeToSchemeChange(onChange: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * React Flow's own colorMode="system" resolves on the server as light and hydration can't patch the
 * class, leaving light chrome on a dark page. Resolving it as client state avoids that.
 */
function useResolvedColorMode(theme: "light" | "dark" | "system"): "light" | "dark" {
  const systemDark = useSyncExternalStore(
    subscribeToSchemeChange,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
  if (theme === "system") return systemDark ? "dark" : "light";
  return theme;
}

interface ToolbarProps {
  initialRepo: string;
  mineOnly: boolean;
  onMineOnlyChange: (mineOnly: boolean) => void;
  loading: boolean;
  onRefresh: () => void;
  onLoadRepo: (repo: string) => void;
  summary: string | null;
  error: string | undefined;
}

function Toolbar({
  initialRepo,
  mineOnly,
  onMineOnlyChange,
  loading,
  onRefresh,
  onLoadRepo,
  summary,
  error,
}: ToolbarProps) {
  const [draft, setDraft] = useState(initialRepo);

  return (
    <div className="surface-elevated flex flex-col gap-2 rounded-lg bg-card p-3 text-card-foreground">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onLoadRepo(draft.trim());
        }}
        className="flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="owner/repo (blank = this repo)"
          aria-label="Repository"
          className="w-64 rounded-md border bg-background px-2 py-1.5 font-mono text-xs focus-visible:outline-2"
          spellCheck={false}
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Load
        </button>
      </form>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={mineOnly}
            onChange={(event) => onMineOnlyChange(event.target.checked)}
            aria-label="Only my stacks"
          />
          Only my stacks
        </label>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border px-2 py-1 hover:bg-accent"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {summary ? <p className="font-mono text-[11px] text-muted-foreground">{summary}</p> : null}
      {error ? (
        <p className="max-w-72 text-xs whitespace-pre-wrap text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Re-run the loader periodically so CI/review state stays current while the tab sits open. */
function useAutoRefresh(router: ReturnType<typeof useRouter>) {
  useEffect(() => {
    const timer = setInterval(() => void router.invalidate(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);
}

/** Derive everything the canvas needs from the loader result and the mine-only filter. */
// Thin glue over the tested buildStackLayout.
// fallow-ignore-next-line complexity
function useStackView(result: LoaderResult, mineOnly: boolean) {
  const layout = useMemo(
    () => (result.data ? buildStackLayout(result.data.prs, result.data.viewer, mineOnly) : null),
    [result.data, mineOnly],
  );

  const summary =
    result.data && layout
      ? `${result.data.repo} · ${plural(layout.stackCount, "stack")} · ${plural(layout.prCount, "PR")}`
      : null;

  // Remount the flow (re-running fitView) when the graph changes shape, not on every refresh.
  const graphKey = `${result.data?.repo ?? "error"}:${mineOnly}`;

  return { layout, summary, graphKey };
}

function EmptyNotice({ mineOnly, repo }: { mineOnly: boolean; repo: string | undefined }) {
  return (
    <Panel position="top-center" className="!top-1/2 -translate-y-1/2">
      <p className="text-sm text-muted-foreground">
        No open {mineOnly ? "stacks of yours" : "PRs"} in {repo}. Load another repository above.
      </p>
    </Panel>
  );
}

// Route composition; the logic it wires up is tested in lib/.
// fallow-ignore-next-line complexity
function App() {
  const { theme } = useTheme();
  const colorMode = useResolvedColorMode(theme);
  const router = useRouter();
  const { repo } = Route.useSearch();
  const result = Route.useLoaderData();
  const loading = useRouterState({ select: (state) => state.isLoading });
  const [mineOnly, setMineOnly] = useState(true);

  useAutoRefresh(router);
  const { layout, summary, graphKey } = useStackView(result, mineOnly);
  const isEmpty = layout !== null && layout.prCount === 0 && !loading;

  return (
    <main className="h-[calc(100dvh-3.5rem)] w-full">
      <ReactFlow
        key={graphKey}
        colorMode={colorMode}
        nodes={layout?.nodes ?? []}
        edges={layout?.edges ?? []}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ style: { stroke: "var(--strata)", strokeWidth: 1.5 } }}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.15}
        nodesDraggable={false}
        nodesConnectable={false}
        edgesFocusable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
        <Controls showInteractive={false} />

        <Panel position="top-left">
          <Toolbar
            initialRepo={repo ?? ""}
            mineOnly={mineOnly}
            onMineOnlyChange={setMineOnly}
            loading={loading}
            onRefresh={() => void router.invalidate()}
            onLoadRepo={(next) =>
              void router.navigate({ to: "/", search: next === "" ? {} : { repo: next } })
            }
            summary={summary}
            error={result.error}
          />
        </Panel>

        {isEmpty ? <EmptyNotice mineOnly={mineOnly} repo={result.data?.repo} /> : null}
      </ReactFlow>
    </main>
  );
}
