import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';
export const VCO_PARAM_KEYS = {
  FREQ: 'freq',
  SHAPE: 'vcoShape',
} as const;

// Reference frequency for 0V (C1 = MIDI note 24)
const REFERENCE_FREQ = 32.703; // Hz

export class VCO extends Module {
  private phase: number;
  private freq: number; // Base frequency in volts
  private fmSensitivity: number;
  private shape: 'sine' | 'tri' | 'saw' | 'square';

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    this.phase = 0;
    this.freq = params.freq !== undefined ? params.freq : 0; // Default to 0V (C1)
    this.fmSensitivity = params.fmSensitivity || 50;
    this.shape = (params.vcoShape as 'sine' | 'tri' | 'saw' | 'square') || 'saw';
  }

  process(): void {
    const out = this.outputs.out;
    const pitch = this.inputs.pitch || new Float32Array(128);
    const fm = this.inputs.fm || new Float32Array(128);
    const shape = (this.params.vcoShape as 'sine' | 'tri' | 'saw' | 'square') || this.shape;
    const sr = (globalThis as { sampleRate?: number }).sampleRate || 48000;

    for (let i = 0; i < 128; i++) {
      // V/oct: freq = REFERENCE_FREQ * 2^(freqV + pitchV)
      // Base frequency from parameter + pitch CV input
      const totalVolts = this.freq + pitch[i];
      let freq = REFERENCE_FREQ * Math.pow(2, totalVolts);

      // Linear FM: add frequency modulation
      freq += fm[i] * this.fmSensitivity;

      // Clamp frequency to reasonable range
      freq = Math.max(0.1, Math.min(freq, sr / 2));

      let sample = 0;
      switch (shape) {
        case 'sine':
          sample = Math.sin(this.phase * Math.PI * 2);
          break;
        case 'tri':
          sample = this.phase < 0.5 ? this.phase * 4 - 1 : 3 - this.phase * 4;
          break;
        case 'square':
          sample = this.phase < 0.5 ? -1 : 1;
          break;
        case 'saw':
        default:
          sample = this.phase * 2 - 1;
      }

      // Scale to ±5V range
      out[i] = sample * 5;

      // Advance phase
      this.phase += freq / sr;
      while (this.phase >= 1) this.phase -= 1;
      while (this.phase < 0) this.phase += 1;
    }
  }
}
