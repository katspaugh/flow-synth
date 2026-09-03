import { useCallback, useMemo, useState } from 'react';
import type { Graph, ModuleDefinition, ModuleKind, PortRef } from '../../types/graph';
import { DraggableNode } from './DraggableNode';
import { Edge } from './Edge';
import { SelectionBox } from './SelectionBox';
import { ModuleCard, portKey } from '../ModuleCard';
import { ModulePicker } from '../ModulePicker';
import { useMousePosition } from '../../hooks/useMousePosition';
import { useOnKey } from '../../hooks/useOnKey';
import { nodeBounds, portAnchor, type Point } from '../../model/geometry';
import { INPUT_PORTS, MODULE_COLORS, OUTPUT_PORTS } from '../../model/ports';
import { findModule } from '../../model/graph';
import type { PortSelection } from './Port';

type BoardProps = {
  graph: Graph;
  scopeData: Record<string, number[]>;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onModuleCreate: (kind: ModuleKind, position: Point) => ModuleDefinition;
  onModuleDelete: (id: string) => void;
  onModuleUpdate: (id: string, updates: Partial<ModuleDefinition>) => void;
  onParamChange: (id: string, param: string, value: number | string) => void;
  onConnect: (from: PortRef, to: PortRef) => void;
  onDisconnect: (from: PortRef, to: PortRef) => void;
};

const WIDTH = 4000;
const HEIGHT = 4000;

const ZOOM_STEP = 0.1;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2;

const isEditingField = () =>
  !!document.activeElement?.closest('input, select, textarea, [contenteditable="true"]');

export function Board(props: BoardProps) {
  const {
    graph,
    scopeData,
    zoom,
    onZoomChange,
    onModuleCreate,
    onModuleDelete,
    onModuleUpdate,
    onParamChange,
    onConnect,
    onDisconnect,
  } = props;
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [pendingPort, setPendingPort] = useState<PortSelection | null>(null);
  const [picker, setPicker] = useState<Point | null>(null);
  const mousePosition = useMousePosition(zoom);

  const modulesById = useMemo(() => new Map(graph.modules.map((m) => [m.id, m])), [graph.modules]);

  const connectedPorts = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const mark = (id: string, key: string) => {
      if (!map.has(id)) map.set(id, new Set());
      map.get(id)!.add(key);
    };
    for (const conn of graph.connections) {
      mark(conn.from.id, portKey('out', conn.from.port));
      mark(conn.to.id, portKey('in', conn.to.port));
    }
    return map;
  }, [graph.connections]);

  const EMPTY_PORTS = useMemo(() => new Set<string>(), []);

  const updateSelection = useCallback((ids: string[]) => {
    setSelectedNodes(ids);
  }, []);

  const completeConnection = useCallback(
    (a: PortSelection, b: PortSelection) => {
      const [out, inp] = a.direction === 'out' ? [a, b] : [b, a];
      onConnect({ id: out.id, port: out.port }, { id: inp.id, port: inp.port });
      setPendingPort(null);
    },
    [onConnect]
  );

  const onPortClick = useCallback(
    (selection: PortSelection) => {
      setPicker(null);
      if (!pendingPort || pendingPort.direction === selection.direction) {
        setPendingPort(selection);
        return;
      }
      completeConnection(pendingPort, selection);
    },
    [pendingPort, completeConnection]
  );

  // Clicking a node body while a cable is pending patches it into the node's
  // first matching port, mirroring how SpaceNotes connects card to card.
  const onNodeClick = useCallback(
    (id: string) => {
      setPicker(null);
      if (pendingPort) {
        const module = modulesById.get(id);
        if (!module) return;
        const ports =
          pendingPort.direction === 'out' ? INPUT_PORTS[module.kind] : OUTPUT_PORTS[module.kind];
        if (ports.length > 0 && id !== pendingPort.id) {
          const direction = pendingPort.direction === 'out' ? 'in' : 'out';
          completeConnection(pendingPort, { id, direction, port: ports[0] });
        } else {
          setPendingPort(null);
        }
        return;
      }
      updateSelection([id]);
    },
    [pendingPort, modulesById, completeConnection, updateSelection]
  );

  const onBoardClick = useCallback(() => {
    updateSelection([]);
    setPendingPort(null);
    setPicker(null);
  }, [updateSelection]);

  const onBoardDblClick = useCallback(() => {
    setPendingPort(null);
    setPicker({ x: mousePosition.x, y: mousePosition.y });
  }, [mousePosition.x, mousePosition.y]);

  const onPick = useCallback(
    (kind: ModuleKind) => {
      if (!picker) return;
      const module = onModuleCreate(kind, { x: picker.x - 20, y: picker.y - 18 });
      setPicker(null);
      updateSelection([module.id]);
    },
    [picker, onModuleCreate, updateSelection]
  );

  const onNodeUpdate = useCallback(
    (id: string, position: { x: number; y: number }) => {
      if (selectedNodes.length > 1 && selectedNodes.includes(id)) {
        const node = modulesById.get(id);
        if (!node) return;
        const dx = position.x - (node.x ?? 0);
        const dy = position.y - (node.y ?? 0);

        selectedNodes.forEach((nodeId) => {
          const other = modulesById.get(nodeId);
          if (!other) return;
          onModuleUpdate(nodeId, {
            x: Math.round((other.x ?? 0) + dx),
            y: Math.round((other.y ?? 0) + dy),
          });
        });
        return;
      }
      onModuleUpdate(id, position);
    },
    [modulesById, onModuleUpdate, selectedNodes]
  );

  const onSelectionChange = useCallback(
    (box: { x1: number; y1: number; x2: number; y2: number }) => {
      const ids = graph.modules
        .filter((node) => {
          const b = nodeBounds(node);
          return b.x1 <= box.x2 && b.x2 >= box.x1 && b.y1 <= box.y2 && b.y2 >= box.y1;
        })
        .map((node) => node.id);
      updateSelection(ids);
    },
    [graph.modules, updateSelection]
  );

  const deleteSelectedNodes = useCallback(() => {
    if (isEditingField() || selectedNodes.length === 0) return;
    selectedNodes.forEach(onModuleDelete);
    setSelectedNodes([]);
  }, [selectedNodes, onModuleDelete]);

  const onEscape = useCallback(() => {
    if (pendingPort) {
      setPendingPort(null);
      return;
    }
    if (picker) {
      setPicker(null);
      return;
    }
    updateSelection([]);
  }, [pendingPort, picker, updateSelection]);

  useOnKey('Escape', onEscape);
  useOnKey('Delete', deleteSelectedNodes);
  useOnKey('Backspace', deleteSelectedNodes);

  const edges = useMemo(() => {
    return graph.connections.flatMap((conn) => {
      const from = findModule(graph, conn.from.id);
      const to = findModule(graph, conn.to.id);
      if (!from || !to) return [];
      const start = portAnchor(from, 'out', conn.from.port);
      const end = portAnchor(to, 'in', conn.to.port);
      if (!start || !end) return [];
      return [
        {
          key: `${conn.from.id}.${conn.from.port}->${conn.to.id}.${conn.to.port}`,
          start,
          end,
          color: MODULE_COLORS[from.kind],
          onClick: () => onDisconnect(conn.from, conn.to),
        },
      ];
    });
  }, [graph, onDisconnect]);

  const tempEdge = useMemo(() => {
    if (!pendingPort) return null;
    const module = modulesById.get(pendingPort.id);
    if (!module) return null;
    const anchor = portAnchor(module, pendingPort.direction, pendingPort.port);
    if (!anchor) return null;
    return pendingPort.direction === 'out'
      ? { start: anchor, end: mousePosition, color: MODULE_COLORS[module.kind] }
      : { start: mousePosition, end: anchor, color: MODULE_COLORS[module.kind] };
  }, [pendingPort, modulesById, mousePosition]);

  const sx = useMemo(
    () => ({
      width: `${WIDTH * zoom}px`,
      height: `${HEIGHT * zoom}px`,
    }),
    [zoom]
  );

  const canvasSx = useMemo(
    () => ({
      width: `${WIDTH}px`,
      height: `${HEIGHT}px`,
      transform: `scale(${zoom})`,
      transformOrigin: '0 0',
    }),
    [zoom]
  );

  const onZoomIn = useCallback(
    () => onZoomChange(Math.min(ZOOM_MAX, zoom + ZOOM_STEP)),
    [zoom, onZoomChange]
  );
  const onZoomOut = useCallback(
    () => onZoomChange(Math.max(ZOOM_MIN, zoom - ZOOM_STEP)),
    [zoom, onZoomChange]
  );
  const onZoomReset = useCallback(() => onZoomChange(1), [onZoomChange]);

  const stopPropagationClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className={`Board${pendingPort ? ' Board_patching' : ''}`}
      style={sx}
      onClick={onBoardClick}
      onDoubleClick={onBoardDblClick}
    >
      <div className="BoardCanvas" style={canvasSx}>
        {graph.modules.map((module) => (
          <DraggableNode
            key={module.id}
            id={module.id}
            x={module.x ?? 0}
            y={module.y ?? 0}
            zoom={zoom}
            selected={selectedNodes.includes(module.id)}
            onNodeUpdate={onNodeUpdate}
            onClick={onNodeClick}
          >
            <ModuleCard
              module={module}
              scope={scopeData[module.id]}
              connectedPorts={connectedPorts.get(module.id) ?? EMPTY_PORTS}
              activePort={pendingPort}
              onPortClick={onPortClick}
              onParamChange={onParamChange}
              onDelete={onModuleDelete}
            />
          </DraggableNode>
        ))}

        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          {edges.map((edge) => (
            <Edge
              key={edge.key}
              from={edge.start}
              to={edge.end}
              color={edge.color}
              onClick={edge.onClick}
            />
          ))}
          {tempEdge && (
            <Edge from={tempEdge.start} to={tempEdge.end} color={tempEdge.color} temporary />
          )}
        </svg>

        <SelectionBox zoom={zoom} onChange={onSelectionChange} />

        {picker && <ModulePicker position={picker} onPick={onPick} />}
      </div>

      <div
        className="ZoomControls"
        onClick={stopPropagationClick}
        onDoubleClick={stopPropagationClick}
      >
        <button type="button" className="ZoomBtn" onClick={onZoomOut} title="Zoom out">
          −
        </button>
        <button type="button" className="ZoomLevel" onClick={onZoomReset} title="Reset zoom">
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className="ZoomBtn" onClick={onZoomIn} title="Zoom in">
          +
        </button>
      </div>
    </div>
  );
}
