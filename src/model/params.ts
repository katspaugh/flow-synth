import { ModuleKind } from '../types/graph';
import type { ModuleParams } from '../types/graph';
import { DELAY_PARAM_KEYS } from '../worklet/modules/Delay';
import { LFO_PARAM_KEYS } from '../worklet/modules/LFO';
import { PAN_PARAM_KEYS } from '../worklet/modules/Pan';
import { SLEW_PARAM_KEYS } from '../worklet/modules/Slew';
import { VCO_PARAM_KEYS } from '../worklet/modules/VCO';

export type NumberParamDef = {
  kind: 'number';
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
};

export type SelectParamDef = {
  kind: 'select';
  label: string;
  options: readonly string[];
  defaultValue: string;
};

export type ParamDef = NumberParamDef | SelectParamDef;

export type ParamDefMap = Record<string, ParamDef>;

const SHAPES = ['sine', 'tri', 'saw', 'square'] as const;

export const PARAM_DEFS: Record<ModuleKind, ParamDefMap> = {
  [ModuleKind.VCO]: {
    [VCO_PARAM_KEYS.FREQ]: {
      kind: 'number',
      label: 'freq',
      min: -6,
      max: 9,
      step: 0.05,
      defaultValue: 0,
      unit: 'V',
    },
    [VCO_PARAM_KEYS.SHAPE]: {
      kind: 'select',
      label: 'shape',
      options: SHAPES,
      defaultValue: 'saw',
    },
  },
  [ModuleKind.LFO]: {
    [LFO_PARAM_KEYS.FREQ]: {
      kind: 'number',
      label: 'rate',
      min: -12,
      max: 2,
      step: 0.05,
      defaultValue: -5,
      unit: 'V',
    },
    [LFO_PARAM_KEYS.SHAPE]: {
      kind: 'select',
      label: 'shape',
      options: SHAPES,
      defaultValue: 'sine',
    },
  },
  [ModuleKind.SLEW]: {
    [SLEW_PARAM_KEYS.RISE_TIME]: {
      kind: 'number',
      label: 'rise',
      min: 0.001,
      max: 6,
      step: 0.001,
      defaultValue: 0.5,
      unit: 's',
    },
    [SLEW_PARAM_KEYS.FALL_TIME]: {
      kind: 'number',
      label: 'fall',
      min: 0.001,
      max: 6,
      step: 0.001,
      defaultValue: 0.5,
      unit: 's',
    },
  },
  [ModuleKind.PAN]: {
    [PAN_PARAM_KEYS.PAN]: {
      kind: 'number',
      label: 'pan',
      min: -1,
      max: 1,
      step: 0.01,
      defaultValue: 0,
    },
  },
  [ModuleKind.DELAY]: {
    [DELAY_PARAM_KEYS.DELAY_TIME]: {
      kind: 'number',
      label: 'time',
      min: 0.01,
      max: 2,
      step: 0.01,
      defaultValue: 0.25,
      unit: 's',
    },
    [DELAY_PARAM_KEYS.FEEDBACK]: {
      kind: 'number',
      label: 'feedback',
      min: 0,
      max: 0.95,
      step: 0.01,
      defaultValue: 0.35,
    },
    [DELAY_PARAM_KEYS.MIX]: {
      kind: 'number',
      label: 'mix',
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 0.4,
    },
  },
  [ModuleKind.VCA]: {},
  [ModuleKind.RECTIFIER]: {},
  [ModuleKind.OUTPUT]: {},
};

export const DEFAULT_PARAMS: Record<ModuleKind, ModuleParams | undefined> = {
  [ModuleKind.VCO]: { freq: 0, vcoShape: 'saw' },
  [ModuleKind.LFO]: { freq: -5, shape: 'sine' },
  [ModuleKind.SLEW]: { riseTime: 0.5, fallTime: 0.5 },
  [ModuleKind.PAN]: { pan: 0 },
  [ModuleKind.DELAY]: { delayTime: 0.25, feedback: 0.35, mix: 0.4 },
  [ModuleKind.RECTIFIER]: undefined,
  [ModuleKind.VCA]: undefined,
  [ModuleKind.OUTPUT]: undefined,
};

export const paramCount = (kind: ModuleKind): number => Object.keys(PARAM_DEFS[kind]).length;

export function getParamValue(
  kind: ModuleKind,
  params: ModuleParams | undefined,
  key: string
): number | string {
  const def = PARAM_DEFS[kind][key];
  const raw = (params as Record<string, number | string | undefined> | undefined)?.[key];
  if (def.kind === 'select') {
    // Older VCO patches stored the waveform under the LFO's `shape` key.
    const fallback = key === VCO_PARAM_KEYS.SHAPE ? params?.shape : undefined;
    const picked = (raw as string | undefined) ?? fallback;
    return picked && def.options.includes(picked) ? picked : def.defaultValue;
  }
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : def.defaultValue;
}
