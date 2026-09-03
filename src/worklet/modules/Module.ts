import type { ModuleParams } from '../../types/graph';

export interface ConnectionSource {
  buffer: Float32Array;
  sourceId: string;
  sourcePort: string;
}

export abstract class Module {
  id: string;
  kind: string;
  params: ModuleParams;
  inputs: Record<string, Float32Array>;
  outputs: Record<string, Float32Array>;
  inputConnections: Record<string, ConnectionSource[]>;
  scratchBuffers: Map<string, Float32Array>;

  constructor(id: string, kind: string, params: ModuleParams = {}) {
    this.id = id;
    this.kind = kind;
    this.params = params;
    this.inputs = {};
    this.outputs = {};
    this.inputConnections = {};
    this.scratchBuffers = new Map();
  }

  abstract process(): void;

  getScratchBuffer(): Float32Array {
    if (!this.scratchBuffers.has('temp')) {
      this.scratchBuffers.set('temp', new Float32Array(128));
    }
    return this.scratchBuffers.get('temp')!;
  }
}
