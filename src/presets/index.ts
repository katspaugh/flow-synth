import { ModuleKind } from '../types/graph';
import type { Connection, Graph, ModuleDefinition, ModuleParams } from '../types/graph';
import { NODE_WIDTH, nodeHeight } from '../model/geometry';

/**
 * Demo patches in the spirit of Serge "patch programmable" synthesis and
 * cybernetics: circuits whose behaviour comes from feedback rather than from
 * a sequencer.
 *
 * Voltage conventions of the engine: VCOs and LFOs swing ±5V, a looping Slew
 * rises 0→10V, a Rectifier folds ±5V to 0→5V, 5V into a VCA's cv is unity
 * gain, and the output stage soft-clips with tanh, so ±1.5–2.5V at the
 * output is warm while ±5V is fully saturated. Atten modules scale and
 * offset CV, and with negative gain they turn a feedback loop from runaway
 * into regulation.
 */

export type Preset = {
  name: string;
  description: string;
  graph: Graph;
};

const COLUMN_GAP = 100;
const ROW_GAP = 36;
const MARGIN_X = 80;
const MARGIN_Y = 90;

class PatchBuilder {
  readonly modules: ModuleDefinition[] = [];
  readonly connections: Connection[] = [];
  private readonly columnBottom = new Map<number, number>();

  /** Adds a module, stacking it under the previous one in the same column. */
  add(id: string, kind: ModuleKind, column: number, params?: ModuleParams): this {
    const y = this.columnBottom.get(column) ?? MARGIN_Y;
    const module: ModuleDefinition = {
      id,
      kind,
      params,
      x: MARGIN_X + column * (NODE_WIDTH + COLUMN_GAP),
      y,
    };
    this.modules.push(module);
    this.columnBottom.set(column, y + nodeHeight(module) + ROW_GAP);
    return this;
  }

  /** wire('vco1.out', 'vca.cv') */
  wire(from: `${string}.${string}`, to: `${string}.${string}`): this {
    const [fromId, fromPort] = from.split('.');
    const [toId, toPort] = to.split('.');
    this.connections.push({ from: { id: fromId, port: fromPort }, to: { id: toId, port: toPort } });
    return this;
  }

  graph(): Graph {
    return { modules: this.modules, connections: this.connections };
  }
}

const { VCO, VCA, LFO, SLEW, PAN, DELAY, RECTIFIER, ATTEN, OUTPUT } = ModuleKind;

/**
 * Three oscillators frequency-modulate each other in a ring, and one of them
 * also modulates itself. Nothing is periodic: the loop settles into strange
 * attractors and hops between them as a slow LFO nudges one carrier. The
 * patch's own energy, followed through a rectifier and slew, opens the VCA.
 */
function strangeAttractor(): Graph {
  const p = new PatchBuilder();
  p.add('drift', LFO, 0, { freq: -8.5, shape: 'sine' })
    .add('driftAmt', ATTEN, 0, { gain: 0.3, offset: 0 })
    .add('selfFm', ATTEN, 0, { gain: 0.3, offset: 0 })
    .add('vco1', VCO, 1, { freq: 2, vcoShape: 'saw' })
    .add('vco2', VCO, 1, { freq: 2.58, vcoShape: 'sine' })
    .add('vco3', VCO, 1, { freq: 1, vcoShape: 'tri' })
    .add('rect', RECTIFIER, 2, undefined)
    .add('follower', SLEW, 2, { riseTime: 0.005, fallTime: 0.35 })
    .add('level', ATTEN, 2, { gain: 0.5, offset: 0 })
    .add('vca', VCA, 3, undefined)
    .add('delay', DELAY, 3, { delayTime: 0.37, feedback: 0.45, mix: 0.3 })
    .add('sweep', LFO, 3, { freq: -7.3, shape: 'tri' })
    .add('pan', PAN, 4, { pan: 0 })
    .add('out', OUTPUT, 5, undefined);

  return (
    p
      // the ring
      .wire('vco1.out', 'vco2.fm')
      .wire('vco2.out', 'vco3.fm')
      .wire('vco3.out', 'vco1.fm')
      // self-modulation, attenuated so it bends rather than explodes
      .wire('vco1.out', 'selfFm.in')
      .wire('selfFm.out', 'vco1.fm')
      // slow drift through regimes
      .wire('drift.out', 'driftAmt.in')
      .wire('driftAmt.out', 'vco2.fm')
      // energy follower opens the VCA
      .wire('vco2.out', 'rect.in')
      .wire('rect.out', 'follower.in')
      .wire('follower.out', 'level.in')
      .wire('level.out', 'vca.cv')
      // voice
      .wire('vco1.out', 'vca.in')
      .wire('vca.out', 'delay.in')
      .wire('delay.out', 'pan.in')
      .wire('sweep.out', 'pan.pan')
      .wire('pan.outL', 'out.inL')
      .wire('pan.outR', 'out.inR')
      .graph()
  );
}

/**
 * A cybernetic neuron. A square LFO is the spike train. Its output travels
 * down an "axon" (a delay line used purely as a CV delay) and arrives back at
 * its own rate input ~0.6 s later, so each burst of firing rewrites the
 * firing rate that follows it: delayed self-modulation, the classic recipe
 * for irregular bursting. A slew integrates the spikes into a membrane
 * potential that chirps one voice and, rectified, swells its level; the raw
 * spikes gate a sub voice and throw the whole thing left and right.
 */
function axon(): Graph {
  const p = new PatchBuilder();
  p.add('spikes', LFO, 0, { freq: -4.5, shape: 'square' })
    .add('axon', DELAY, 0, { delayTime: 0.6, feedback: 0, mix: 1 })
    .add('rateFb', ATTEN, 0, { gain: 0.6, offset: 0 })
    .add('membrane', SLEW, 1, { riseTime: 0.05, fallTime: 0.6 })
    .add('chirp', ATTEN, 1, { gain: 0.4, offset: 2 })
    .add('rect', RECTIFIER, 1, undefined)
    .add('level', ATTEN, 1, { gain: 0.4, offset: 0 })
    .add('gate', ATTEN, 1, { gain: 0.3, offset: 1.5 })
    .add('vco1', VCO, 2, { freq: 1, vcoShape: 'sine' })
    .add('vco2', VCO, 2, { freq: 0.5, vcoShape: 'tri' })
    .add('vca', VCA, 3, undefined)
    .add('vca2', VCA, 3, undefined)
    .add('echo', DELAY, 3, { delayTime: 0.5, feedback: 0.6, mix: 0.45 })
    .add('pan', PAN, 4, { pan: 0 })
    .add('out', OUTPUT, 5, undefined);

  return (
    p
      // the loop: spikes travel down the axon and re-time their own source
      .wire('spikes.out', 'axon.in')
      .wire('axon.out', 'rateFb.in')
      .wire('rateFb.out', 'spikes.rate')
      // membrane potential
      .wire('spikes.out', 'membrane.in')
      .wire('membrane.out', 'chirp.in')
      .wire('chirp.out', 'vco1.pitch')
      .wire('membrane.out', 'rect.in')
      .wire('rect.out', 'level.in')
      .wire('level.out', 'vca.cv')
      .wire('vco1.out', 'vca.in')
      // sub voice gated by the raw spikes
      .wire('spikes.out', 'gate.in')
      .wire('gate.out', 'vca2.cv')
      .wire('vco2.out', 'vca2.in')
      // out
      .wire('vca.out', 'echo.in')
      .wire('vca2.out', 'echo.in')
      .wire('echo.out', 'pan.in')
      .wire('spikes.out', 'pan.pan')
      .wire('pan.outL', 'out.inL')
      .wire('pan.outR', 'out.inR')
      .graph()
  );
}

/**
 * Serge-style generative drone. Two unpatched slews loop at unrelated
 * periods, opening two VCAs on a slow polyrhythm and gliding one pitch. The
 * delay is an ouroboros with a conscience: its output, followed through a
 * rectifier and slew, is inverted into its own feedback amount, so quiet
 * passages ring on for a long time and loud ones damp themselves.
 */
function krellOuroboros(): Graph {
  const p = new PatchBuilder();
  p.add('loopA', SLEW, 0, { riseTime: 3.2, fallTime: 5.1 })
    .add('loopB', SLEW, 0, { riseTime: 7, fallTime: 2.3 })
    .add('spread', LFO, 0, { freq: -8.5, shape: 'sine' })
    .add('levelA', ATTEN, 1, { gain: 0.2, offset: 0 })
    .add('levelB', ATTEN, 1, { gain: 0.2, offset: 0 })
    .add('glide', ATTEN, 1, { gain: 0.12, offset: 0 })
    .add('subLevel', ATTEN, 1, { gain: 0.3, offset: 0 })
    .add('vco1', VCO, 2, { freq: 2, vcoShape: 'sine' })
    .add('vco2', VCO, 2, { freq: 2.58, vcoShape: 'sine' })
    .add('sub', VCO, 2, { freq: 1, vcoShape: 'tri' })
    .add('vca1', VCA, 3, undefined)
    .add('vca2', VCA, 3, undefined)
    .add('rect', RECTIFIER, 3, undefined)
    .add('follower', SLEW, 3, { riseTime: 0.05, fallTime: 1.5 })
    .add('damping', ATTEN, 3, { gain: -0.15, offset: 2 })
    .add('delay', DELAY, 4, { delayTime: 0.75, feedback: 0.3, mix: 0.6 })
    .add('pan', PAN, 5, { pan: 0 })
    .add('out', OUTPUT, 6, undefined);

  return (
    p
      .wire('loopA.out', 'levelA.in')
      .wire('levelA.out', 'vca1.cv')
      .wire('loopB.out', 'levelB.in')
      .wire('levelB.out', 'vca2.cv')
      .wire('loopA.out', 'glide.in')
      .wire('glide.out', 'vco2.pitch')
      .wire('vco1.out', 'vca1.in')
      .wire('vco2.out', 'vca2.in')
      .wire('sub.out', 'subLevel.in')
      .wire('vca1.out', 'delay.in')
      .wire('vca2.out', 'delay.in')
      .wire('subLevel.out', 'delay.in')
      // the ouroboros: louder echo → less feedback
      .wire('delay.out', 'rect.in')
      .wire('rect.out', 'follower.in')
      .wire('follower.out', 'damping.in')
      .wire('damping.out', 'delay.feedback')
      .wire('delay.out', 'pan.in')
      .wire('spread.out', 'pan.pan')
      .wire('pan.outL', 'out.inL')
      .wire('pan.outR', 'out.inR')
      .graph()
  );
}

/**
 * After Ashby's homeostat: two voices, each with an envelope follower on its
 * output, and each follower is inverted into the *other* voice's VCA, so the
 * louder one speaks the quieter the other gets. Left to itself the pair
 * settles into equilibrium, exactly as Ashby's machine did, so a slow LFO
 * keeps disturbing voice A and the system keeps re-balancing. Each follower
 * also bends the other voice's pitch, so you hear the negotiation.
 */
function homeostat(): Graph {
  const p = new PatchBuilder();
  p.add('disturb', LFO, 0, { freq: -6.5, shape: 'tri' })
    .add('disturbAmt', ATTEN, 0, { gain: 0.3, offset: 0 })
    .add('vcoA', VCO, 1, { freq: 2, vcoShape: 'saw' })
    .add('vcoB', VCO, 1, { freq: 2.58, vcoShape: 'square' })
    .add('vcaA', VCA, 2, undefined)
    .add('vcaB', VCA, 2, undefined)
    .add('rectA', RECTIFIER, 3, undefined)
    .add('followA', SLEW, 3, { riseTime: 0.3, fallTime: 1.2 })
    .add('inhibitB', ATTEN, 3, { gain: -0.6, offset: 2.5 })
    .add('rectB', RECTIFIER, 3, undefined)
    .add('followB', SLEW, 3, { riseTime: 0.3, fallTime: 1.2 })
    .add('inhibitA', ATTEN, 3, { gain: -0.6, offset: 2.5 })
    .add('delay', DELAY, 4, { delayTime: 0.33, feedback: 0.4, mix: 0.35 })
    .add('panA', PAN, 5, { pan: -0.6 })
    .add('panB', PAN, 5, { pan: 0.6 })
    .add('out', OUTPUT, 6, undefined);

  return (
    p
      .wire('vcoA.out', 'vcaA.in')
      .wire('vcoB.out', 'vcaB.in')
      // followers
      .wire('vcaA.out', 'rectA.in')
      .wire('rectA.out', 'followA.in')
      .wire('vcaB.out', 'rectB.in')
      .wire('rectB.out', 'followB.in')
      // mutual inhibition (negative feedback)
      .wire('followA.out', 'inhibitB.in')
      .wire('inhibitB.out', 'vcaB.cv')
      .wire('followB.out', 'inhibitA.in')
      .wire('inhibitA.out', 'vcaA.cv')
      // each voice bends the other's pitch
      .wire('followA.out', 'vcoB.fm')
      .wire('followB.out', 'vcoA.fm')
      // disturbance
      .wire('disturb.out', 'disturbAmt.in')
      .wire('disturbAmt.out', 'vcaA.cv')
      // outputs
      .wire('vcaA.out', 'panA.in')
      .wire('vcaB.out', 'delay.in')
      .wire('delay.out', 'panB.in')
      .wire('panA.outL', 'out.inL')
      .wire('panA.outR', 'out.inR')
      .wire('panB.outL', 'out.inL')
      .wire('panB.outR', 'out.inR')
      .graph()
  );
}

/**
 * Non-linear self-patching. A triangle VCO is rectified and fed back into
 * its own linear FM input, so every cycle bends the next one, and a slow saw
 * LFO drags it through regimes from buzz to chaos. The short delay's wetness
 * follows its own output level.
 */
function rectifiedReflex(): Graph {
  const p = new PatchBuilder();
  p.add('ramp', LFO, 0, { freq: -7.5, shape: 'saw' })
    .add('rampAmt', ATTEN, 0, { gain: 0.4, offset: 0 })
    .add('sweep', LFO, 0, { freq: -6.5, shape: 'sine' })
    .add('vco', VCO, 1, { freq: 2.3, vcoShape: 'tri' })
    .add('rect', RECTIFIER, 1, undefined)
    .add('reflex', ATTEN, 1, { gain: 0.6, offset: 0 })
    .add('level', ATTEN, 2, { gain: 0.4, offset: 0 })
    .add('delay', DELAY, 2, { delayTime: 0.12, feedback: 0.7, mix: 0.4 })
    .add('rect2', RECTIFIER, 3, undefined)
    .add('follower', SLEW, 3, { riseTime: 0.01, fallTime: 0.5 })
    .add('wetness', ATTEN, 3, { gain: 0.8, offset: 0 })
    .add('pan', PAN, 4, { pan: 0 })
    .add('out', OUTPUT, 5, undefined);

  return (
    p
      // reflex: the oscillator bends itself through a nonlinearity
      .wire('vco.out', 'rect.in')
      .wire('rect.out', 'reflex.in')
      .wire('reflex.out', 'vco.fm')
      .wire('ramp.out', 'rampAmt.in')
      .wire('rampAmt.out', 'vco.fm')
      // echo whose wetness follows its own level
      .wire('vco.out', 'level.in')
      .wire('level.out', 'delay.in')
      .wire('delay.out', 'rect2.in')
      .wire('rect2.out', 'follower.in')
      .wire('follower.out', 'wetness.in')
      .wire('wetness.out', 'delay.mix')
      .wire('delay.out', 'pan.in')
      .wire('sweep.out', 'pan.pan')
      .wire('pan.outL', 'out.inL')
      .wire('pan.outR', 'out.inR')
      .graph()
  );
}

export const PRESETS: Preset[] = [
  {
    name: 'Strange Attractor',
    description: 'Three VCOs FM each other in a ring; the patch opens its own VCA.',
    graph: strangeAttractor(),
  },
  {
    name: 'Axon',
    description: 'A spiking LFO whose delayed output re-times its own firing.',
    graph: axon(),
  },
  {
    name: 'Krell Ouroboros',
    description: 'Looping slews fade chords in and out; the delay damps its own feedback.',
    graph: krellOuroboros(),
  },
  {
    name: 'Homeostat',
    description: 'Two voices in mutual inhibition, forever re-balancing after a disturbance.',
    graph: homeostat(),
  },
  {
    name: 'Rectified Reflex',
    description: 'A VCO rectified into its own FM input, dragged through regimes by a saw LFO.',
    graph: rectifiedReflex(),
  },
];

/** Deep-copies a preset graph so edits never mutate the catalogue. */
export const presetGraph = (preset: Preset): Graph => structuredClone(preset.graph);
