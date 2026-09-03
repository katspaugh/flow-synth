import { Module } from './Module';

export class OutputModule extends Module {
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
