import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { memo } from "react";

import { PR_NODE_WIDTH } from "#/lib/stack";
import type { TrunkNodeData } from "#/lib/stack";

/**
 * The bedrock slab each stack rises from: the base branch (usually main), hatched to read as ground
 * rather than another PR.
 */
export const TrunkNode = memo(function TrunkNode({
  data,
}: NodeProps<Node<TrunkNodeData, "trunk">>) {
  return (
    <div
      className="rounded-md border border-strata/40 px-3 py-2"
      style={{
        width: PR_NODE_WIDTH,
        background:
          "repeating-linear-gradient(-45deg, transparent 0 6px, color-mix(in oklch, var(--strata) 14%, transparent) 6px 8px)",
      }}
    >
      <Handle
        type="source"
        position={Position.Right}
        className="!size-0 !min-h-0 !min-w-0 !border-0 !bg-transparent"
      />
      <div className="flex items-baseline justify-between font-mono text-xs">
        <span className="font-semibold text-strata">{data.branch}</span>
        <span className="text-muted-foreground">
          {data.stackSize} {data.stackSize === 1 ? "PR" : "PRs"}
        </span>
      </div>
    </div>
  );
});
