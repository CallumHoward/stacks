/** One raw status-check entry from `gh pr list --json statusCheckRollup`. */
export interface StatusCheck {
  status?: string;
  conclusion?: string;
  state?: string;
}

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  headRefName: string;
  baseRefName: string;
  isDraft: boolean;
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | "";
  additions: number;
  deletions: number;
  updatedAt: string;
  author: { login: string };
  statusCheckRollup: Array<StatusCheck> | null;
}

export type CiStatus = "passing" | "failing" | "pending" | "none";

export interface StackedPrData {
  repo: string;
  viewer: string;
  prs: Array<PullRequest>;
}

export interface PrNodeData extends Record<string, unknown> {
  pr: PullRequest;
  ci: CiStatus;
  /** 1-based position in the stack, counted from the trunk. */
  depth: number;
  mine: boolean;
}

export interface TrunkNodeData extends Record<string, unknown> {
  branch: string;
  stackSize: number;
}

export interface LayoutNode {
  id: string;
  type: "pr" | "trunk";
  position: { x: number; y: number };
  data: PrNodeData | TrunkNodeData;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
}

export interface StackLayout {
  nodes: Array<LayoutNode>;
  edges: Array<LayoutEdge>;
  stackCount: number;
  prCount: number;
}

/** Collapse GitHub's per-check rollup into one CI verdict for the node badge. */
export function ciStatus(rollup: PullRequest["statusCheckRollup"]): CiStatus {
  if (!rollup || rollup.length === 0) return "none";
  let pending = false;
  for (const check of rollup) {
    const outcome = check.conclusion ?? check.state ?? "";
    if (outcome === "FAILURE" || outcome === "ERROR" || outcome === "TIMED_OUT") return "failing";
    if (
      outcome === "" ||
      outcome === "PENDING" ||
      check.status === "IN_PROGRESS" ||
      check.status === "QUEUED"
    ) {
      pending = true;
    }
  }
  return pending ? "pending" : "passing";
}

export const PR_NODE_WIDTH = 280;

const LEVEL_WIDTH = 360;
const SLOT_HEIGHT = 132;
const STACK_GAP = 0.6;

/**
 * Build the react-flow graph: each stack grows rightward from its trunk slab (the base branch) at
 * x=0 — depth 1 sits directly on the trunk. A PR is stacked on another when its base branch is that
 * PR's head branch. Stacks are laid out top to bottom, largest first. With `mineOnly`, whole stacks
 * are kept or dropped by whether the viewer authored any PR in them.
 */
export function buildStackLayout(
  prs: Array<PullRequest>,
  viewer: string,
  mineOnly: boolean,
): StackLayout {
  const childrenOf = new Map<string, Array<PullRequest>>();
  const heads = new Set(prs.map((pr) => pr.headRefName));

  for (const pr of prs) {
    const siblings = childrenOf.get(pr.baseRefName) ?? [];
    siblings.push(pr);
    childrenOf.set(pr.baseRefName, siblings);
  }
  for (const siblings of childrenOf.values()) {
    siblings.sort((a, b) => a.number - b.number);
  }

  const roots = prs
    .filter((pr) => !heads.has(pr.baseRefName))
    .sort((a, b) => treeSize(b) - treeSize(a) || a.number - b.number);

  function treeSize(pr: PullRequest): number {
    const children = childrenOf.get(pr.headRefName) ?? [];
    return 1 + children.reduce((sum, child) => sum + treeSize(child), 0);
  }

  function treeHasViewer(pr: PullRequest): boolean {
    if (pr.author.login === viewer) return true;
    return (childrenOf.get(pr.headRefName) ?? []).some(treeHasViewer);
  }

  const nodes: Array<LayoutNode> = [];
  const edges: Array<LayoutEdge> = [];
  let cursor = 0;
  let stackCount = 0;
  let prCount = 0;

  // Tidy-tree pass: leaves claim consecutive y slots, parents center beside their children.
  function place(pr: PullRequest, depth: number): number {
    const children = childrenOf.get(pr.headRefName) ?? [];
    let y: number;
    if (children.length === 0) {
      y = cursor * SLOT_HEIGHT;
      cursor += 1;
    } else {
      const childYs = children.map((child) => place(child, depth + 1));
      y = (Math.min(...childYs) + Math.max(...childYs)) / 2;
    }
    nodes.push({
      id: pr.headRefName,
      type: "pr",
      position: { x: depth * LEVEL_WIDTH, y },
      data: { pr, ci: ciStatus(pr.statusCheckRollup), depth, mine: pr.author.login === viewer },
    });
    for (const child of children) {
      edges.push({
        id: `${pr.headRefName}->${child.headRefName}`,
        source: pr.headRefName,
        target: child.headRefName,
      });
    }
    prCount += 1;
    return y;
  }

  for (const root of roots) {
    if (mineOnly && !treeHasViewer(root)) continue;
    const trunkId = `trunk:${root.headRefName}`;
    const rootY = place(root, 1);
    nodes.push({
      id: trunkId,
      type: "trunk",
      // Nudged down so the slab's centre lines up with the taller root card's centre.
      position: { x: 0, y: rootY + 30 },
      data: { branch: root.baseRefName, stackSize: treeSize(root) },
    });
    edges.push({
      id: `${trunkId}->${root.headRefName}`,
      source: trunkId,
      target: root.headRefName,
    });
    cursor += STACK_GAP;
    stackCount += 1;
  }

  return { nodes, edges, stackCount, prCount };
}
