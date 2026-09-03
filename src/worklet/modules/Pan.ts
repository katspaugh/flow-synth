import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';
export const PAN_PARAM_KEYS = {
  PAN: 'pan',
} as const;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export class Pan extends Module {
  private pan: number;

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    this.pan = params.pan !== undefined ? params.pan : 0;
  }

  process(): void {
    const outL = this.outputs.outL;
    const outR = this.outputs.outR;
    const input = this.inputs.in || new Float32Array(128);
    const panInput = this.inputs.pan;
    const hasPanInput = this.inputConnections.pan && this.inputConnections.pan.length > 0;

    for (let i = 0; i < 128; i++) {
      const cv = hasPanInput && panInput ? panInput[i] / 5 : 0;
      const panValue = clamp(this.pan + cv, -1, 1);
      const angle = (panValue + 1) * 0.25 * Math.PI;
      const leftGain = Math.cos(angle);
      const rightGain = Math.sin(angle);

      outL[i] = input[i] * leftGain;
      outR[i] = input[i] * rightGain;
    }
  }
}
