import { useCallback, useState } from 'react';
import type { Graph, ModuleDefinition, ModuleKind, PortRef } from '../types/graph';
import * as model from '../model/graph';
import { layoutGraph } from '../model/layout';

/**
 * Owns the patch graph (the model) and exposes the actions the views can
 * dispatch. Every action goes through a pure function in model/graph.ts.
 */
export function useGraphState(initialGraph: Graph) {
  const [graph, setGraph] = useState<Graph>(() => layoutGraph(initialGraph));

  const onModuleCreate = useCallback(
    (kind: ModuleKind, position: { x: number; y: number }): ModuleDefinition => {
      const module = model.createModule(graph, kind, position);
      setGraph((g) => model.insertModule(g, module));
      return module;
    },
    [graph]
  );

  const onModuleDelete = useCallback((id: string) => {
    setGraph((g) => model.deleteModule(g, id));
  }, []);

  const onModuleUpdate = useCallback((id: string, updates: Partial<ModuleDefinition>) => {
    setGraph((g) => model.updateModule(g, id, updates));
  }, []);

  const onParamChange = useCallback((id: string, param: string, value: number | string) => {
    setGraph((g) => model.updateModuleParam(g, id, param, value));
  }, []);

  const onConnect = useCallback((from: PortRef, to: PortRef) => {
    setGraph((g) => model.connect(g, from, to));
  }, []);

  const onDisconnect = useCallback((from: PortRef, to: PortRef) => {
    setGraph((g) => model.disconnect(g, from, to));
  }, []);

  const loadGraph = useCallback((next: Graph) => {
    setGraph(layoutGraph(next));
  }, []);

  return {
    graph,
    onModuleCreate,
    onModuleDelete,
    onModuleUpdate,
    onParamChange,
    onConnect,
    onDisconnect,
    loadGraph,
  };
}
