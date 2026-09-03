import { ModuleKind } from '../types/graph';
import type { Connection, Graph, ModuleDefinition, ModuleParams, PortRef } from '../types/graph';
import { createEmojiId } from '../utils/emojiIds';
import { INPUT_PORTS, OUTPUT_PORTS } from './ports';
import { DEFAULT_PARAMS } from './params';

// Pure operations on the patch graph. The React state hook wraps these.

export const EMPTY_GRAPH: Graph = { modules: [], connections: [] };

const samePort = (a: PortRef, b: PortRef) => a.id === b.id && a.port === b.port;

export const sameConnection = (a: Connection, b: Connection) =>
  samePort(a.from, b.from) && samePort(a.to, b.to);

export function findModule(graph: Graph, id: string): ModuleDefinition | undefined {
  return graph.modules.find((m) => m.id === id);
}

export function createModule(
  graph: Graph,
  kind: ModuleKind,
  position: { x: number; y: number },
  params?: ModuleParams
): ModuleDefinition {
  const existingIds = new Set(graph.modules.map((m) => m.id));
  return {
    id: createEmojiId(kind.toLowerCase(), existingIds),
    kind,
    params: params ?? DEFAULT_PARAMS[kind],
    x: Math.round(position.x),
    y: Math.round(position.y),
  };
}

export function insertModule(graph: Graph, module: ModuleDefinition): Graph {
  if (graph.modules.some((m) => m.id === module.id)) return graph;
  return { ...graph, modules: [...graph.modules, module] };
}

const BYPASS_INPUTS: Partial<Record<ModuleKind, string[]>> = {
  [ModuleKind.VCA]: ['in'],
  [ModuleKind.PAN]: ['in'],
  [ModuleKind.DELAY]: ['in'],
  [ModuleKind.RECTIFIER]: ['in'],
  [ModuleKind.SLEW]: ['in'],
};

/**
 * Removes a module. If it sat between a signal source and the output, the
 * source is re-routed straight to the output so the patch keeps sounding.
 */
export function deleteModule(graph: Graph, id: string): Graph {
  const module = findModule(graph, id);
  if (!module) return graph;

  const outputIds = new Set(
    graph.modules.filter((m) => m.kind === ModuleKind.OUTPUT).map((m) => m.id)
  );
  const outgoingToOutput = graph.connections.filter(
    (conn) => conn.from.id === id && outputIds.has(conn.to.id)
  );
  const bypassPorts = BYPASS_INPUTS[module.kind] ?? [];
  const bypassSources = graph.connections.filter(
    (conn) => conn.to.id === id && bypassPorts.includes(conn.to.port)
  );

  const remaining = graph.connections.filter((conn) => conn.from.id !== id && conn.to.id !== id);
  for (const outConn of outgoingToOutput) {
    for (const inConn of bypassSources) {
      const candidate: Connection = { from: { ...inConn.from }, to: { ...outConn.to } };
      if (!remaining.some((c) => sameConnection(c, candidate))) {
        remaining.push(candidate);
      }
    }
  }

  return {
    ...graph,
    modules: graph.modules.filter((m) => m.id !== id),
    connections: remaining,
  };
}

export function updateModule(graph: Graph, id: string, updates: Partial<ModuleDefinition>): Graph {
  return {
    ...graph,
    modules: graph.modules.map((m) => (m.id === id ? { ...m, ...updates } : m)),
  };
}

export function updateModuleParam(
  graph: Graph,
  id: string,
  param: string,
  value: number | string
): Graph {
  return {
    ...graph,
    modules: graph.modules.map((m) =>
      m.id === id ? { ...m, params: { ...m.params, [param]: value } } : m
    ),
  };
}

export function isValidConnection(graph: Graph, from: PortRef, to: PortRef): boolean {
  const source = findModule(graph, from.id);
  const target = findModule(graph, to.id);
  if (!source || !target) return false;
  return (
    OUTPUT_PORTS[source.kind].includes(from.port) && INPUT_PORTS[target.kind].includes(to.port)
  );
}

export function connect(graph: Graph, from: PortRef, to: PortRef): Graph {
  const candidate: Connection = { from: { ...from }, to: { ...to } };
  if (!isValidConnection(graph, from, to)) return graph;
  if (graph.connections.some((c) => sameConnection(c, candidate))) return graph;
  return { ...graph, connections: [...graph.connections, candidate] };
}

export function disconnect(graph: Graph, from: PortRef, to: PortRef): Graph {
  const target: Connection = { from, to };
  return {
    ...graph,
    connections: graph.connections.filter((c) => !sameConnection(c, target)),
  };
}

/** The part of the graph the audio engine cares about (no canvas positions). */
export function toEngineGraph(graph: Graph): Graph {
  return {
    modules: graph.modules.map(({ id, kind, params }) => ({ id, kind, params })),
    connections: graph.connections,
  };
}
