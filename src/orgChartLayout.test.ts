import { describe, expect, it } from "vitest";

import {
  buildOrgChart,
  computeNodeDepths,
  computeSubtreeSizes,
  initialCollapsed,
  matchesSearch,
  type OrgChartNodeInput,
} from "./orgChartLayout";

function n(
  id: string,
  parentId?: string | null,
  overrides: Partial<OrgChartNodeInput> = {},
): OrgChartNodeInput {
  return { id, firstName: id, lastName: "", parentId, ...overrides };
}

describe("buildOrgChart", () => {
  it("returns an empty layout for an empty input", () => {
    const result = buildOrgChart([], new Set());
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });

  it("lays out a single root with two children", () => {
    const nodes = [n("A", null), n("B", "A"), n("C", "A")];
    const layout = buildOrgChart(nodes, new Set());
    const ids = layout.nodes.map((ln) => ln.id).sort();
    expect(ids).toEqual(["A", "B", "C"]);
    expect(layout.edges.map((e) => `${e.source}->${e.target}`).sort()).toEqual([
      "A->B",
      "A->C",
    ]);
  });

  it("emits edges only for parent/child pairs within the input set", () => {
    const nodes = [n("A", null), n("B", "A"), n("C", "missing-parent")];
    const layout = buildOrgChart(nodes, new Set());
    const sources = layout.edges.map((e) => e.source);
    // C's edge comes from the external pseudo-root, not from the missing id
    // alone — the pseudo-node for "missing-parent" is injected as a root.
    expect(sources).toContain("missing-parent");
    const layoutIds = layout.nodes.map((ln) => ln.id);
    expect(layoutIds).toContain("missing-parent");
  });

  it("handles a forest (two independent roots)", () => {
    const nodes = [n("A", null), n("B", "A"), n("X", null), n("Y", "X")];
    const layout = buildOrgChart(nodes, new Set());
    const ids = layout.nodes.map((ln) => ln.id).sort();
    expect(ids).toEqual(["A", "B", "X", "Y"]);
    // The two roots are positioned left-to-right with gap, not stacked.
    const a = layout.nodes.find((ln) => ln.id === "A")!;
    const x = layout.nodes.find((ln) => ln.id === "X")!;
    expect(x.position.x).toBeGreaterThan(a.position.x);
  });

  it("promotes a pure cycle (no root) via the cycle-promotion pass", () => {
    const nodes = [n("A", "B"), n("B", "A")];
    const layout = buildOrgChart(nodes, new Set());
    const ids = layout.nodes.map((ln) => ln.id).sort();
    // Both nodes must appear; neither should be stranded.
    expect(ids).toEqual(["A", "B"]);
  });

  it("marks matched nodes as highlighted when a search query is passed", () => {
    const nodes = [
      n("A", null, { firstName: "Aida" }),
      n("B", "A", { firstName: "Bob" }),
    ];
    const layout = buildOrgChart(nodes, new Set(), "aida");
    const a = layout.nodes.find((ln) => ln.id === "A")!;
    const b = layout.nodes.find((ln) => ln.id === "B")!;
    expect(a.data.highlighted).toBe(true);
    expect(b.data.highlighted).toBe(false);
  });

  it("hides descendants of a collapsed node", () => {
    const nodes = [n("A", null), n("B", "A"), n("C", "B")];
    const layout = buildOrgChart(nodes, new Set(["A"]));
    const ids = layout.nodes.map((ln) => ln.id).sort();
    // A is laid out (it's the collapsed node itself); B and C are hidden.
    expect(ids).toEqual(["A"]);
  });
});

describe("initialCollapsed", () => {
  it("collapses every node with children at maxDepth=0", () => {
    const nodes = [n("A", null), n("B", "A"), n("C", "B")];
    const collapsed = initialCollapsed(nodes, 0);
    // A and B have children; C is a leaf.
    expect([...collapsed].sort()).toEqual(["A", "B"]);
  });

  it("respects maxDepth=2 (nodes at depth >= 2 with children collapse)", () => {
    const nodes = [n("A", null), n("B", "A"), n("C", "B"), n("D", "C")];
    const collapsed = initialCollapsed(nodes, 2);
    // Only C (depth 2) has children (D) at depth >= 2.
    expect([...collapsed]).toEqual(["C"]);
  });

  it("does not collapse external pseudo-nodes", () => {
    // external: true is applied by buildOrgChart's pseudo-insert path.
    // Here we simulate by passing an input flagged external.
    const nodes = [
      { id: "EXT", firstName: "EXT", lastName: "", external: true },
      n("A", "EXT"),
    ];
    const collapsed = initialCollapsed(nodes, 0);
    expect(collapsed.has("EXT")).toBe(false);
  });
});

describe("computeSubtreeSizes", () => {
  it("counts self + all descendants", () => {
    const nodes = [n("A", null), n("B", "A"), n("C", "B"), n("D", "A")];
    const sizes = computeSubtreeSizes(nodes);
    expect(sizes.get("A")).toBe(4);
    expect(sizes.get("B")).toBe(2);
    expect(sizes.get("C")).toBe(1);
    expect(sizes.get("D")).toBe(1);
  });
});

describe("computeNodeDepths", () => {
  it("assigns 0 to roots and increments per level", () => {
    const nodes = [n("A", null), n("B", "A"), n("C", "B")];
    const depths = computeNodeDepths(nodes);
    expect(depths.get("A")).toBe(0);
    expect(depths.get("B")).toBe(1);
    expect(depths.get("C")).toBe(2);
  });

  it("handles nodes whose parent is missing (treated as root)", () => {
    const nodes = [n("A", "ghost"), n("B", "A")];
    const depths = computeNodeDepths(nodes);
    expect(depths.get("A")).toBe(0);
    expect(depths.get("B")).toBe(1);
  });
});

describe("matchesSearch", () => {
  it("matches firstName case-insensitively", () => {
    expect(matchesSearch(n("x", null, { firstName: "Charlie" }), "char")).toBe(true);
    expect(matchesSearch(n("x", null, { firstName: "Charlie" }), "CHAR")).toBe(true);
  });

  it("matches lastName", () => {
    expect(matchesSearch(n("x", null, { firstName: "A", lastName: "Doe" }), "doe")).toBe(
      true,
    );
  });

  it("matches id", () => {
    expect(matchesSearch(n("E42", null, { firstName: "A" }), "e42")).toBe(true);
  });

  it("does not match title or groupKey (intentional v1 scope)", () => {
    expect(
      matchesSearch(
        n("x", null, { firstName: "A", title: "Engineer", groupKey: "Platform" }),
        "engineer",
      ),
    ).toBe(false);
  });
});
