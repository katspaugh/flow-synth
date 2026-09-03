export enum ModuleKind {
  VCO = 'VCO',
  VCA = 'VCA',
  LFO = 'LFO',
  SLEW = 'SLEW',
  PAN = 'PAN',
  DELAY = 'DELAY',
  RECTIFIER = 'RECTIFIER',
  ATTEN = 'ATTEN',
  OUTPUT = 'OUTPUT',
}

export interface ModuleParams {
  baseFreq?: number;
  freq?: number;
  fmSensitivity?: number;
  vcoShape?: 'sine' | 'tri' | 'saw' | 'square';
  shape?: 'sine' | 'tri' | 'saw' | 'square';
  riseTime?: number;
  fallTime?: number;
  pan?: number;
  delayTime?: number;
  feedback?: number;
  mix?: number;
  gain?: number;
  offset?: number;
  drive?: number;
}

export interface ModuleDefinition {
  id: string;
  kind: ModuleKind;
  params?: ModuleParams;
  // Canvas position; ignored by the audio engine.
  x?: number;
  y?: number;
}

export interface PortRef {
  id: string;
  port: string;
}

export interface Connection {
  from: PortRef;
  to: PortRef;
}

export interface Graph {
  modules: ModuleDefinition[];
  connections: Connection[];
}
