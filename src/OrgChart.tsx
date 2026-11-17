import {
  AimOutlined,
  ApartmentOutlined,
  ArrowsAltOutlined,
  BlockOutlined,
  DownOutlined,
  RightOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Spin, Tooltip, theme } from "antd";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  memo,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { EmptyState } from "./EmptyState";
import {
  buildOrgChart,
  computeNodeDepths,
  initialCollapsed,
  type OrgChartNodeInput,
} from "./orgChartLayout";

export type { OrgChartNodeInput } from "./orgChartLayout";

export interface OrgChartProps {
  /** Flat parent-linked node list. */
  nodes: OrgChartNodeInput[];
  /** Case-insensitive search query — matching nodes get a highlight ring. */
  search?: string;
  /** Invoked when the user clicks the "view profile" icon on a card.
   *  If omitted, the icon is hidden. */
  onNodeClick?: (id: string) => void;
  /** Loading state — shows a spinner. */
  loading?: boolean;
  /** Error state. Pass `true` for the default "failed to load" copy, an
   *  Error (the message is rendered as the description), or any ReactNode
   *  for a fully custom banner. */
  error?: boolean | Error | ReactNode;
  /** Custom empty-state content shown when `nodes` is empty. */
  emptyState?: ReactNode;
  /** Custom error-state content; overrides the default EmptyState render. */
  errorState?: ReactNode;
  /** Container height. Defaults to `calc(100vh - 240px)` with min 400px. */
  height?: string | number;
  /** Starting collapsed depth. 0 (default) = collapse everything. */
  initialCollapsedDepth?: number;
  /** Optional color override by group key (e.g. department). */
  getNodeColor?: (groupKey: string) => string;
}

const EDGE_STROKE = "#94a3b8";
const EDGE_STROKE_WIDTH = 2;

const DEFAULT_PALETTE = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899",
  "#8b5cf6", "#14b8a6", "#ef4444", "#f97316",
] as const;

function defaultColor(key: string): string {
  if (!key) return "#94a3b8";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  // `>>> 0` coerces to uint32 so Math.abs doesn't return a negative for the
  // INT32_MIN hash (`Math.abs(-2147483648) === -2147483648`), which would
  // produce an undefined palette index and a literal "undefined" border color.
  const idx = (h >>> 0) % DEFAULT_PALETTE.length;
  return DEFAULT_PALETTE[idx];
}

// Scoped CSS for hover transitions on the node cards and react-flow chrome.
// Kept here (rather than inline) because hover states can't be expressed as
// inline styles, and the react-flow selectors need to pierce library styles.
const SCOPED_CSS = `
.orca-oc-root { position: relative; }
.orca-oc-root .react-flow__edge-path { stroke-linecap: round; }
.orca-oc-root .react-flow__controls {
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.06);
  overflow: hidden;
}
.orca-oc-root .react-flow__controls-button {
  border: none;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.orca-oc-root .react-flow__controls-button:last-child { border-bottom: none; }

.orca-oc-card {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.orca-oc-card--primary:hover {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}
.orca-oc-card--primary.orca-oc-card--highlighted:hover {
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.6), 0 8px 28px rgba(0, 0, 0, 0.14);
  transform: translateY(-2px);
}
.orca-oc-card--stacked:hover {
  opacity: 0.9 !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
.orca-oc-card--grouped:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
  background-color: rgba(241, 245, 249, 0.95) !important;
}
`;

function ScopedStyles() {
  return <style>{SCOPED_CSS}</style>;
}

// ---------------------------------------------------------------------------
// Custom edge — tree-branch path with rounded corners.
// ---------------------------------------------------------------------------

function TreeBranchEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const r = 6;
  const busX = (data as { busX?: number } | undefined)?.busX;

  let d: string;

  if (typeof busX === "number") {
    // Fixed trunk offset so every edge from the same parent shares the exact
    // same horizontal line below the parent — otherwise row-N edges end up at
    // deeper Y than row-0 edges and you get parallel horizontal lines.
    const trunkY = sourceY + 40;
    const h1Dir = busX >= sourceX ? 1 : -1;
    const h2Dir = targetX >= busX ? 1 : -1;
    const vSeg1 = Math.abs(trunkY - sourceY);
    const hSeg1 = Math.abs(busX - sourceX);
    const vSeg2 = Math.abs(targetY - trunkY);
    const hSeg2 = Math.abs(targetX - busX);
    const cr1 = Math.min(r, vSeg1 / 2, hSeg1 / 2);
    const cr2 = Math.min(r, vSeg2 / 2, hSeg1 / 2);
    const cr3 = Math.min(r, vSeg2 / 2, hSeg2 / 2);
    d =
      `M${sourceX},${sourceY}` +
      ` L${sourceX},${trunkY - cr1}` +
      ` Q${sourceX},${trunkY} ${sourceX + h1Dir * cr1},${trunkY}` +
      ` L${busX - h1Dir * cr2},${trunkY}` +
      ` Q${busX},${trunkY} ${busX},${trunkY + cr2}` +
      ` L${busX},${targetY - cr3}` +
      ` Q${busX},${targetY} ${busX + h2Dir * cr3},${targetY}` +
      ` L${targetX},${targetY}`;
  } else if (Math.abs(targetX - sourceX) < 1) {
    d = `M${sourceX},${sourceY} L${targetX},${targetY}`;
  } else {
    const dy = targetY - sourceY;
    const sign = dy >= 0 ? 1 : -1;
    const absDy = Math.abs(dy);
    const offset = Math.max(30, Math.min(80, absDy * 0.35));
    const branchY = sourceY + offset * sign;
    const dir = targetX > sourceX ? 1 : -1;
    const vLen = Math.abs(branchY - sourceY);
    const hLen = Math.abs(targetX - sourceX);
    const cr = Math.min(r, vLen / 2, hLen / 2);
    const sx = dir * cr;
    d =
      `M${sourceX},${sourceY}` +
      ` L${sourceX},${branchY - sign * cr}` +
      ` Q${sourceX},${branchY} ${sourceX + sx},${branchY}` +
      ` L${targetX - sx},${branchY}` +
      ` Q${targetX},${branchY} ${targetX},${branchY + sign * cr}` +
      ` L${targetX},${targetY}`;
  }
  return <path id={id} d={d} fill="none" className="react-flow__edge-path" style={style} markerEnd={markerEnd} />;
}

const edgeTypes = { treeBranch: TreeBranchEdge };

function styleEdges(
  edges: {
    id: string;
    source: string;
    target: string;
    type: string;
    targetHandle?: "left";
    data?: { busX?: number };
  }[],
): Edge[] {
  return edges.map((e) => ({
    ...e,
    type: "treeBranch",
    targetHandle: e.targetHandle,
    data: e.data,
    style: { stroke: EDGE_STROKE, strokeWidth: EDGE_STROKE_WIDTH },
  }));
}

// ---------------------------------------------------------------------------
// Node card
// ---------------------------------------------------------------------------

type CardData = OrgChartNodeInput & {
  highlighted: boolean;
  totalChildCount: number;
  onToggleCollapse?: (id: string) => void;
  onToggleGrouped?: (id: string) => void;
  onClickId?: (id: string) => void;
  isCollapsed?: boolean;
  isStacked?: boolean;
  isGroupedStacked?: boolean;
  groupedCount?: number;
  groupedNames?: string;
  colorFor: (key: string) => string;
  [key: string]: unknown;
};

type FlowCardNode = Node<CardData, "orgChartNode">;

const HIDDEN_HANDLE: CSSProperties = { opacity: 0, pointerEvents: "none" };

const NOWRAP: CSSProperties = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const CardNode = memo(function CardNode({ data }: NodeProps<FlowCardNode>) {
  const {
    id,
    firstName,
    lastName,
    title,
    groupKey,
    directChildCount,
    totalChildCount,
    external,
    highlighted,
    onToggleCollapse,
    onToggleGrouped,
    onClickId,
    isCollapsed,
    isStacked,
    isGroupedStacked,
    groupedCount,
    groupedNames,
    colorFor,
  } = data;

  const accent = external ? "#94a3b8" : colorFor(groupKey ?? "");
  const directCount = directChildCount ?? 0;

  if (isGroupedStacked) {
    return (
      <>
        <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE} />
        <Handle type="target" position={Position.Left} id="left" style={HIDDEN_HANDLE} />
        <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE} />
        <div
          className="orca-oc-card orca-oc-card--grouped"
          onClick={() => onToggleGrouped?.(id)}
          style={{
            padding: "12px 16px",
            width: 180,
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(241, 245, 249, 0.85)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 4px 2px rgba(0,0,0,0.03)",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
            <BlockOutlined style={{ fontSize: 12, color: "rgba(0,0,0,0.45)" }} />
            <span
              style={{
                ...NOWRAP,
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(0,0,0,0.45)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {groupedCount ?? 0} collapsed
            </span>
          </div>
          {groupedNames && (
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.4,
                color: "rgba(0,0,0,0.45)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              {groupedNames}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
            <ArrowsAltOutlined style={{ fontSize: 12, color: "#1677ff", opacity: 0.7 }} />
            <span style={{ fontSize: 10, color: "#1677ff", fontWeight: 600 }}>
              Click to expand
            </span>
          </div>
        </div>
      </>
    );
  }

  if (isStacked) {
    return (
      <>
        <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE} />
        <Handle type="target" position={Position.Left} id="left" style={HIDDEN_HANDLE} />
        <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE} />
        <div
          className="orca-oc-card orca-oc-card--stacked"
          style={{
            padding: "10px 12px",
            width: 140,
            borderRadius: 8,
            borderLeft: `3px solid ${accent}`,
            background: "rgba(241, 245, 249, 0.8)",
            backdropFilter: "blur(8px)",
            boxShadow: "0 1px 6px rgba(0, 0, 0, 0.04)",
            opacity: 0.7,
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <BlockOutlined style={{ fontSize: 10, color: "rgba(0,0,0,0.25)" }} />
            <span
              style={{
                ...NOWRAP,
                fontSize: 10,
                fontWeight: 600,
                color: "rgba(0,0,0,0.25)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Collapsed
            </span>
          </div>
          <div
            style={{
              ...NOWRAP,
              fontWeight: 600,
              fontSize: 12,
              lineHeight: 1.3,
              color: "rgba(0,0,0,0.45)",
              display: "block",
            }}
          >
            {firstName} {lastName}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 4, alignItems: "center" }}>
            {groupKey && (
              <span
                style={{
                  ...NOWRAP,
                  fontSize: 9,
                  fontWeight: 600,
                  color: accent,
                  backgroundColor: `${accent}15`,
                  padding: "1px 4px",
                  borderRadius: 4,
                }}
              >
                {groupKey}
              </span>
            )}
            {totalChildCount > 0 && (
              <span style={{ ...NOWRAP, fontSize: 9, color: "rgba(0,0,0,0.25)" }}>
                +{totalChildCount}
              </span>
            )}
          </div>
        </div>
      </>
    );
  }

  const cardClass =
    "orca-oc-card orca-oc-card--primary" + (highlighted ? " orca-oc-card--highlighted" : "");

  return (
    <>
      <Handle type="target" position={Position.Top} style={HIDDEN_HANDLE} />
      <Handle type="target" position={Position.Left} id="left" style={HIDDEN_HANDLE} />
      <Handle type="source" position={Position.Bottom} style={HIDDEN_HANDLE} />
      <div
        className={external ? "orca-oc-card" : cardClass}
        style={{
          padding: "16px 20px",
          minWidth: 220,
          maxWidth: 260,
          borderRadius: 12,
          borderLeft: `4px solid ${accent}`,
          background: external ? "rgba(241, 245, 249, 0.85)" : "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(12px)",
          boxShadow: highlighted
            ? `0 0 0 3px rgba(245, 158, 11, 0.5), 0 4px 20px rgba(0, 0, 0, 0.1)`
            : "0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)",
          opacity: external ? 0.65 : 1,
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div
            style={{
              ...NOWRAP,
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.3,
              color: external ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.88)",
              fontStyle: external ? "italic" : undefined,
            }}
          >
            {firstName} {lastName}
          </div>
          {directCount > 0 && !external && onToggleCollapse && (
            <Button
              type="text"
              size="small"
              shape="circle"
              onClick={() => onToggleCollapse(id)}
              aria-label={isCollapsed ? "Expand" : "Collapse"}
              icon={
                isCollapsed ? (
                  <RightOutlined style={{ fontSize: 12 }} />
                ) : (
                  <DownOutlined style={{ fontSize: 12 }} />
                )
              }
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.04)",
                width: 26,
                height: 26,
                minWidth: 26,
                flexShrink: 0,
              }}
            />
          )}
        </div>

        {title && (
          <div
            style={{
              ...NOWRAP,
              color: "rgba(0,0,0,0.45)",
              fontSize: 12,
              lineHeight: 1.4,
              display: "block",
              marginTop: 2,
            }}
          >
            {title}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
          {groupKey && (
            <span
              style={{
                ...NOWRAP,
                display: "inline-flex",
                alignItems: "center",
                height: 20,
                padding: "0 6px",
                fontSize: 10,
                fontWeight: 600,
                backgroundColor: `${accent}18`,
                color: accent,
                border: `1px solid ${accent}40`,
                borderRadius: 10,
              }}
            >
              {groupKey}
            </span>
          )}
          {directCount > 0 && (
            <Tooltip title={`${directCount} direct reports`}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "rgba(0,0,0,0.45)" }}>
                <TeamOutlined style={{ fontSize: 10 }} />
                <span style={{ fontSize: 11, fontWeight: 500 }}>{directCount}</span>
              </span>
            </Tooltip>
          )}
          {totalChildCount > 0 && totalChildCount !== directCount && (
            <Tooltip title={`${totalChildCount} total reports (direct + indirect)`}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "rgba(0,0,0,0.45)", opacity: 0.7 }}>
                <UsergroupAddOutlined style={{ fontSize: 10 }} />
                <span style={{ fontSize: 11, fontWeight: 500 }}>{totalChildCount}</span>
              </span>
            </Tooltip>
          )}
          {!external && onClickId && (
            <Tooltip title="View details">
              <Button
                type="text"
                size="small"
                shape="circle"
                onClick={() => onClickId(id)}
                aria-label="View details"
                icon={<UserOutlined style={{ fontSize: 12 }} />}
                style={{ marginLeft: "auto", color: "#1677ff", width: 22, height: 22, minWidth: 22 }}
              />
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
});

const nodeTypes = { orgChartNode: CardNode };

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function OrgChart(props: OrgChartProps) {
  return (
    <ReactFlowProvider>
      <OrgChartInner {...props} />
    </ReactFlowProvider>
  );
}

function OrgChartInner({
  nodes,
  search,
  onNodeClick,
  loading,
  error,
  emptyState,
  errorState,
  height = "calc(100vh - 240px)",
  initialCollapsedDepth = 0,
  getNodeColor,
}: OrgChartProps) {
  const { token } = theme.useToken();
  const { fitView } = useReactFlow();
  const [collapsedSet, setCollapsedSet] = useState<Set<string>>();
  const [depthFocus, setDepthFocus] = useState<Map<number, string>>(new Map());

  const colorFor = useMemo(
    () => getNodeColor ?? defaultColor,
    [getNodeColor],
  );

  // Single id→node index shared across the memo chain below. Three separate
  // consumers used to build their own `new Map(nodes.map(...))` — this is
  // the same O(N) walk, three times.
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const nodeIds = useMemo(() => new Set(nodeMap.keys()), [nodeMap]);

  // Derive pruned views of collapsedSet / depthFocus instead of pruning the
  // stored state in an effect — keeps reads consistent when `nodes` shrinks
  // without triggering a cascading render.
  const collapsed = useMemo(() => {
    if (collapsedSet) {
      const filtered = new Set([...collapsedSet].filter((c) => nodeIds.has(c)));
      return filtered;
    }
    if (!nodes.length) return new Set<string>();
    return initialCollapsed(nodes, initialCollapsedDepth);
  }, [collapsedSet, nodeIds, nodes, initialCollapsedDepth]);

  const effectiveDepthFocus = useMemo(() => {
    if (depthFocus.size === 0) return depthFocus;
    const filtered = new Map([...depthFocus].filter(([, c]) => nodeIds.has(c)));
    return filtered.size === depthFocus.size ? depthFocus : filtered;
  }, [depthFocus, nodeIds]);

  const nodeDepths = useMemo(() => {
    if (!nodes.length) return new Map<string, number>();
    return computeNodeDepths(nodes);
  }, [nodes]);

  const toggleCollapse = useCallback(
    (code: string) => {
      const depth = nodeDepths.get(code);
      let nowCollapsed = false;
      setCollapsedSet((prev) => {
        const base = prev ?? initialCollapsed(nodes, initialCollapsedDepth);
        const next = new Set(base);
        if (next.has(code)) next.delete(code);
        else next.add(code);
        nowCollapsed = next.has(code);
        return next;
      });
      setDepthFocus((prev) => {
        const df = new Map(prev);
        if (depth === undefined) return df;
        if (!nowCollapsed) {
          df.set(depth, code);
          for (const [d] of df) if (d > depth) df.delete(d);
        } else if (df.get(depth) === code) {
          df.delete(depth);
        }
        return df;
      });
    },
    [nodeDepths, nodes, initialCollapsedDepth],
  );

  const focusPath = useMemo((): Set<string> => {
    if (!nodes.length || effectiveDepthFocus.size === 0) return new Set<string>();
    let maxDepth = -1;
    let focusCode = "";
    for (const [d, code] of effectiveDepthFocus) {
      if (d > maxDepth) {
        maxDepth = d;
        focusCode = code;
      }
    }
    if (!focusCode) return new Set<string>();
    const path = new Set<string>();
    let current: string | undefined = focusCode;
    while (current && nodeMap.has(current)) {
      path.add(current);
      const mgr: string | undefined = nodeMap.get(current)?.parentId ?? undefined;
      current = mgr && nodeMap.has(mgr) ? mgr : undefined;
    }
    return path;
  }, [nodes, nodeMap, effectiveDepthFocus]);

  const stacked = useMemo((): Set<string> => {
    if (focusPath.size === 0) return new Set<string>();
    const result = new Set<string>();
    for (const n of nodes) {
      const code = n.id;
      if (focusPath.has(code)) continue;
      const depth = nodeDepths.get(code) ?? 0;
      if (depth === 0) continue;
      const mgr = n.parentId;
      if (mgr && nodeMap.has(mgr) && collapsed.has(mgr)) continue;
      if (effectiveDepthFocus.has(depth)) result.add(code);
    }
    return result;
  }, [nodes, nodeMap, focusPath, collapsed, nodeDepths, effectiveDepthFocus]);

  const groupedStacked = useMemo((): Map<string, string[]> => {
    if (stacked.size === 0) return new Map();
    const groups = new Map<string, string[]>();
    for (const code of stacked) {
      const mgr = nodeMap.get(code)?.parentId;
      if (mgr) {
        const list = groups.get(mgr) ?? [];
        list.push(code);
        groups.set(mgr, list);
      }
    }
    return groups;
  }, [nodeMap, stacked]);

  const layout = useMemo(() => {
    if (!nodes.length) return undefined;
    return buildOrgChart(nodes, collapsed, search, stacked, groupedStacked);
  }, [nodes, collapsed, search, stacked, groupedStacked]);

  const toggleGrouped = useCallback(
    (parentId: string) => {
      const children = groupedStacked.get(parentId) ?? [];
      if (children.length === 0) return;
      setDepthFocus((prev) => {
        const df = new Map(prev);
        const childSet = new Set(children);
        for (const [d, focused] of df) if (childSet.has(focused)) df.delete(d);
        return df;
      });
      setCollapsedSet((prev) => {
        if (!prev) return prev;
        const next = new Set(prev);
        for (const code of children) next.delete(code);
        return next;
      });
    },
    [groupedStacked],
  );

  const flowNodes = useMemo((): FlowCardNode[] => {
    if (!layout) return [];
    return layout.nodes.map((n) => ({
      ...n,
      type: "orgChartNode" as const,
      data: {
        ...n.data,
        onToggleCollapse: toggleCollapse,
        onToggleGrouped: toggleGrouped,
        onClickId: onNodeClick,
        isCollapsed: collapsed.has(n.id),
        isStacked: stacked.has(n.id),
        isGroupedStacked: n.id.startsWith("__group_"),
        colorFor,
      },
    }));
  }, [layout, toggleCollapse, toggleGrouped, onNodeClick, collapsed, stacked, colorFor]);

  const flowEdges = useMemo(() => {
    if (!layout) return [];
    const visible = layout.edges.filter((e) => !stacked.has(e.source));
    return styleEdges(visible);
  }, [layout, stacked]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "64px 0" }}>
        <Spin />
      </div>
    );
  }

  if (error) {
    if (errorState) return <>{errorState}</>;
    // `error === true`: default copy. `error instanceof Error`: use .message
    // as the description. Any other ReactNode: render directly.
    if (error !== true && !(error instanceof Error)) {
      return <>{error}</>;
    }
    const description =
      error instanceof Error
        ? error.message
        : "An error occurred while loading the org chart. Please try again.";
    return (
      <EmptyState
        icon={<ApartmentOutlined style={{ fontSize: 48 }} />}
        title="Failed to load org chart"
        description={description}
      />
    );
  }

  if (!nodes.length) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <EmptyState
        icon={<ApartmentOutlined style={{ fontSize: 48 }} />}
        title="No org chart data"
        description="Provide a flat list of nodes with parent links to render the chart."
      />
    );
  }

  return (
    <div
      className="orca-oc-root"
      style={{
        height,
        minHeight: 400,
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgLayout,
      }}
    >
      <ScopedStyles />
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
      >
        <Controls showInteractive={false} />
        <div style={{ position: "absolute", bottom: 12, right: 64, zIndex: 5 }}>
          <Tooltip title="Fit view" placement="left">
            <Button
              type="default"
              size="small"
              shape="circle"
              onClick={() => fitView({ padding: 0.2, duration: 200 })}
              icon={<AimOutlined />}
              style={{
                background: token.colorBgContainer,
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            />
          </Tooltip>
        </div>
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(148, 163, 184, 0.18)" />
      </ReactFlow>
    </div>
  );
}
