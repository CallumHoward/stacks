# stacks/

Visualises open stacked GitHub PRs as strata rising from their base branch, built on TanStack
Start + React Flow.

Each stack grows upward from a hatched trunk slab (the base branch). A PR sits on another when its
base branch is that PR's head branch. Cards show branch, title, CI verdict (dot), review state,
diff stats, and open the PR on GitHub when clicked.

## Usage

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Data comes from the local `gh` CLI, so `gh auth login` must have been run. The toolbar takes any
`owner/repo`; blank means the repo the dev server runs in. The repo is carried in the URL
(`?repo=owner/repo`) so views are bookmarkable. "Only my stacks" keeps stacks containing at least
one PR you authored. Data refreshes every 2 minutes, or on Refresh.
