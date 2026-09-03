import type { Graph } from './graph';

export interface LoadGraphMessage {
  type: 'loadGraph';
  graph: Graph;
}

export interface SetParamMessage {
  type: 'setParam';
  id: string;
  param: string;
  value: number | string;
}

export interface GraphLoadedMessage {
  type: 'graphLoaded';
  success: true;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface ScopeFrame {
  id: string;
  samples: number[];
}

export interface ScopeDataMessage {
  type: 'scopeData';
  frames: ScopeFrame[];
}

export type WorkletMessage =
  LoadGraphMessage | SetParamMessage | GraphLoadedMessage | ErrorMessage | ScopeDataMessage;
