import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';
export const ATTEN_PARAM_KEYS = {
  GAIN: 'gain',
  OFFSET: 'offset',
} as const;

/**
 * Attenuverter with offset: out = in * gain + offset.
 * gain runs -1..1 so it can invert (negative feedback), offset is in volts.
 */
export class Atten extends Module {
  private gain: number;
  private offset: number;

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    this.gain = 0.5;
    this.offset = 0;
    this.applyParams();
  }

  protected override applyParams(): void {
    this.gain = this.params.gain !== undefined ? this.params.gain : 0.5;
    this.offset = this.params.offset !== undefined ? this.params.offset : 0;
  }

  process(): void {
    const out = this.outputs.out;
    const input = this.inputs.in || new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      out[i] = input[i] * this.gain + this.offset;
    }
  }
}
