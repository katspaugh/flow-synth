import { ModuleKind } from '../types/graph';
import type { Graph, ModuleDefinition } from '../types/graph';
import { NODE_WIDTH, nodeHeight } from './geometry';

const COLUMN_GAP = 110;
const ROW_GAP = 40;
const MARGIN_X = 80;
const MARGIN_Y = 90;

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
 * Assigns canvas positions to modules that have none. Modules are ranked by
 * their distance to an OUTPUT (walking connections backwards) and laid out in
 * columns, so signal flows left to right like a patch diagram.
 */
export function layoutGraph(graph: Graph): Graph {
  const needsLayout = graph.modules.some((m) => m.x === undefined || m.y === undefined);
  if (!needsLayout) return graph;

  const rank = new Map<string, number>();
  const upstream = new Map<string, string[]>();
  for (const conn of graph.connections) {
    if (!upstream.has(conn.to.id)) upstream.set(conn.to.id, []);
    upstream.get(conn.to.id)!.push(conn.from.id);
  }

  const queue: string[] = [];
  for (const m of graph.modules) {
    if (m.kind === ModuleKind.OUTPUT) {
      rank.set(m.id, 0);
      queue.push(m.id);
    }
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    const r = rank.get(id)!;
    for (const source of upstream.get(id) ?? []) {
      if (!rank.has(source)) {
        rank.set(source, r + 1);
        queue.push(source);
      }
    }
  }

  let maxRank = 0;
  for (const r of rank.values()) maxRank = Math.max(maxRank, r);
  const orphanRank = maxRank + 1;

  const columns = new Map<number, ModuleDefinition[]>();
  for (const m of graph.modules) {
    const r = rank.get(m.id) ?? orphanRank;
    const col = orphanRank - r;
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col)!.push(m);
  }

  const positioned = new Map<string, { x: number; y: number }>();
  for (const [col, modules] of columns) {
    let y = MARGIN_Y;
    for (const m of modules) {
      positioned.set(m.id, { x: MARGIN_X + col * (NODE_WIDTH + COLUMN_GAP), y });
      y += nodeHeight(m) + ROW_GAP;
    }
  }

  return {
    ...graph,
    modules: graph.modules.map((m) =>
      m.x === undefined || m.y === undefined ? { ...m, ...positioned.get(m.id) } : m
    ),
  };
}
