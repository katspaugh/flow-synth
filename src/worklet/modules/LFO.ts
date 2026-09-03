import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';
export const LFO_PARAM_KEYS = {
  FREQ: 'freq',
  SHAPE: 'shape',
} as const;

// Reference frequency for 0V (C1 = MIDI note 24)
const REFERENCE_FREQ = 32.703; // Hz

export class LFO extends Module {
  private phase: number;
  private freq: number; // Base frequency in volts
  private shape: 'sine' | 'tri' | 'saw' | 'square';

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    this.phase = 0;
    this.freq = params.freq !== undefined ? params.freq : -5; // Default to -5V (~1Hz)
    this.shape = (params.shape as 'sine' | 'tri' | 'saw' | 'square') || 'sine';
  }

  process(): void {
    const out = this.outputs.out;
    const rate = this.inputs.rate || new Float32Array(128);
    const sr = (globalThis as { sampleRate?: number }).sampleRate || 48000;

    for (let i = 0; i < 128; i++) {
      // V/oct: freq = REFERENCE_FREQ * 2^(freqV + rateV)
      const totalVolts = this.freq + rate[i];
      const frequency = REFERENCE_FREQ * Math.pow(2, totalVolts);

      // Generate waveform based on shape (bipolar ±5V)
      let sample = 0;
      switch (this.shape) {
        case 'sine':
          sample = Math.sin(this.phase * Math.PI * 2);
          break;
        case 'tri':
          // Triangle: ramp up 0→0.5, ramp down 0.5→1
          sample = this.phase < 0.5 ? this.phase * 4 - 1 : 3 - this.phase * 4;
          break;
        case 'saw':
          // Saw: linear ramp from -1 to +1
          sample = this.phase * 2 - 1;
          break;
        case 'square':
          // Square: -1 for first half, +1 for second half
          sample = this.phase < 0.5 ? -1 : 1;
          break;
        default:
          sample = Math.sin(this.phase * Math.PI * 2);
      }

      // Scale to ±5V range
      out[i] = sample * 5;

      // Advance phase
      this.phase += Math.max(0.001, frequency) / sr;
      while (this.phase >= 1) this.phase -= 1;
    }
  }
}
