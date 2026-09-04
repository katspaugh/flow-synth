import { Module } from './Module';

export class VCA extends Module {
  process(): void {
    const out = this.outputs.out;
    const audioIn = this.inputs.in || new Float32Array(128);
    const cv = this.inputs.cv || new Float32Array(128);
    const hasCv = this.inputConnections.cv && this.inputConnections.cv.length > 0;

    for (let i = 0; i < 128; i++) {
      // VCA behavior: out = in * (cv / 5) where 5V = unity gain
      // Negative CV values cut to silence (classic VCA behavior)
      // At 5V: gain = 1.0 (unity)
      // At 0V: gain = 0.0 (silence)
      // At -5V: gain = -1.0 (inverted + silence when bipolar LFO used)
      const gainCv = hasCv ? cv[i] : 5;
      out[i] = audioIn[i] * (gainCv / 5);
    }
  }
}
