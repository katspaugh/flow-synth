import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';
export const SLEW_PARAM_KEYS = {
  RISE_TIME: 'riseTime',
  FALL_TIME: 'fallTime',
} as const;

export class Slew extends Module {
  private value: number; // Current output value (0-10V)
  private rising: boolean; // Loop state: true = rising, false = falling
  private riseTime: number; // Rise time in seconds
  private fallTime: number; // Fall time in seconds

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    this.value = 0;
    this.rising = true;
    // Ensure minimum times to prevent division by zero/near-zero
    this.riseTime = params.riseTime !== undefined ? Math.max(0.001, params.riseTime) : 0.5;
    this.fallTime = params.fallTime !== undefined ? Math.max(0.001, params.fallTime) : 0.5;
  }

  process(): void {
    const out = this.outputs.out;
    const input = this.inputs.in;

    // Get sampleRate from global scope - use globalThis for safety
    const sr = (globalThis as { sampleRate?: number }).sampleRate || 48000; // fallback to 48kHz

    // Check if input is connected
    const hasInput = this.inputConnections.in && this.inputConnections.in.length > 0;

    for (let i = 0; i < 128; i++) {
      if (hasInput && input) {
        // Slew limiter mode: track input with rate limiting
        const target = input[i];
        const diff = target - this.value;

        if (diff > 0) {
          // Rising: use rise time
          const maxDelta = 10 / this.riseTime / sr;
          this.value = Math.min(target, this.value + maxDelta);
        } else if (diff < 0) {
          // Falling: use fall time
          const maxDelta = 10 / this.fallTime / sr;
          this.value = Math.max(target, this.value - maxDelta);
        }
      } else {
        // Loop mode: cycle 0V → 10V → 0V
        if (this.rising) {
          const riseRate = 10 / this.riseTime / sr;
          this.value += riseRate;
          if (this.value >= 10) {
            this.value = 10;
            this.rising = false;
          }
        } else {
          const fallRate = 10 / this.fallTime / sr;
          this.value -= fallRate;
          if (this.value <= 0) {
            this.value = 0;
            this.rising = true;
          }
        }
      }

      // Clamp output to valid range and check for NaN
      this.value = isNaN(this.value) ? 0 : Math.max(0, Math.min(10, this.value));
      out[i] = this.value;
    }
  }
}
