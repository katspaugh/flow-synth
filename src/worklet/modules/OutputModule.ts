import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';
export const OUTPUT_PARAM_KEYS = {
  DRIVE: 'drive',
} as const;

// Scale applied before the tanh soft clip. 0.2 puts the engine's nominal 5V
// at ~0.76 full scale: a gentle rounding. 1.0 is the old hard-saturating
// behaviour.
export const DEFAULT_DRIVE = 0.2;

export class OutputModule extends Module {
  drive: number;

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    this.drive = DEFAULT_DRIVE;
    this.applyParams();
  }

  protected override applyParams(): void {
    this.drive = this.params.drive !== undefined ? this.params.drive : DEFAULT_DRIVE;
  }

  process(): void {
    // OUTPUT module: simple pass-through to mark final output point
    // The ModularProcessor will apply soft clipping to this module's output
    const out = this.outputs.out;
    const input = this.inputs.in || new Float32Array(128);
    const inL = this.inputs.inL;
    const inR = this.inputs.inR;
    const hasLeft = this.inputConnections.inL && this.inputConnections.inL.length > 0;
    const hasRight = this.inputConnections.inR && this.inputConnections.inR.length > 0;

    for (let i = 0; i < 128; i++) {
      if (hasLeft || hasRight) {
        const left = hasLeft && inL ? inL[i] : 0;
        const right = hasRight && inR ? inR[i] : left;
        out[i] = (left + right) * 0.5;
      } else {
        out[i] = input[i];
      }
    }
  }
}
