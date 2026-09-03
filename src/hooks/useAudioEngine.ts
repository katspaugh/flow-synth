import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Graph } from '../types/graph';
import type { ScopeDataMessage, WorkletMessage } from '../types/messages';
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
  const engineKey = useMemo(() => JSON.stringify(engineGraph), [engineGraph]);
  const latestGraph = useRef(engineGraph);
  latestGraph.current = engineGraph;

  const postGraph = useCallback(() => {
    modularNode.current?.port.postMessage({ type: 'loadGraph', graph: latestGraph.current });
  }, []);

  useEffect(() => {
    if (!modularNode.current) return;
    // Slider drags fire many updates; coalesce them so the engine isn't
    // rebuilt on every pixel.
    const timer = setTimeout(postGraph, 40);
    return () => clearTimeout(timer);
  }, [engineKey, postGraph]);

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
  }, [postGraph]);

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
