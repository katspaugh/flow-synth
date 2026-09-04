import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Graph, ModuleKind } from './types/graph';
import { Board } from './components/board/Board';
import { Toolbar } from './components/Toolbar';
import { useGraphState } from './hooks/useGraphState';
import { useAudioEngine } from './hooks/useAudioEngine';
import { NODE_WIDTH } from './model/geometry';
import { deserializeGraphFromHash, serializeGraphToHash } from './model/hash';
import { freePosition } from './model/layout';
import { generateBinauralGraph, generateRandomGraph } from './utils/randomGraph';
import { PRESETS, presetGraph } from './presets';

const HASH_SYNC_DELAY = 300;

const initialGraph = (): Graph =>
  deserializeGraphFromHash(window.location.hash.slice(1)) ?? generateRandomGraph();

export function App() {
  const state = useGraphState(useMemo(initialGraph, []));
  const engine = useAudioEngine(state.graph);
  const [zoom, setZoom] = useState(1);
  const [binauralEnabled, setBinauralEnabled] = useState(false);

  // Keep the URL in sync so a reload (or a copied address bar) restores the patch.
  useEffect(() => {
    const timer = setTimeout(() => {
      window.history.replaceState(null, '', `#${serializeGraphToHash(state.graph)}`);
    }, HASH_SYNC_DELAY);
    return () => clearTimeout(timer);
  }, [state.graph]);

  const onAddModule = useCallback(
    (kind: ModuleKind) => {
      const viewportCenter = {
        x: (window.scrollX + window.innerWidth / 2) / zoom - NODE_WIDTH / 2,
        y: (window.scrollY + window.innerHeight / 2) / zoom - 60,
      };
      state.onModuleCreate(kind, freePosition(state.graph, viewportCenter));
    },
    [state, zoom]
  );

  const onRandomize = useCallback(() => {
    state.loadGraph(binauralEnabled ? generateBinauralGraph() : generateRandomGraph());
    if (engine.isRunning) {
      engine.setStatus({ message: 'Randomized patch.', type: 'info' });
    }
  }, [state, binauralEnabled, engine]);

  const onLoadPreset = useCallback(
    (name: string) => {
      const preset = PRESETS.find((p) => p.name === name);
      if (!preset) return;
      state.loadGraph(presetGraph(preset));
      engine.setStatus({ message: `${preset.name}: ${preset.description}`, type: 'info' });
    },
    [state, engine]
  );

  const onShare = useCallback(async () => {
    const hash = serializeGraphToHash(state.graph);
    const shareUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
    window.history.replaceState(null, '', `#${hash}`);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        engine.setStatus({ message: 'Share URL copied to clipboard.', type: 'success' });
        return;
      }
    } catch {
      // Clipboard unavailable; the address bar already holds the link.
    }
    engine.setStatus({ message: 'Share URL ready in the address bar.', type: 'info' });
  }, [state.graph, engine]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (engine.isRunning) {
          engine.reload();
          engine.setStatus({ message: 'Graph reloaded.', type: 'info' });
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [engine]);

  return (
    <>
      <Board
        graph={state.graph}
        scopeData={engine.scopeData}
        zoom={zoom}
        onZoomChange={setZoom}
        onModuleCreate={state.onModuleCreate}
        onModuleDelete={state.onModuleDelete}
        onModuleUpdate={state.onModuleUpdate}
        onParamChange={state.onParamChange}
        onConnect={state.onConnect}
        onDisconnect={state.onDisconnect}
      />
      <Toolbar
        isRunning={engine.isRunning}
        status={engine.status}
        binauralEnabled={binauralEnabled}
        onToggleAudio={engine.toggle}
        onAddModule={onAddModule}
        onRandomize={onRandomize}
        onToggleBinaural={setBinauralEnabled}
        onLoadPreset={onLoadPreset}
        onShare={onShare}
      />
    </>
  );
}
