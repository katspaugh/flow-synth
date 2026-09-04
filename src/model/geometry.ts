import type { ModuleDefinition } from '../types/graph';
import { INPUT_PORTS, OUTPUT_PORTS } from './ports';
import { paramCount } from './params';

// All node geometry is derived from the model so edges can be drawn without
// measuring the DOM. The CSS in styles.css must agree with these numbers.
export const NODE_WIDTH = 200;
export const HEADER_HEIGHT = 36;
export const PORT_ROW_HEIGHT = 24;
export const PARAM_ROW_HEIGHT = 40;
export const NODE_PADDING_BOTTOM = 8;

export type Point = { x: number; y: number };

export type PortDirection = 'in' | 'out';

export function portRowCount(module: ModuleDefinition): number {
  return Math.max(INPUT_PORTS[module.kind].length, OUTPUT_PORTS[module.kind].length);
}

export function nodeHeight(module: ModuleDefinition): number {
  const ports = portRowCount(module) * PORT_ROW_HEIGHT;
  const params = paramCount(module.kind) * PARAM_ROW_HEIGHT;
  return HEADER_HEIGHT + ports + params + NODE_PADDING_BOTTOM;
}

export function nodeCenter(module: ModuleDefinition): Point {
  return {
    x: (module.x ?? 0) + NODE_WIDTH / 2,
    y: (module.y ?? 0) + nodeHeight(module) / 2,
  };
}

/** Absolute canvas position of a port's connection anchor. */
export function portAnchor(
  module: ModuleDefinition,
  direction: PortDirection,
  port: string
): Point | null {
  const ports = direction === 'in' ? INPUT_PORTS[module.kind] : OUTPUT_PORTS[module.kind];
  const index = ports.indexOf(port);
  if (index === -1) return null;
  return {
    x: (module.x ?? 0) + (direction === 'in' ? 0 : NODE_WIDTH),
    y: (module.y ?? 0) + HEADER_HEIGHT + index * PORT_ROW_HEIGHT + PORT_ROW_HEIGHT / 2,
  };
}

export function nodeBounds(module: ModuleDefinition) {
  const x = module.x ?? 0;
  const y = module.y ?? 0;
  return { x1: x, y1: y, x2: x + NODE_WIDTH, y2: y + nodeHeight(module) };
}
