import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { memo } from "react";

import { PR_NODE_WIDTH } from "#/lib/stack";
import type { CiStatus, PrNodeData } from "#/lib/stack";

const CI_LABEL: Record<CiStatus, string> = {
  passing: "Checks passing",
  failing: "Checks failing",
  pending: "Checks running",
  none: "No checks",
};

const CI_DOT_CLASS: Record<CiStatus, string> = {
  passing: "bg-ci-pass",
  failing: "bg-destructive",
  pending: "bg-ci-pending animate-pulse",
  none: "bg-muted-foreground/40",
};

const REVIEW_BADGE: Record<PrNodeData["pr"]["reviewDecision"], React.ReactNode> = {
  APPROVED: <span className="rounded-sm bg-ci-pass/15 px-1.5 py-0.5 text-ci-pass">approved</span>,
  CHANGES_REQUESTED: (
    <span className="rounded-sm bg-destructive/15 px-1.5 py-0.5 text-destructive">
      changes requested
    </span>
  ),
  REVIEW_REQUIRED: (
    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-muted-foreground">needs review</span>
  ),
  "": null,
};

function ReviewBadge({ pr }: { pr: PrNodeData["pr"] }) {
  if (pr.isDraft) {
    return <span className="rounded-sm bg-muted px-1.5 py-0.5 text-muted-foreground">draft</span>;
  }
  return REVIEW_BADGE[pr.reviewDecision];
}

/**
 * One stratum in a stack: a card whose left face deepens in colour the deeper it sits in the stack,
 * opening the PR on GitHub when clicked. Drafts get a dashed outline: still unset, not yet solid
 * ground for the PRs stacked on top.
 */
export const PrNode = memo(function PrNode({ data }: NodeProps<Node<PrNodeData, "pr">>) {
  const { pr, ci, depth, mine } = data;

  return (
    <a
      href={pr.url}
      target="_blank"
      rel="noreferrer"
      className={`surface-elevated block rounded-lg bg-card text-card-foreground no-underline transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 ${mine ? "" : "opacity-60"}`}
      style={{
        width: PR_NODE_WIDTH,
        // Inline so it wins over surface-elevated's dark-mode border.
        ...(pr.isDraft && {
          border: "1.5px dashed color-mix(in oklch, var(--muted-foreground) 60%, transparent)",
          boxShadow: "none",
        }),
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!size-0 !min-h-0 !min-w-0 !border-0 !bg-transparent"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!size-0 !min-h-0 !min-w-0 !border-0 !bg-transparent"
      />

      <div className="flex gap-3 p-3">
        {/* Strata face: deeper colour the further the PR sits from the trunk. */}
        <div
          aria-hidden
          className="w-1 shrink-0 rounded-full"
          style={{ background: `oklch(${72 - depth * 5}% 0.11 45deg)` }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
              {pr.headRefName}
            </span>
            <span
              aria-hidden
              className={`size-2 shrink-0 rounded-full ${CI_DOT_CLASS[ci]}`}
              title={CI_LABEL[ci]}
            />
            <span className="sr-only">{CI_LABEL[ci]}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-snug font-medium">{pr.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>#{pr.number}</span>
            <span className="text-ci-pass">+{pr.additions}</span>
            <span className="text-destructive">−{pr.deletions}</span>
            <ReviewBadge pr={pr} />
            {mine ? null : <span className="truncate">@{pr.author.login}</span>}
          </div>
        </div>
      </div>
    </a>
  );
});
