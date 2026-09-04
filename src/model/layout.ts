import { ModuleKind } from '../types/graph';
import type { Graph } from '../types/graph';
import { NODE_WIDTH, nodeHeight } from './geometry';

const COLUMN_GAP = 110;
const ROW_GAP = 40;
const MARGIN_X = 80;
const MARGIN_Y = 90;
const ORDERING_SWEEPS = 4;

/**
 * Nudges `start` diagonally until it no longer sits on top of an existing
 * node's corner, so modules added from the toolbar cascade instead of stacking.
 */
export function freePosition(graph: Graph, start: { x: number; y: number }) {
  const STEP = 28;
  const position = { x: Math.round(start.x), y: Math.round(start.y) };
  const occupied = (p: { x: number; y: number }) =>
    graph.modules.some(
      (m) => Math.abs((m.x ?? 0) - p.x) < STEP && Math.abs((m.y ?? 0) - p.y) < STEP
    );
  while (occupied(position)) {
    position.x += STEP;
    position.y += STEP;
  }
  return position;
}

/**
 * Assigns canvas positions to modules that have none, using a layered
 * (Sugiyama-style) layout so signal flows left to right like a patch diagram:
 *
 * 1. Feedback cables are ignored for layering, so cycles don't break it.
 * 2. Each module's column is the longest path from a source; OUTPUTs are
 *    pushed to the last column.
 * 3. Modules within a column are ordered by the barycenter of their
 *    neighbours' vertical positions, sweeping left/right a few times, which
 *    keeps cables short and reduces crossings.
 * 4. Columns are centred vertically on a common midline.
 */
export function layoutGraph(graph: Graph): Graph {
  const needsLayout = graph.modules.some((m) => m.x === undefined || m.y === undefined);
  if (!needsLayout || graph.modules.length === 0) return graph;

  const positioned = computeLayout(graph);
  return {
    ...graph,
    modules: graph.modules.map((m) =>
      m.x === undefined || m.y === undefined ? { ...m, ...positioned.get(m.id) } : m
    ),
  };
}

export function computeLayout(graph: Graph): Map<string, { x: number; y: number }> {
  const modules = graph.modules;
  const ids = modules.map((m) => m.id);
  const byId = new Map(modules.map((m) => [m.id, m]));

  // Unique forward edges, self-loops dropped.
  const successors = new Map<string, Set<string>>(ids.map((id) => [id, new Set()]));
  const predecessors = new Map<string, Set<string>>(ids.map((id) => [id, new Set()]));
  for (const { from, to } of graph.connections) {
    if (from.id === to.id || !byId.has(from.id) || !byId.has(to.id)) continue;
    successors.get(from.id)!.add(to.id);
    predecessors.get(to.id)!.add(from.id);
  }

  // 1. Break cycles: DFS from sources (then from anything unvisited), and
  //    drop edges that point back into the current DFS stack.
  const dagSucc = new Map<string, string[]>(ids.map((id) => [id, []]));
  const dagPred = new Map<string, string[]>(ids.map((id) => [id, []]));
  const state = new Map<string, 'open' | 'done'>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const next of successors.get(id)!) {
      const s = state.get(next);
      if (s === 'open') continue; // back edge: feedback cable
      if (s !== 'done') visit(next);
      dagSucc.get(id)!.push(next);
      dagPred.get(next)!.push(id);
    }
    state.set(id, 'done');
  };
  const sources = ids.filter((id) => predecessors.get(id)!.size === 0);
  for (const id of [...sources, ...ids]) {
    if (!state.has(id)) visit(id);
  }

  // 2. Layer by longest path from a source (topological order = reverse
  //    DFS post-order, which `visit` produced by finishing children first).
  const layer = new Map<string, number>();
  const topo: string[] = [];
  const seen = new Set<string>();
  const order = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const next of dagSucc.get(id)!) order(next);
    topo.push(id);
  };
  for (const id of [...sources, ...ids]) order(id);
  topo.reverse();
  for (const id of topo) {
    const preds = dagPred.get(id)!;
    layer.set(id, preds.length ? Math.max(...preds.map((p) => layer.get(p)!)) + 1 : 0);
  }
  let maxLayer = Math.max(...layer.values());
  const outputs = ids.filter((id) => byId.get(id)!.kind === ModuleKind.OUTPUT);
  if (outputs.length > 0) {
    if (outputs.some((id) => layer.get(id) !== maxLayer)) {
      maxLayer = Math.max(maxLayer, ...outputs.map((id) => layer.get(id)! + 1));
    }
    for (const id of outputs) layer.set(id, maxLayer);
  }

  // 3. Order within columns by neighbour barycenter.
  const columns: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const id of ids) columns[layer.get(id)!].push(id);

  const centerY = new Map<string, number>();
  const stack = (column: string[]) => {
    let y = MARGIN_Y;
    for (const id of column) {
      const h = nodeHeight(byId.get(id)!);
      centerY.set(id, y + h / 2);
      y += h + ROW_GAP;
    }
  };
  columns.forEach(stack);

  const barycenter = (id: string, neighbours: Iterable<string>) => {
    const ys = [...neighbours].map((n) => centerY.get(n)!);
    return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : centerY.get(id)!;
  };
  const reorder = (column: string[], pick: (id: string) => Iterable<string>) => {
    const keyed = column.map((id, index) => ({ id, index, key: barycenter(id, pick(id)) }));
    keyed.sort((a, b) => a.key - b.key || a.index - b.index);
    column.splice(0, column.length, ...keyed.map((k) => k.id));
    stack(column);
  };
  for (let sweep = 0; sweep < ORDERING_SWEEPS; sweep++) {
    if (sweep % 2 === 0) {
      for (let c = 1; c < columns.length; c++) {
        reorder(columns[c], (id) => predecessors.get(id)!);
      }
    } else {
      for (let c = columns.length - 2; c >= 0; c--) {
        reorder(columns[c], (id) => successors.get(id)!);
      }
    }
  }

  // 4. Place, centring each column on the tallest column's midline.
  const columnHeight = (column: string[]) =>
    column.reduce((sum, id) => sum + nodeHeight(byId.get(id)!), 0) +
    ROW_GAP * Math.max(0, column.length - 1);
  const tallest = Math.max(...columns.map(columnHeight));

  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((column, c) => {
    let y = MARGIN_Y + (tallest - columnHeight(column)) / 2;
    for (const id of column) {
      positions.set(id, { x: MARGIN_X + c * (NODE_WIDTH + COLUMN_GAP), y: Math.round(y) });
      y += nodeHeight(byId.get(id)!) + ROW_GAP;
    }
  });
  return positions;
}

/** Straight-line cable crossings for a positioned graph; a layout quality metric. */
export function countCrossings(graph: Graph): number {
  const byId = new Map(graph.modules.map((m) => [m.id, m]));
  const segs = graph.connections
    .filter((c) => c.from.id !== c.to.id)
    .map((c) => {
      const a = byId.get(c.from.id)!;
      const b = byId.get(c.to.id)!;
      return {
        x1: (a.x ?? 0) + NODE_WIDTH,
        y1: (a.y ?? 0) + nodeHeight(a) / 2,
        x2: b.x ?? 0,
        y2: (b.y ?? 0) + nodeHeight(b) / 2,
      };
    });
  const cross = (p: number, q: number, r: number, s: number, t: number, u: number) =>
    (r - p) * (u - q) - (s - q) * (t - p);
  let n = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i];
      const b = segs[j];
      const d1 = cross(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1);
      const d2 = cross(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2);
      const d3 = cross(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1);
      const d4 = cross(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2);
      if (d1 * d2 < 0 && d3 * d4 < 0) n++;
    }
  }
  return n;
}
