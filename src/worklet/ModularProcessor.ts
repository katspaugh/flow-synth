import type { Graph, ModuleDefinition, Connection, ModuleKind } from '../types/graph';
import type { WorkletMessage } from '../types/messages';
import { Module } from './modules/Module';
import { VCO } from './modules/VCO';
import { VCA } from './modules/VCA';
import { LFO } from './modules/LFO';
import { Slew } from './modules/Slew';
import { Pan } from './modules/Pan';
import { Delay } from './modules/Delay';
import { Rectifier } from './modules/Rectifier';
import { Atten } from './modules/Atten';
import { OutputModule } from './modules/OutputModule';

export class ModularProcessor extends AudioWorkletProcessor {
  private modules: Map<string, Module>;
  private sortedModules: Module[];
  private outputModule: OutputModule | null;
  private scopeTick: number;
  private readonly scopeStride: number;

  constructor() {
    super();
    this.modules = new Map();
    this.sortedModules = [];
    this.outputModule = null;
    this.scopeTick = 0;
    this.scopeStride = 12;

    this.port.onmessage = (e) => this.handleMsg(e.data as WorkletMessage);
  }

  handleMsg(msg: WorkletMessage): void {
    if (msg.type === 'setParam') {
      this.modules.get(msg.id)?.setParam(msg.param, msg.value);
      return;
    }
    if (msg.type === 'loadGraph') {
      try {
        this.loadGraph(msg.graph);
        this.port.postMessage({ type: 'graphLoaded', success: true });
      } catch (err) {
        this.port.postMessage({
          type: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  loadGraph(graph: Graph): void {
    this.modules.clear();
    this.sortedModules = [];
    this.outputModule = null;

    for (const modDef of graph.modules) {
      const module = this.createModule(modDef);
      this.modules.set(modDef.id, module);

      if (modDef.kind === 'OUTPUT') {
        this.outputModule = module as OutputModule;
      }
    }

    const connections = graph.connections || [];
    this.rebuild(connections);
  }

  createModule(def: ModuleDefinition): Module {
    const moduleClasses: Record<
      ModuleKind,
      new (id: string, kind: string, params: object) => Module
    > = {
      VCO,
      VCA,
      LFO,
      SLEW: Slew,
      PAN: Pan,
      DELAY: Delay,
      RECTIFIER: Rectifier,
      ATTEN: Atten,
      OUTPUT: OutputModule,
    };

    const ModuleClass = moduleClasses[def.kind];
    if (!ModuleClass) {
      throw new Error(`Unknown module kind: ${def.kind}`);
    }

    return new ModuleClass(def.id, def.kind, def.params || {});
  }

  rebuild(connections: Connection[]): void {
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    // Initialize all modules
    for (const [id, module] of this.modules) {
      inDegree.set(id, 0);
      adjacency.set(id, []);

      // Initialize output buffers
      const outputPorts = this.getOutputPorts(module.kind);
      for (const port of outputPorts) {
        module.outputs[port] = new Float32Array(128);
      }

      // Initialize input buffers and connection tracking
      const inputPorts = this.getInputPorts(module.kind);
      module.inputs = {};
      module.inputConnections = {};
      for (const port of inputPorts) {
        module.inputs[port] = new Float32Array(128);
        module.inputConnections[port] = [];
      }
    }

    // Process connections
    for (const conn of connections) {
      const fromModule = this.modules.get(conn.from.id);
      const toModule = this.modules.get(conn.to.id);

      if (!fromModule || !toModule) {
        throw new Error(`Invalid connection: ${conn.from.id} -> ${conn.to.id}`);
      }

      // Track dependency for topological sort
      adjacency.get(conn.from.id)!.push(conn.to.id);
      inDegree.set(conn.to.id, inDegree.get(conn.to.id)! + 1);

      // Track connection: store reference to source output buffer
      toModule.inputConnections[conn.to.port].push({
        buffer: fromModule.outputs[conn.from.port],
        sourceId: conn.from.id,
        sourcePort: conn.from.port,
      });
    }

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const sorted: string[] = [];

    // Start with modules that have no inputs
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const id = queue.shift()!;
      sorted.push(id);

      // Process all modules that depend on this one
      for (const nextId of adjacency.get(id)!) {
        const newDegree = inDegree.get(nextId)! - 1;
        inDegree.set(nextId, newDegree);

        if (newDegree === 0) {
          queue.push(nextId);
        }
      }
    }

    // Handle circular patching (feedback loops)
    // Any modules not in sorted are part of cycles - process them after sorted ones
    // Feedback connections naturally have a 1-block delay (~2.7ms at 48kHz)
    const unsorted: string[] = [];
    for (const [id] of this.modules) {
      if (!sorted.includes(id)) {
        unsorted.push(id);
      }
    }

    // Store sorted module references (acyclic first, then cycles)
    this.sortedModules = [...sorted, ...unsorted].map((id) => this.modules.get(id)!);
  }

  getInputPorts(kind: string): string[] {
    const ports: Record<string, string[]> = {
      VCO: ['pitch', 'fm'],
      VCA: ['in', 'cv'],
      LFO: ['rate'],
      SLEW: ['in'],
      PAN: ['in', 'pan'],
      DELAY: ['in', 'time', 'feedback', 'mix'],
      RECTIFIER: ['in'],
      ATTEN: ['in'],
      OUTPUT: ['in', 'inL', 'inR'],
    };
    return ports[kind] || [];
  }

  getOutputPorts(kind: string): string[] {
    const ports: Record<string, string[]> = {
      VCO: ['out'],
      VCA: ['out'],
      LFO: ['out'],
      SLEW: ['out'],
      PAN: ['outL', 'outR'],
      DELAY: ['out'],
      RECTIFIER: ['out'],
      ATTEN: ['out'],
      OUTPUT: ['out'],
    };
    return ports[kind] || [];
  }

  private getScopeSamples(module: Module): number[] | null {
    const outputPorts = this.getOutputPorts(module.kind);
    const out = outputPorts.includes('out') ? module.outputs.out : undefined;
    const outL = outputPorts.includes('outL') ? module.outputs.outL : undefined;
    const outR = outputPorts.includes('outR') ? module.outputs.outR : undefined;

    if (out) {
      return this.downsample(out);
    }

    if (outL && outR) {
      const mixed = new Float32Array(outL.length);
      for (let i = 0; i < outL.length; i++) {
        mixed[i] = (outL[i] + outR[i]) * 0.5;
      }
      return this.downsample(mixed);
    }

    if (outL) return this.downsample(outL);
    if (outR) return this.downsample(outR);
    return null;
  }

  private downsample(buffer: Float32Array): number[] {
    const target = 32;
    const step = Math.max(1, Math.floor(buffer.length / target));
    const samples: number[] = [];
    for (let i = 0; i < target; i++) {
      samples.push(buffer[i * step]);
    }
    return samples;
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const output = outputs[0];

    // If no graph loaded, output silence
    if (this.sortedModules.length === 0) {
      if (output && output[0]) {
        output[0].fill(0);
        if (output[1]) output[1].fill(0);
      }
      return true;
    }

    // Process modules in topologically sorted order
    for (const module of this.sortedModules) {
      // Prepare inputs: handle banana stacking (multi-source)
      for (const [portName, sources] of Object.entries(module.inputConnections)) {
        const inputBuffer = module.inputs[portName];

        if (sources.length === 0) {
          // No connection, fill with zero volts
          inputBuffer.fill(0);
        } else if (sources.length === 1) {
          // Single source: copy from source buffer
          const sourceBuffer = sources[0].buffer;
          for (let i = 0; i < 128; i++) {
            inputBuffer[i] = sourceBuffer[i];
          }
        } else {
          // Multiple sources: sum into input buffer (banana stacking)
          inputBuffer.fill(0);
          for (const source of sources) {
            for (let i = 0; i < 128; i++) {
              inputBuffer[i] += source.buffer[i];
            }
          }
        }
      }

      // Run module's DSP
      module.process();
    }

    if (this.sortedModules.length > 0) {
      this.scopeTick += 1;
      if (this.scopeTick % this.scopeStride === 0) {
        const frames = [];
        for (const module of this.sortedModules) {
          const samples = this.getScopeSamples(module);
          if (!samples) continue;
          frames.push({ id: module.id, samples });
        }
        if (frames.length > 0) {
          this.port.postMessage({ type: 'scopeData', frames });
        }
      }
    }

    // Get final output from OUTPUT module with soft clipping
    if (this.outputModule && output && output[0]) {
      const outputModule = this.outputModule;
      const hasLeft = outputModule.inputConnections.inL?.length > 0;
      const hasRight = outputModule.inputConnections.inR?.length > 0;
      const leftSource =
        hasLeft && outputModule.inputs.inL ? outputModule.inputs.inL : outputModule.outputs.out;
      const rightSource =
        hasRight && outputModule.inputs.inR ? outputModule.inputs.inR : outputModule.outputs.out;
      const hasStereoInputs = hasLeft || hasRight;
      const drive = outputModule.drive;

      // Apply soft clipping (tanh) to prevent harsh clipping
      for (let i = 0; i < 128; i++) {
        let left = 0;
        let right = 0;

        if (hasStereoInputs) {
          left =
            hasLeft && leftSource ? leftSource[i] : hasRight && rightSource ? rightSource[i] : 0;
          right =
            hasRight && rightSource ? rightSource[i] : hasLeft && leftSource ? leftSource[i] : 0;
        } else {
          left = leftSource ? leftSource[i] : 0;
          right = rightSource ? rightSource[i] : left;
        }

        output[0][i] = Math.tanh(left * drive);
        if (output[1]) {
          output[1][i] = Math.tanh(right * drive);
        }
      }
    } else if (output && output[0]) {
      // No output module, silence
      output[0].fill(0);
      if (output[1]) output[1].fill(0);
    }

    return true;
  }
}
