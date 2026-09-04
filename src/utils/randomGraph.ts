import { ModuleKind, type Graph } from '../types/graph';
import { createEmojiId } from './emojiIds';
import { DELAY_PARAM_KEYS } from '../worklet/modules/Delay';
import { LFO_PARAM_KEYS } from '../worklet/modules/LFO';
import { PAN_PARAM_KEYS } from '../worklet/modules/Pan';
import { SLEW_PARAM_KEYS } from '../worklet/modules/Slew';
import { VCO_PARAM_KEYS } from '../worklet/modules/VCO';

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SHAPES = ['sine', 'tri', 'saw', 'square'] as const;

export function generateRandomGraph(): Graph {
  const modules: Graph['modules'] = [];
  const connections: Graph['connections'] = [];
  const existingIds = new Set<string>();
  const nextId = (prefix: string): string => {
    const id = createEmojiId(prefix, existingIds);
    existingIds.add(id);
    return id;
  };

  // Create 2-3 VCOs with random frequencies
  const numVCOs = randomInt(2, 3);
  const vcoIds: string[] = [];

  const chosenVcoShapes: (typeof SHAPES)[number][] = [];

  for (let i = 0; i < numVCOs; i++) {
    chosenVcoShapes.push(randomChoice(SHAPES));
  }

  if (numVCOs > 1 && new Set(chosenVcoShapes).size === 1) {
    const current = chosenVcoShapes[0];
    const alternatives = SHAPES.filter((shape) => shape !== current);
    chosenVcoShapes[0] = randomChoice(alternatives);
  }

  for (let i = 0; i < numVCOs; i++) {
    const id = nextId('vco');
    vcoIds.push(id);
    // Random frequency from -2V to 8V (sub-audio to high pitch)
    const freq = Math.round(random(-2, 8));
    const vcoShape = chosenVcoShapes[i];
    modules.push({
      id,
      kind: ModuleKind.VCO,
      params: { [VCO_PARAM_KEYS.FREQ]: freq, [VCO_PARAM_KEYS.SHAPE]: vcoShape },
    });
  }

  // Create 1-2 LFOs with random frequencies and shapes
  const numLFOs = randomInt(1, 2);
  const lfoIds: string[] = [];
  const chosenLfoShapes: (typeof SHAPES)[number][] = [];

  for (let i = 0; i < numLFOs; i++) {
    chosenLfoShapes.push(randomChoice(SHAPES));
  }

  if (numLFOs > 1 && new Set(chosenLfoShapes).size === 1) {
    const current = chosenLfoShapes[0];
    const alternatives = SHAPES.filter((shape) => shape !== current);
    chosenLfoShapes[0] = randomChoice(alternatives);
  }

  for (let i = 0; i < numLFOs; i++) {
    const id = nextId('lfo');
    lfoIds.push(id);
    // Random LFO frequency from -6V to -3V (0.5Hz to 4Hz)
    const freq = Math.round(random(-6, -3));
    const shape = chosenLfoShapes[i];
    modules.push({
      id,
      kind: ModuleKind.LFO,
      params: { [LFO_PARAM_KEYS.FREQ]: freq, [LFO_PARAM_KEYS.SHAPE]: shape },
    });
  }

  // Create 1-2 Slew modules (looping envelope generators)
  const numSlews = randomInt(1, 2);
  const slewIds: string[] = [];
  for (let i = 0; i < numSlews; i++) {
    const slewId = nextId('slew');
    slewIds.push(slewId);
    const riseTime = random(0.1, 2); // 100ms to 2s
    const fallTime = random(0.1, 2); // 100ms to 2s
    modules.push({
      id: slewId,
      kind: ModuleKind.SLEW,
      params: { [SLEW_PARAM_KEYS.RISE_TIME]: riseTime, [SLEW_PARAM_KEYS.FALL_TIME]: fallTime },
    });
  }

  // Create VCAs, PAN, and OUTPUT
  const vcaId = nextId('vca');
  const vca2Id = nextId('vca');
  const delayId = nextId('delay');
  const panId = nextId('pan');
  const outId = nextId('out');
  modules.push({ id: vcaId, kind: ModuleKind.VCA });
  modules.push({ id: vca2Id, kind: ModuleKind.VCA });
  modules.push({
    id: delayId,
    kind: ModuleKind.DELAY,
    params: {
      [DELAY_PARAM_KEYS.DELAY_TIME]: random(0.1, 0.6),
      [DELAY_PARAM_KEYS.FEEDBACK]: random(0.1, 0.6),
      [DELAY_PARAM_KEYS.MIX]: random(0.2, 0.7),
    },
  });
  modules.push({
    id: panId,
    kind: ModuleKind.PAN,
    params: { [PAN_PARAM_KEYS.PAN]: random(-1, 1) },
  });
  modules.push({ id: outId, kind: ModuleKind.OUTPUT });

  // Now create weird connections with feedback

  // 1. LFOs modulate VCO pitch or FM (classic)
  for (const lfoId of lfoIds) {
    const targetVCO = randomChoice(vcoIds);
    const port = randomChoice(['pitch', 'fm']);
    connections.push({
      from: { id: lfoId, port: 'out' },
      to: { id: targetVCO, port },
    });
  }

  // 1b. Slew (looping envelope) modulates VCO or VCA
  const slewId = randomChoice(slewIds);
  const slewTarget = randomChoice([...vcoIds, vcaId]);
  if (slewTarget === vcaId) {
    // Modulate VCA CV (envelope-like amplitude control)
    connections.push({
      from: { id: slewId, port: 'out' },
      to: { id: vcaId, port: 'cv' },
    });
  } else {
    // Modulate a VCO pitch (slow pitch sweeps)
    connections.push({
      from: { id: slewId, port: 'out' },
      to: { id: slewTarget, port: 'pitch' },
    });
  }

  // Additional Slew modulation targets (LFO-style)
  for (const extraSlewId of slewIds) {
    if (Math.random() > 0.5) {
      const target = randomChoice([
        { id: vcaId, port: 'cv' },
        { id: vca2Id, port: 'cv' },
        { id: delayId, port: 'time' },
        { id: delayId, port: 'mix' },
        { id: panId, port: 'pan' },
      ]);
      connections.push({
        from: { id: extraSlewId, port: 'out' },
        to: target,
      });
    }
  }

  // Slew into Slew (including self) for chaotic modulation
  for (const fromSlewId of slewIds) {
    if (Math.random() > 0.6) {
      const toSlewId = randomChoice(slewIds);
      connections.push({
        from: { id: fromSlewId, port: 'out' },
        to: { id: toSlewId, port: 'in' },
      });
    }
    if (Math.random() > 0.85) {
      connections.push({
        from: { id: fromSlewId, port: 'out' },
        to: { id: fromSlewId, port: 'in' },
      });
    }
  }

  // 2. VCO cross-modulation (weird FM feedback)
  if (numVCOs >= 2) {
    // Random cross-modulation between VCOs
    const vco1 = vcoIds[0];
    const vco2 = vcoIds[1];

    // Maybe bidirectional feedback
    if (Math.random() > 0.5) {
      connections.push({
        from: { id: vco1, port: 'out' },
        to: { id: vco2, port: 'fm' },
      });
      connections.push({
        from: { id: vco2, port: 'out' },
        to: { id: vco1, port: 'fm' },
      });
    } else {
      // One-way modulation
      connections.push({
        from: { id: vco1, port: 'out' },
        to: { id: vco2, port: 'fm' },
      });
    }
  }

  // 2b. VCOs trigger/modulate Slew inputs (audio-rate/trigger-like)
  for (const vcoId of vcoIds) {
    if (Math.random() > 0.6) {
      const targetSlew = randomChoice(slewIds);
      connections.push({
        from: { id: vcoId, port: 'out' },
        to: { id: targetSlew, port: 'in' },
      });
    }
  }

  // 3. Self-modulation (chaotic!)
  if (Math.random() > 0.6) {
    const selfModVCO = randomChoice(vcoIds);
    connections.push({
      from: { id: selfModVCO, port: 'out' },
      to: { id: selfModVCO, port: 'fm' },
    });
  }

  // 4. If we have 3 VCOs, create a modulation chain
  if (numVCOs === 3) {
    const vco3 = vcoIds[2];
    const target = randomChoice([vcoIds[0], vcoIds[1]]);
    const port = randomChoice(['pitch', 'fm']);
    connections.push({
      from: { id: vco3, port: 'out' },
      to: { id: target, port },
    });
  }

  // 5. Route VCOs to VCA (mix them if multiple)
  // Occasionally insert Slew as a low-pass style smoother (VCO -> Slew -> VCA)
  const filterSlewId = Math.random() > 0.6 ? randomChoice(slewIds) : null;
  if (filterSlewId) {
    const filterSlew = modules.find(
      (module) => module.kind === ModuleKind.SLEW && module.id === filterSlewId
    );
    if (filterSlew) {
      filterSlew.params = {
        ...filterSlew.params,
        [SLEW_PARAM_KEYS.RISE_TIME]: random(0.005, 0.05),
        [SLEW_PARAM_KEYS.FALL_TIME]: random(0.005, 0.05),
      };
    }
  }
  let directToVca = 0;
  for (const vcoId of vcoIds) {
    if (filterSlewId && Math.random() > 0.4) {
      connections.push({
        from: { id: vcoId, port: 'out' },
        to: { id: filterSlewId, port: 'in' },
      });
    } else {
      connections.push({
        from: { id: vcoId, port: 'out' },
        to: { id: vcaId, port: 'in' },
      });
      directToVca += 1;
    }
  }
  if (directToVca === 0) {
    connections.push({
      from: { id: vcoIds[0], port: 'out' },
      to: { id: vcaId, port: 'in' },
    });
    directToVca = 1;
  }
  if (filterSlewId) {
    connections.push({
      from: { id: filterSlewId, port: 'out' },
      to: { id: vcaId, port: 'in' },
    });
  }

  // 6. LFO to VCA CV (amplitude modulation)
  const vcaLFO = randomChoice(lfoIds);
  connections.push({
    from: { id: vcaLFO, port: 'out' },
    to: { id: vcaId, port: 'cv' },
  });

  // 7. VCA to VCA2 for extra dynamics
  connections.push({
    from: { id: vcaId, port: 'out' },
    to: { id: vca2Id, port: 'in' },
  });
  if (Math.random() > 0.4) {
    const vca2Lfo = randomChoice(lfoIds);
    connections.push({
      from: { id: vca2Lfo, port: 'out' },
      to: { id: vca2Id, port: 'cv' },
    });
  }

  // 8. VCA2 to DELAY
  connections.push({
    from: { id: vca2Id, port: 'out' },
    to: { id: delayId, port: 'in' },
  });

  // 9. DELAY to PAN
  connections.push({
    from: { id: delayId, port: 'out' },
    to: { id: panId, port: 'in' },
  });

  // 10. PAN to OUTPUT (stereo)
  connections.push({
    from: { id: panId, port: 'outL' },
    to: { id: outId, port: 'inL' },
  });
  connections.push({
    from: { id: panId, port: 'outR' },
    to: { id: outId, port: 'inR' },
  });

  // 10b. Additional Slew modules modulate delay or pan
  for (const extraSlewId of slewIds.slice(1)) {
    const target = randomChoice([
      { id: delayId, port: 'time' },
      { id: delayId, port: 'mix' },
      { id: panId, port: 'pan' },
    ]);
    connections.push({
      from: { id: extraSlewId, port: 'out' },
      to: target,
    });
  }

  // 11. Maybe add feedback from VCA back to a VCO (extra weird!)
  if (Math.random() > 0.7) {
    const feedbackVCO = randomChoice(vcoIds);
    connections.push({
      from: { id: vca2Id, port: 'out' },
      to: { id: feedbackVCO, port: 'fm' },
    });
  }

  return { modules, connections };
}

export function generateBinauralGraph(): Graph {
  const modules: Graph['modules'] = [];
  const connections: Graph['connections'] = [];
  const existingIds = new Set<string>();
  const nextId = (prefix: string): string => {
    const id = createEmojiId(prefix, existingIds);
    existingIds.add(id);
    return id;
  };

  const baseVolt = random(-4.5, -2.5);
  const detune = random(0.005, 0.02);
  const ambientShapes = ['sine', 'tri'] as const;

  const vcoL = nextId('vco');
  const vcoR = nextId('vco');
  const vcaL = nextId('vca');
  const vcaR = nextId('vca');
  const delayL = nextId('delay');
  const delayR = nextId('delay');
  const panL = nextId('pan');
  const panR = nextId('pan');
  const outId = nextId('out');
  const lfoL = nextId('lfo');
  const lfoR = nextId('lfo');
  const slewL = nextId('slew');
  const slewR = nextId('slew');

  modules.push({
    id: vcoL,
    kind: ModuleKind.VCO,
    params: {
      [VCO_PARAM_KEYS.FREQ]: baseVolt + detune,
      [VCO_PARAM_KEYS.SHAPE]: randomChoice(ambientShapes),
    },
  });
  modules.push({
    id: vcoR,
    kind: ModuleKind.VCO,
    params: {
      [VCO_PARAM_KEYS.FREQ]: baseVolt - detune,
      [VCO_PARAM_KEYS.SHAPE]: randomChoice(ambientShapes),
    },
  });

  modules.push({ id: vcaL, kind: ModuleKind.VCA });
  modules.push({ id: vcaR, kind: ModuleKind.VCA });
  modules.push({
    id: delayL,
    kind: ModuleKind.DELAY,
    params: {
      [DELAY_PARAM_KEYS.DELAY_TIME]: random(0.5, 1.6),
      [DELAY_PARAM_KEYS.FEEDBACK]: random(0.5, 0.85),
      [DELAY_PARAM_KEYS.MIX]: random(0.4, 0.8),
    },
  });
  modules.push({
    id: delayR,
    kind: ModuleKind.DELAY,
    params: {
      [DELAY_PARAM_KEYS.DELAY_TIME]: random(0.5, 1.6),
      [DELAY_PARAM_KEYS.FEEDBACK]: random(0.5, 0.85),
      [DELAY_PARAM_KEYS.MIX]: random(0.4, 0.8),
    },
  });
  modules.push({
    id: panL,
    kind: ModuleKind.PAN,
    params: { [PAN_PARAM_KEYS.PAN]: -1 },
  });
  modules.push({
    id: panR,
    kind: ModuleKind.PAN,
    params: { [PAN_PARAM_KEYS.PAN]: 1 },
  });
  modules.push({ id: outId, kind: ModuleKind.OUTPUT });

  modules.push({
    id: lfoL,
    kind: ModuleKind.LFO,
    params: {
      [LFO_PARAM_KEYS.FREQ]: Math.round(random(-10, -7)),
      [LFO_PARAM_KEYS.SHAPE]: randomChoice(ambientShapes),
    },
  });
  modules.push({
    id: lfoR,
    kind: ModuleKind.LFO,
    params: {
      [LFO_PARAM_KEYS.FREQ]: Math.round(random(-10, -7)),
      [LFO_PARAM_KEYS.SHAPE]: randomChoice(ambientShapes),
    },
  });
  modules.push({
    id: slewL,
    kind: ModuleKind.SLEW,
    params: {
      [SLEW_PARAM_KEYS.RISE_TIME]: random(1.5, 6),
      [SLEW_PARAM_KEYS.FALL_TIME]: random(1.5, 6),
    },
  });
  modules.push({
    id: slewR,
    kind: ModuleKind.SLEW,
    params: {
      [SLEW_PARAM_KEYS.RISE_TIME]: random(1.5, 6),
      [SLEW_PARAM_KEYS.FALL_TIME]: random(1.5, 6),
    },
  });

  connections.push({ from: { id: vcoL, port: 'out' }, to: { id: vcaL, port: 'in' } });
  connections.push({ from: { id: vcoR, port: 'out' }, to: { id: vcaR, port: 'in' } });

  connections.push({ from: { id: lfoL, port: 'out' }, to: { id: slewL, port: 'in' } });
  connections.push({ from: { id: lfoR, port: 'out' }, to: { id: slewR, port: 'in' } });

  if (Math.random() > 0.3) {
    connections.push({ from: { id: slewL, port: 'out' }, to: { id: vcoL, port: 'pitch' } });
  }
  if (Math.random() > 0.3) {
    connections.push({ from: { id: slewR, port: 'out' }, to: { id: vcoR, port: 'pitch' } });
  }

  connections.push({ from: { id: slewL, port: 'out' }, to: { id: delayL, port: 'time' } });
  connections.push({ from: { id: slewR, port: 'out' }, to: { id: delayR, port: 'time' } });
  if (Math.random() > 0.5) {
    connections.push({ from: { id: slewL, port: 'out' }, to: { id: delayL, port: 'mix' } });
  }
  if (Math.random() > 0.5) {
    connections.push({ from: { id: slewR, port: 'out' }, to: { id: delayR, port: 'mix' } });
  }

  connections.push({ from: { id: vcaL, port: 'out' }, to: { id: delayL, port: 'in' } });
  connections.push({ from: { id: vcaR, port: 'out' }, to: { id: delayR, port: 'in' } });

  connections.push({ from: { id: delayL, port: 'out' }, to: { id: panL, port: 'in' } });
  connections.push({ from: { id: delayR, port: 'out' }, to: { id: panR, port: 'in' } });

  connections.push({ from: { id: panL, port: 'outL' }, to: { id: outId, port: 'inL' } });
  connections.push({ from: { id: panR, port: 'outR' }, to: { id: outId, port: 'inR' } });

  return { modules, connections };
}
