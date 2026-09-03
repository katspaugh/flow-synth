# Flow Synth

Node-based modular synthesizer for the browser. The whole patch runs inside a
single `AudioWorkletProcessor` (the engine from [aumlet](https://github.com/katspaugh/aumlet));
the canvas UI is a React port of the board from [SpaceNotes](https://github.com/katspaugh/spacenotes).

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
- **Tweak parameters** with the sliders and selects inside each node.
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
| Output    | `in`, `inL`, `inR`              |              |                           |

Multiple cables into one input are summed (banana stacking). Feedback loops
are allowed and get a one-block delay.

## Architecture

The UI is a plain model–view–controller split; the DOM is never the source of truth.

- **Model** — `src/model/`
  - `graph.ts`: pure operations on the patch (`createModule`, `connect`, `deleteModule`, …).
  - `ports.ts`, `params.ts`: per-module port lists, parameter ranges and defaults.
  - `geometry.ts`: node sizes and port anchor positions derived from the model, so
    cables are drawn without measuring the DOM.
  - `layout.ts`: auto-layout for patches that carry no positions (e.g. random or aumlet links).
  - `hash.ts`: URL-fragment serialization (compatible with aumlet share links).
- **Controller** — `src/hooks/`
  - `useGraphState.ts`: owns the graph and exposes the actions views dispatch.
  - `useAudioEngine.ts`: AudioWorklet lifecycle; reloads the engine only when the
    audio-relevant part of the graph changes (moving nodes never touches it).
- **View** — `src/components/`
  - `board/Board.tsx`, `DraggableNode.tsx`, `Edge.tsx`, `SelectionBox.tsx`: the
    SpaceNotes canvas, adapted to port-to-port cables.
  - `ModuleCard.tsx`, `board/Port.tsx`, `Scope.tsx`: a module node with ports,
    sliders and a live oscilloscope.
- **Engine** — `src/worklet/`: the unchanged aumlet `ModularProcessor` and DSP modules.

## Scripts

```bash
npm run dev         # dev server
npm run build       # type-check + production build (dist/)
npm run preview     # serve dist/
npm run lint        # eslint
npm run type-check  # app + worklet type-check
```

## Notes

- AudioWorklet needs a user gesture, so audio starts only after pressing Play.
- Changing a parameter rebuilds the engine graph (oscillator phases and delay
  buffers reset); updates are coalesced so slider drags don't thrash it.

## License

MIT. See `MIT-LICENSE.txt`.
