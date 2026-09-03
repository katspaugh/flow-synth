import { ModuleKind } from '../types/graph';

// Port lists mirror ModularProcessor.getInputPorts / getOutputPorts.
export const INPUT_PORTS: Record<ModuleKind, readonly string[]> = {
  [ModuleKind.VCO]: ['pitch', 'fm'],
  [ModuleKind.VCA]: ['in', 'cv'],
  [ModuleKind.LFO]: ['rate'],
  [ModuleKind.SLEW]: ['in'],
  [ModuleKind.PAN]: ['in', 'pan'],
  [ModuleKind.DELAY]: ['in', 'time', 'feedback', 'mix'],
  [ModuleKind.RECTIFIER]: ['in'],
  [ModuleKind.ATTEN]: ['in'],
  [ModuleKind.OUTPUT]: ['in', 'inL', 'inR'],
};

export const OUTPUT_PORTS: Record<ModuleKind, readonly string[]> = {
  [ModuleKind.VCO]: ['out'],
  [ModuleKind.VCA]: ['out'],
  [ModuleKind.LFO]: ['out'],
  [ModuleKind.SLEW]: ['out'],
  [ModuleKind.PAN]: ['outL', 'outR'],
  [ModuleKind.DELAY]: ['out'],
  [ModuleKind.RECTIFIER]: ['out'],
  [ModuleKind.ATTEN]: ['out'],
  [ModuleKind.OUTPUT]: [],
};

export const MODULE_LABELS: Record<ModuleKind, string> = {
  [ModuleKind.VCO]: 'VCO',
  [ModuleKind.VCA]: 'VCA',
  [ModuleKind.LFO]: 'LFO',
  [ModuleKind.SLEW]: 'Slew',
  [ModuleKind.PAN]: 'Pan',
  [ModuleKind.DELAY]: 'Delay',
  [ModuleKind.RECTIFIER]: 'Rectifier',
  [ModuleKind.ATTEN]: 'Atten',
  [ModuleKind.OUTPUT]: 'Output',
};

export const MODULE_DESCRIPTIONS: Record<ModuleKind, string> = {
  [ModuleKind.VCO]: 'Oscillator with 1V/oct pitch and linear FM inputs.',
  [ModuleKind.VCA]: 'Amplifier: 5V on cv is unity gain.',
  [ModuleKind.LFO]: 'Low-frequency oscillator with 1V/oct rate input.',
  [ModuleKind.SLEW]: 'Slew limiter; loops as an envelope when in is unpatched.',
  [ModuleKind.PAN]: 'Stereo panner with CV control.',
  [ModuleKind.DELAY]: 'Delay line with CV over time, feedback and mix.',
  [ModuleKind.RECTIFIER]: 'Full-wave rectifier.',
  [ModuleKind.ATTEN]: 'Attenuverter with offset: out = in × gain + offset. Negative gain inverts.',
  [ModuleKind.OUTPUT]: 'Speakers. Feed in, or inL and inR for stereo.',
};

// Accent colour per kind, used for node headers and outgoing cables.
export const MODULE_COLORS: Record<ModuleKind, string> = {
  [ModuleKind.VCO]: '#f97316',
  [ModuleKind.VCA]: '#10b981',
  [ModuleKind.LFO]: '#8b5cf6',
  [ModuleKind.SLEW]: '#ec4899',
  [ModuleKind.PAN]: '#0ea5e9',
  [ModuleKind.DELAY]: '#eab308',
  [ModuleKind.RECTIFIER]: '#64748b',
  [ModuleKind.ATTEN]: '#94a3b8',
  [ModuleKind.OUTPUT]: '#ef4444',
};

export const isModuleKind = (value: unknown): value is ModuleKind =>
  typeof value === 'string' && Object.values(ModuleKind).includes(value as ModuleKind);
