import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const DELAY_PARAM_KEYS = {
  DELAY_TIME: 'delayTime',
  FEEDBACK: 'feedback',
  MIX: 'mix',
} as const;

export class Delay extends Module {
  private buffer: Float32Array;
  private writeIndex: number;
  private maxSamples: number;
  private delayTime: number;
  private feedback: number;
  private mix: number;

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    const sr = (globalThis as { sampleRate?: number }).sampleRate || 48000;
    this.maxSamples = Math.max(1, Math.floor(sr * 2));
    this.buffer = new Float32Array(this.maxSamples);
    this.writeIndex = 0;
    this.delayTime = 0.25;
    this.feedback = 0.35;
    this.mix = 0.4;
    this.applyParams();
  }

  protected override applyParams(): void {
    const params = this.params;
    this.delayTime = params.delayTime !== undefined ? params.delayTime : 0.25;
    this.feedback = params.feedback !== undefined ? params.feedback : 0.35;
    this.mix = params.mix !== undefined ? params.mix : 0.4;
  }

  process(): void {
    const input = this.inputs.in || new Float32Array(128);
    const out = this.outputs.out;
    const timeCv = this.inputs.time;
    const feedbackCv = this.inputs.feedback;
    const mixCv = this.inputs.mix;
    const hasTimeCv = this.inputConnections.time && this.inputConnections.time.length > 0;
    const hasFeedbackCv =
      this.inputConnections.feedback && this.inputConnections.feedback.length > 0;
    const hasMixCv = this.inputConnections.mix && this.inputConnections.mix.length > 0;
    const sr = (globalThis as { sampleRate?: number }).sampleRate || 48000;

    for (let i = 0; i < 128; i++) {
      const timeMod = hasTimeCv && timeCv ? (timeCv[i] / 5) * 2 : 0;
      const feedbackMod = hasFeedbackCv && feedbackCv ? feedbackCv[i] / 5 : 0;
      const mixMod = hasMixCv && mixCv ? mixCv[i] / 5 : 0;
      const delaySeconds = clamp(this.delayTime + timeMod, 0.01, 2);
      const feedback = clamp(this.feedback + feedbackMod, 0, 0.95);
      const mix = clamp(this.mix + mixMod, 0, 1);
      const delaySamples = Math.min(
        this.maxSamples - 1,
        Math.max(1, Math.round(delaySeconds * sr))
      );
      let readIndex = this.writeIndex - delaySamples;
      if (readIndex < 0) readIndex += this.maxSamples;

      const delayed = this.buffer[readIndex];
      const dry = input[i];
      out[i] = dry * (1 - mix) + delayed * mix;
      this.buffer[this.writeIndex] = dry + delayed * feedback;

      this.writeIndex += 1;
      if (this.writeIndex >= this.maxSamples) this.writeIndex = 0;
    }
  }
}
