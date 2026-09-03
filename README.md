# Flow Synth

Node-based modular synthesizer for the browser. The whole patch runs inside a
single `AudioWorkletProcessor`; the canvas UI is a React port of the board from
[SpaceNotes](https://github.com/katspaugh/spacenotes).

## Usage

```bash
npm install
npm run dev
```

Open the printed URL, press **▶ Play**, then:

- **Add modules** with the toolbar buttons, or double-click empty canvas to
  pick one at that spot.
- **Patch cables** by clicking an output port (right side of a node) and then
  an input port (left side). Clicking a node body while a cable is pending
  patches into its first matching port. `Esc` cancels.
- **Remove a cable** by clicking it.
- **Move modules** by dragging. Drag on empty canvas to box-select; a
  selection moves together.
- **Delete modules** with the `×` in the header, or select and press
  `Delete` / `Backspace`.
- **Tweak parameters** with the sliders and selects inside each node. Changes
  go to the engine live; nothing is rebuilt, so oscillators keep their phase
  and delays keep their tails.
- **Demo patches** loads one of the feedback patches described below.
- **Randomize** generates a new patch (tick **Binaural** for a slow stereo drone).
- **Share** copies a link; the URL always tracks the current patch, so a
  reload restores it.
- `Cmd/Ctrl+Enter` reloads the graph into the engine.

## Modules

| Module    | Inputs                          | Outputs      | Params                    |
| --------- | ------------------------------- | ------------ | ------------------------- |
| VCO       | `pitch` (1V/oct), `fm` (linear) | `out`        | `freq` (V), `shape`       |
| VCA       | `in`, `cv` (5V = unity)         | `out`        |                           |
| LFO       | `rate` (1V/oct)                 | `out`        | `freq` (V), `shape`       |
| Slew      | `in` (loops if unpatched)       | `out`        | `riseTime`, `fallTime`    |
| Pan       | `in`, `pan`                     | `outL`,`outR`| `pan`                     |
| Delay     | `in`, `time`, `feedback`, `mix` | `out`        | `delayTime`, `feedback`, `mix` |
| Rectifier | `in`                            | `out`        |                           |
| Atten     | `in`                            | `out`        | `gain` (-1..1), `offset` (V) |
| Output    | `in`, `inL`, `inR`              |              | `drive`                   |

Multiple cables into one input are summed (banana stacking). Feedback loops
are allowed and get a one-block delay. Atten is the attenuverter every
Serge-style patch needs: it scales and offsets CV, and with negative gain it
turns a feedback loop from runaway into regulation.

## Demo patches

Patches built from feedback rather than sequencing, after Serge patch
programming and cybernetics (`src/presets/index.ts`):

- **Strange Attractor** — three VCOs FM each other in a ring, one also
  modulating itself; the patch's own energy, rectified and slewed, opens the VCA.
- **Axon** — a square LFO is a spike train; its output travels down a delay
  line used as an axon and arrives back at its own rate input, so each burst
  re-times the next. The integrated "membrane potential" chirps a voice.
- **Krell Ouroboros** — two unpatched slews loop at unrelated periods and
  fade chords in and out; the delay's level is inverted into its own feedback,
  so quiet passages ring on and loud ones damp themselves.
- **Homeostat** — after Ashby: two voices in mutual inhibition, each follower
  inverted into the other's VCA, kept from settling by a slow disturbance.
- **Rectified Reflex** — a VCO rectified into its own FM input, dragged
  through regimes by a saw LFO; the delay's wetness follows its own level.

## Architecture

The UI is a plain model–view–controller split; the DOM is never the source of truth.

- **Model** — `src/model/`
  - `graph.ts`: pure operations on the patch (`createModule`, `connect`, `deleteModule`, …).
  - `ports.ts`, `params.ts`: per-module port lists, parameter ranges and defaults.
  - `geometry.ts`: node sizes and port anchor positions derived from the model, so
    cables are drawn without measuring the DOM.
  - `layout.ts`: auto-layout for patches that carry no positions (e.g. random ones).
  - `hash.ts`: URL-fragment serialization for share links.
- **Controller** — `src/hooks/`
  - `useGraphState.ts`: owns the graph and exposes the actions views dispatch.
  - `useAudioEngine.ts`: AudioWorklet lifecycle. Adding/removing modules or
    cables reloads the engine graph; parameter edits are diffed into `setParam`
    messages; moving nodes never touches it.
- **View** — `src/components/`
  - `board/Board.tsx`, `DraggableNode.tsx`, `Edge.tsx`, `SelectionBox.tsx`: the
    SpaceNotes canvas, adapted to port-to-port cables.
  - `ModuleCard.tsx`, `board/Port.tsx`, `Scope.tsx`: a module node with ports,
    sliders and a live oscilloscope.
- **Engine** — `src/worklet/`: `ModularProcessor` runs every module's DSP in one
  AudioWorklet, with a `setParam` message that lets modules re-read params in
  place via `applyParams`.

## Scripts

```bash
npm run dev         # dev server
npm run build       # type-check + production build (dist/)
npm run preview     # serve dist/
npm run lint        # eslint
npm run type-check  # app + worklet type-check
```

## Deploying

This is no longer a plain static site: the browser can't run `src/main.tsx`
directly, so the host has to serve the Vite build output in `dist/`. Serving
the repo root gives a blank page and a "MIME type of application/octet-stream"
error for the module script.

- **Cloudflare Pages (git integration)**: in the project's build settings set
  the build command to `npm run build` and the output directory to `dist`.
- **Cloudflare Workers**: `npm run deploy` builds and runs `wrangler deploy`
  using `wrangler.toml`, which serves `dist/` as static assets.
- **Anything else**: `npm run build` and upload `dist/`.

## Notes

- AudioWorklet needs a user gesture, so audio starts only after pressing Play.
- The Output module soft-clips with `tanh(signal × drive)`. At the default
  drive of 0.2 the engine's nominal 5V lands at about 0.76 full scale, a gentle
  rounding; turn drive up on the Output node for saturation.

## License

MIT. See `MIT-LICENSE.txt`.
