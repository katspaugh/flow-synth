import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Graph, ModuleParams } from '../types/graph';
import type { ScopeDataMessage, SetParamMessage, WorkletMessage } from '../types/messages';
import { toEngineGraph } from '../model/graph';

export type StatusType = 'info' | 'success' | 'error';

export type EngineStatus = { message: string; type: StatusType };

/**
 * Drives the AudioWorklet. The engine rebuilds its module graph whenever the
 * audio-relevant part of the patch changes; moving nodes around the canvas
 * never touches it.
 */
export function useAudioEngine(graph: Graph) {
  const audioContext = useRef<AudioContext | null>(null);
  const modularNode = useRef<AudioWorkletNode | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<EngineStatus>({
    message: 'Ready. Press play to start audio.',
    type: 'info',
  });
  const [scopeData, setScopeData] = useState<Record<string, number[]>>({});

  const engineGraph = useMemo(() => toEngineGraph(graph), [graph]);
  const latestGraph = useRef(engineGraph);
  latestGraph.current = engineGraph;
  // Params the engine currently holds, per module id. Used to diff parameter
  // edits into cheap setParam messages instead of a full graph rebuild.
  const sentParams = useRef<Map<string, ModuleParams | undefined>>(new Map());

  const postGraph = useCallback(() => {
    const node = modularNode.current;
    if (!node) return;
    node.port.postMessage({ type: 'loadGraph', graph: latestGraph.current });
    sentParams.current = new Map(latestGraph.current.modules.map((m) => [m.id, m.params]));
  }, []);

  // Anything the worklet has to rebuild for: the set of modules and the cables.
  const structureKey = useMemo(
    () =>
      JSON.stringify({
        modules: engineGraph.modules.map(({ id, kind }) => ({ id, kind })),
        connections: engineGraph.connections,
      }),
    [engineGraph]
  );
  const lastStructureKey = useRef(structureKey);

  useEffect(() => {
    const node = modularNode.current;
    if (!node) return;

    if (structureKey !== lastStructureKey.current) {
      lastStructureKey.current = structureKey;
      postGraph();
      return;
    }

    for (const module of engineGraph.modules) {
      const previous = sentParams.current.get(module.id);
      if (previous === module.params) continue;
      for (const [param, value] of Object.entries(module.params ?? {})) {
        if (value === undefined) continue;
        if ((previous as Record<string, unknown> | undefined)?.[param] === value) continue;
        const message: SetParamMessage = { type: 'setParam', id: module.id, param, value };
        node.port.postMessage(message);
      }
      sentParams.current.set(module.id, module.params);
    }
  }, [engineGraph, structureKey, postGraph]);

  const start = useCallback(async () => {
    try {
      setStatus({ message: 'Initializing audio context...', type: 'info' });

      if (!audioContext.current) {
        audioContext.current = new AudioContext();
      }
      const ctx = audioContext.current;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      setStatus({ message: 'Loading AudioWorklet module...', type: 'info' });

      const workletPath = import.meta.env.DEV
        ? '/src/worklet/index.ts'
        : new URL(/* @vite-ignore */ 'modular-processor.js', import.meta.url).href;

      await ctx.audioWorklet.addModule(workletPath);

      const node = new AudioWorkletNode(ctx, 'modular-processor', {
        outputChannelCount: [2],
      });

      node.port.onmessage = (e: MessageEvent<WorkletMessage>) => {
        if (e.data.type === 'graphLoaded') {
          setStatus({ message: 'Audio running.', type: 'success' });
        } else if (e.data.type === 'error') {
          setStatus({ message: `Error: ${e.data.message}`, type: 'error' });
        } else if (e.data.type === 'scopeData') {
          const data = e.data as ScopeDataMessage;
          setScopeData((prev) => {
            const next = { ...prev };
            for (const frame of data.frames) {
              next[frame.id] = frame.samples;
            }
            return next;
          });
        }
      };

      node.connect(ctx.destination);
      modularNode.current = node;

      setStatus({ message: 'Loading graph...', type: 'info' });
      lastStructureKey.current = structureKey;
      postGraph();

      if (ctx.state !== 'running') {
        await ctx.resume();
      }
      setIsRunning(true);
    } catch (err) {
      console.error('Audio initialization error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus({ message: `Error: ${message}`, type: 'error' });
    }
  }, [postGraph, structureKey]);

  const stop = useCallback(() => {
    if (modularNode.current) {
      modularNode.current.port.onmessage = null;
      modularNode.current.disconnect();
      modularNode.current = null;
    }
    void audioContext.current?.suspend();
    setScopeData({});
    setIsRunning(false);
    setStatus({ message: 'Audio stopped.', type: 'info' });
  }, []);

  const toggle = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      void start();
    }
  }, [isRunning, start, stop]);

  return { isRunning, status, setStatus, scopeData, start, stop, toggle, reload: postGraph };
}
