/**
 * Pure org-chart layout module.
 *
 * Converts a flat parent-linked `OrgChartNodeInput[]` list into positioned
 * xyflow node and edge objects. Handles forests (multiple roots), cycle
 * safety (BFS visited set), collapse/search filtering, and grid fan-outs
 * with column-chained edges (so wide fan-outs don't overlap).
 *
 * 100 % pure — no DOM, no React, no xyflow imports.
 */

export interface OrgChartNodeInput {
  id: string;
  firstName: string;
  lastName: string;
  title?: string | null;
  /** Used for color coding (e.g. department, team). Empty string = no color. */
  groupKey?: string;
  /** Parent id. Nullish = root. If the referenced id is missing from the input
   *  list, a pseudo-node with `external = true` is created automatically. */
  parentId?: string | null;
  directChildCount?: number;
  /** When true, renders as a dimmed placeholder; auto-set for missing parents. */
  external?: boolean;
}

// Layout constants (px)
const NODE_WIDTH = 240;
const STACKED_WIDTH = 140;
const GROUPED_STACKED_WIDTH = 180;
const NODE_HEIGHT = 100;
const H_GAP = 80;
const V_GAP = 80;
const GRID_ROW_HEIGHT = NODE_HEIGHT + V_GAP;
const GRID_MIN_CHILDREN = 4;

export interface LayoutNode {
  id: string;
  position: { x: number; y: number };
  data: OrgChartNodeInput & {
    highlighted: boolean;
    totalChildCount: number;
    groupedCount?: number;
    groupedNames?: string;
  };
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  /** When present, the custom edge routes via a vertical column bus at this X.
   *  Also sets targetHandle = "left" so the edge enters from the card's side. */
  targetHandle?: "left";
  data?: { busX?: number };
}

export interface OrgChartLayout {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

/**
 * Build positioned nodes and edges.
 *
 * @param nodes     Flat node list.
 * @param collapsed Set of node ids whose sub-trees are hidden.
 * @param search    Optional search query — matching nodes get `highlighted: true`.
 * @param stacked   Optional set of ids rendered as compact stacked cards
 *                  (sibling-focus dimming). Stacked nodes use a narrower width.
 * @param groupedStacked  Optional map from parent id → array of child ids
 *                  that render as a single grouped stacked card instead of
 *                  individual stacked cards.
 */
export function buildOrgChart(
  nodes: OrgChartNodeInput[],
  collapsed: Set<string>,
  search?: string,
  stacked?: Set<string>,
  groupedStacked?: Map<string, string[]>,
): OrgChartLayout {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const nodeMap = new Map<string, OrgChartNodeInput>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    const parent = n.parentId ?? undefined;
    if (parent && nodeMap.has(parent)) {
      const list = childrenOf.get(parent) ?? [];
      list.push(n.id);
      childrenOf.set(parent, list);
    }
  }
  for (const [, ch] of childrenOf) ch.sort();

  const subtreeSizes = computeSubtreeSizes(nodes);

  const roots: string[] = [];
  for (const n of nodes) {
    const parent = n.parentId ?? undefined;
    if (!parent || !nodeMap.has(parent)) roots.push(n.id);
  }
  roots.sort();

  const visited = new Set<string>();
  const hiddenByCollapse = new Set<string>();
  const layoutNodes: LayoutNode[] = [];
  const layoutEdges: LayoutEdge[] = [];
  // Memoize subtreeWidth per (code) within a single buildOrgChart call. The
  // result depends on `collapsed` / `stacked` / `groupedStacked` (constant
  // within this call) and on `visited` (mutates as layout runs). For
  // tree-structured subtrees the visited filter is a no-op, so the cached
  // value stays correct across the forest pass. Cycle-promoted nodes fetched
  // first in Phase C are computed with the full `visited` and then cached —
  // also correct. The cache turns a pathological O(N²) chain into O(N).
  const widthCache = new Map<string, number>();

  function gridColumns(count: number): number {
    if (count < GRID_MIN_CHILDREN) return 1;
    if (count <= 6) return 2;
    return Math.min(3, Math.ceil(count / 3));
  }

  function childWidth(c: string, measuring?: Set<string>): number {
    if (c.startsWith("__group_")) return GROUPED_STACKED_WIDTH;
    return subtreeWidth(c, measuring);
  }

  function computeColWidths(children: string[], cols: number, measuring?: Set<string>): number[] {
    const rowsPerCol = Math.ceil(children.length / cols);
    const widths: number[] = [];
    for (let col = 0; col < cols; col++) {
      let maxW = 0;
      for (let row = 0; row < rowsPerCol; row++) {
        const idx = col * rowsPerCol + row;
        if (idx < children.length) {
          maxW = Math.max(maxW, childWidth(children[idx], measuring));
        }
      }
      widths.push(maxW);
    }
    return widths;
  }

  function pushGroupNode(groupId: string, pos: { x: number; y: number }): void {
    const parentId = groupId.replace("__group_", "");
    const groupMembers = (groupedStacked?.get(parentId) ?? [])
      .map((gc) => nodeMap.get(gc))
      .filter(Boolean) as OrgChartNodeInput[];
    const totalChildren = groupMembers.reduce(
      (s, gn) => s + Math.max(0, (subtreeSizes.get(gn.id) ?? 1) - 1),
      0,
    );
    layoutNodes.push({
      id: groupId,
      position: pos,
      data: {
        id: parentId,
        firstName: "",
        lastName: "",
        groupKey: "",
        directChildCount: groupMembers.length,
        highlighted: false,
        totalChildCount: totalChildren,
        groupedCount: groupMembers.length,
        groupedNames: groupMembers.map((gn) => `${gn.firstName} ${gn.lastName}`).join(", "),
      },
    });
  }

  function subtreeWidth(code: string, measuring?: Set<string>): number {
    const cached = widthCache.get(code);
    if (cached !== undefined) return cached;
    const result = computeSubtreeWidth(code, measuring);
    widthCache.set(code, result);
    return result;
  }

  function computeSubtreeWidth(code: string, measuring?: Set<string>): number {
    if (collapsed.has(code)) return NODE_WIDTH;
    const w = stacked?.has(code) ? STACKED_WIDTH : NODE_WIDTH;
    const m = measuring ?? new Set<string>();
    if (m.has(code)) return w;
    m.add(code);
    const ch = (childrenOf.get(code) ?? []).filter((c) => !visited.has(c));
    if (groupedStacked?.has(code)) {
      const grouped = new Set(groupedStacked.get(code));
      const normal = ch.filter((c) => !grouped.has(c));
      if (normal.length === 0 && grouped.size > 0) {
        return Math.max(w, GROUPED_STACKED_WIDTH);
      }
      if (grouped.size > 0) {
        const effective = [...normal, `__group_${code}`];
        const mixCols = gridColumns(effective.length);
        if (mixCols > 1) {
          const colWidths = computeColWidths(effective, mixCols, m);
          const mixGridWidth = colWidths.reduce((s, cw, i) => s + cw + (i > 0 ? H_GAP : 0), 0);
          return Math.max(w, mixGridWidth);
        }
        const normalWidth = normal.reduce((s, c, i) => {
          return s + subtreeWidth(c, m) + (i > 0 ? H_GAP : 0);
        }, 0);
        const groupWidth = GROUPED_STACKED_WIDTH + (normal.length > 0 ? H_GAP : 0);
        return Math.max(w, normalWidth + groupWidth);
      }
    }
    const cols = gridColumns(ch.length);
    if (cols > 1) {
      const colWidths = computeColWidths(ch, cols, m);
      const gridWidth = colWidths.reduce((s, cw, i) => s + cw + (i > 0 ? H_GAP : 0), 0);
      return Math.max(w, gridWidth);
    }
    const childrenWidth = ch.reduce((s, c, i) => {
      return s + childWidth(c, m) + (i > 0 ? H_GAP : 0);
    }, 0);
    return Math.max(w, childrenWidth);
  }

  function collectDescendants(code: string, out: Set<string>): void {
    for (const c of childrenOf.get(code) ?? []) {
      if (!out.has(c)) {
        out.add(c);
        collectDescendants(c, out);
      }
    }
  }

  function layout(code: string, x: number, y: number): void {
    if (visited.has(code)) return;
    visited.add(code);

    const node = nodeMap.get(code)!;
    const q = search?.toLowerCase().trim() ?? "";
    const isStacked = stacked?.has(code) ?? false;
    const nodeW = isStacked ? STACKED_WIDTH : NODE_WIDTH;
    layoutNodes.push({
      id: code,
      position: { x, y },
      data: {
        ...node,
        highlighted: q.length > 0 && matchesSearch(node, q),
        totalChildCount: Math.max(0, (subtreeSizes.get(code) ?? 1) - 1),
      },
    });

    const ch = (childrenOf.get(code) ?? []).filter((c) => !visited.has(c));

    if (collapsed.has(code)) {
      collectDescendants(code, hiddenByCollapse);
      return;
    }

    if (ch.length === 0) return;

    const groupedChildren = groupedStacked?.get(code);
    let effectiveChildren = ch;
    if (groupedChildren && groupedChildren.length > 0) {
      const groupedSet = new Set(groupedChildren);
      const normalChildren = ch.filter((c) => !groupedSet.has(c));
      const groupId = `__group_${code}`;
      // Mark grouped children as visited AND hide their descendants. Without
      // hiding descendants, the cycle-promotion loop at the end treats every
      // unvisited descendant as a root and scatters them across the top row.
      for (const gc of groupedChildren) {
        visited.add(gc);
        collectDescendants(gc, hiddenByCollapse);
      }
      effectiveChildren = [...normalChildren, groupId];
    }

    const cols = gridColumns(effectiveChildren.length);

    if (cols > 1) {
      // Grid layout with column-bus edge routing. Every child's edge still
      // starts at the parent, but routes via a vertical bus just left of its
      // column. All edges to a column share the bus X, so the verticals
      // overlap into one visible line and each card has its own short
      // horizontal connector from the bus — making it obvious every card
      // reports to the parent, not to the card above it.
      const rowsPerCol = Math.ceil(effectiveChildren.length / cols);
      const colWidths = computeColWidths(effectiveChildren, cols);
      const gridWidth = colWidths.reduce((s, cw, i) => s + cw + (i > 0 ? H_GAP : 0), 0);
      const gridStartX = x + nodeW / 2 - gridWidth / 2;
      const colStartX: number[] = [];
      let cursorX = gridStartX;
      for (let col = 0; col < cols; col++) {
        colStartX.push(cursorX);
        cursorX += colWidths[col] + H_GAP;
      }
      const BUS_INSET = H_GAP / 2;
      const colBusX: number[] = colStartX.map((cx) => cx - BUS_INSET);
      for (const [i, c] of effectiveChildren.entries()) {
        const col = Math.floor(i / rowsPerCol);
        const row = i % rowsPerCol;
        const cellX = colStartX[col];
        const cellY = y + NODE_HEIGHT + V_GAP + row * GRID_ROW_HEIGHT;
        if (c.startsWith("__group_")) {
          pushGroupNode(c, { x: cellX, y: cellY });
        } else {
          const cw = childWidth(c);
          const nodeW2 = stacked?.has(c) ? STACKED_WIDTH : NODE_WIDTH;
          layout(c, cellX + cw / 2 - nodeW2 / 2, cellY);
        }
        layoutEdges.push({
          id: `e-${code}-${c}`,
          source: code,
          target: c,
          type: "treeBranch",
          targetHandle: "left",
          data: { busX: colBusX[col] },
        });
        void row;
      }
    } else {
      const totalWidth = effectiveChildren.reduce(
        (s, c, i) => s + childWidth(c) + (i > 0 ? H_GAP : 0),
        0,
      );
      let cursor = x + nodeW / 2 - totalWidth / 2;
      for (const c of effectiveChildren) {
        if (c.startsWith("__group_")) {
          pushGroupNode(c, { x: cursor, y: y + NODE_HEIGHT + V_GAP });
          cursor += GROUPED_STACKED_WIDTH + H_GAP;
        } else {
          const w = subtreeWidth(c);
          layout(c, cursor + w / 2 - nodeW / 2, y + NODE_HEIGHT + V_GAP);
          cursor += w + H_GAP;
        }
        layoutEdges.push({
          id: `e-${code}-${c}`,
          source: code,
          target: c,
          type: "treeBranch",
        });
      }
    }
  }

  // External pseudo-nodes for missing parents.
  const externalIds = new Set<string>();
  for (const n of nodes) {
    const p = n.parentId;
    if (p && !nodeMap.has(p)) externalIds.add(p);
  }
  // Any node whose original parent lives in `externalIds` was tentatively
  // added to `roots` above (because the parent wasn't in `nodeMap` at the
  // time). Now that we're injecting the pseudo-parent, pull those adoptees
  // back out of the root list so they don't get laid out twice and so the
  // pseudo-parent actually emits edges to them.
  const adoptedByPseudo = new Set<string>();
  for (const node of nodes) {
    if (node.parentId && externalIds.has(node.parentId)) {
      adoptedByPseudo.add(node.id);
    }
  }
  for (let i = roots.length - 1; i >= 0; i--) {
    if (adoptedByPseudo.has(roots[i])) roots.splice(i, 1);
  }
  for (const extId of externalIds) {
    if (!nodeMap.has(extId)) {
      const pseudo: OrgChartNodeInput = {
        id: extId,
        firstName: extId,
        lastName: "",
        external: true,
      };
      nodeMap.set(extId, pseudo);
      roots.push(extId);
      // Children already linked via original parentId.
      for (const n of nodes) {
        if (n.parentId === extId) {
          const list = childrenOf.get(extId) ?? [];
          list.push(n.id);
          childrenOf.set(extId, list);
        }
      }
    }
  }
  roots.sort();
  for (const [, ch] of childrenOf) ch.sort();

  let forestX = 0;
  for (const root of roots) {
    if (visited.has(root)) continue;
    const w = subtreeWidth(root);
    layout(root, forestX, 0);
    forestX += w + H_GAP * 2;
  }

  // Cycle promotion for nodes stranded in a pure cycle.
  for (const n of nodes) {
    if (!visited.has(n.id) && !hiddenByCollapse.has(n.id)) {
      const w = subtreeWidth(n.id);
      layout(n.id, forestX, 0);
      forestX += w + H_GAP * 2;
    }
  }

  return { nodes: layoutNodes, edges: layoutEdges };
}

/**
 * Default collapsed set — all nodes with children at depth >= maxDepth are
 * collapsed. Pass maxDepth = 0 to collapse everything (default).
 */
export function initialCollapsed(
  nodes: OrgChartNodeInput[],
  maxDepth = 0,
): Set<string> {
  const nodeMap = new Map<string, OrgChartNodeInput>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    const parent = n.parentId ?? undefined;
    if (parent && nodeMap.has(parent)) {
      const list = childrenOf.get(parent) ?? [];
      list.push(n.id);
      childrenOf.set(parent, list);
    }
  }

  const collapsed = new Set<string>();
  const visited = new Set<string>();

  const roots: string[] = [];
  for (const n of nodes) {
    const parent = n.parentId ?? undefined;
    if (!parent || !nodeMap.has(parent)) roots.push(n.id);
  }
  roots.sort();

  function walk(code: string, depth: number): void {
    if (visited.has(code)) return;
    visited.add(code);
    const node = nodeMap.get(code);
    const ch = childrenOf.get(code) ?? [];
    if (!node?.external && depth >= maxDepth && ch.length > 0) {
      collapsed.add(code);
    }
    for (const c of ch) walk(c, depth + 1);
  }

  for (const r of roots) walk(r, 0);
  return collapsed;
}

export function matchesSearch(node: OrgChartNodeInput, query: string): boolean {
  const q = query.toLowerCase();
  return (
    node.id.toLowerCase().includes(q) ||
    node.firstName.toLowerCase().includes(q) ||
    node.lastName.toLowerCase().includes(q)
  );
}

export function computeSubtreeSizes(nodes: OrgChartNodeInput[]): Map<string, number> {
  const nodeMap = new Map<string, OrgChartNodeInput>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    const parent = n.parentId ?? undefined;
    if (parent && nodeMap.has(parent)) {
      const list = childrenOf.get(parent) ?? [];
      list.push(n.id);
      childrenOf.set(parent, list);
    }
  }

  const sizes = new Map<string, number>();
  const visited = new Set<string>();

  function dfs(code: string): number {
    if (visited.has(code)) return 1;
    visited.add(code);
    const ch = childrenOf.get(code) ?? [];
    let size = 1;
    for (const c of ch) size += dfs(c);
    sizes.set(code, size);
    return size;
  }

  for (const n of nodes) {
    if (!visited.has(n.id)) dfs(n.id);
  }
  return sizes;
}

export function computeNodeDepths(nodes: OrgChartNodeInput[]): Map<string, number> {
  const nodeMap = new Map<string, OrgChartNodeInput>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const childrenOf = new Map<string, string[]>();
  for (const n of nodes) {
    const parent = n.parentId ?? undefined;
    if (parent && nodeMap.has(parent)) {
      const list = childrenOf.get(parent) ?? [];
      list.push(n.id);
      childrenOf.set(parent, list);
    }
  }

  const depths = new Map<string, number>();
  const visited = new Set<string>();

  function walk(code: string, depth: number): void {
    if (visited.has(code)) return;
    visited.add(code);
    depths.set(code, depth);
    for (const c of childrenOf.get(code) ?? []) walk(c, depth + 1);
  }

  for (const n of nodes) {
    const parent = n.parentId ?? undefined;
    if (!parent || !nodeMap.has(parent)) {
      if (!visited.has(n.id)) walk(n.id, 0);
    }
  }
  for (const n of nodes) {
    if (!visited.has(n.id)) walk(n.id, 0);
  }
  return depths;
}
