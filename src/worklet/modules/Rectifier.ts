import { Module } from './Module';

export class Rectifier extends Module {
  process(): void {
    const out = this.outputs.out;
    const input = this.inputs.in || new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      out[i] = Math.abs(input[i]);
    }
  }
}
