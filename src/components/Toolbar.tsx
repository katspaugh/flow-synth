import type { CSSProperties } from 'react';
import { ModuleKind } from '../types/graph';
import type { EngineStatus } from '../hooks/useAudioEngine';
import { MODULE_COLORS, MODULE_DESCRIPTIONS, MODULE_LABELS } from '../model/ports';
import { PRESETS } from '../presets';

type ToolbarProps = {
  isRunning: boolean;
  status: EngineStatus;
  binauralEnabled: boolean;
  onToggleAudio: () => void;
  onAddModule: (kind: ModuleKind) => void;
  onRandomize: () => void;
  onToggleBinaural: (enabled: boolean) => void;
  onLoadPreset: (name: string) => void;
  onShare: () => void;
};

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

export function Toolbar(props: ToolbarProps) {
  return (
    <div className="Toolbar" onClick={stopPropagation} onDoubleClick={stopPropagation}>
      <div className="ToolbarGroup">
        <span className="Logo">
          <span className="Logo_mark" />
          Flow Synth
        </span>
        <button
          type="button"
          className={`PlayBtn${props.isRunning ? ' PlayBtn_running' : ''}`}
          onClick={props.onToggleAudio}
          title={props.isRunning ? 'Stop audio' : 'Start audio'}
        >
          {props.isRunning ? '■ Stop' : '▶ Play'}
        </button>
        <span className={`Status Status_${props.status.type}`}>{props.status.message}</span>
      </div>

      <div className="ToolbarGroup ToolbarGroup_modules">
        {Object.values(ModuleKind).map((kind) => (
          <button
            type="button"
            key={kind}
            className="AddModuleBtn"
            style={{ '--module-color': MODULE_COLORS[kind] } as CSSProperties}
            title={MODULE_DESCRIPTIONS[kind]}
            onClick={() => props.onAddModule(kind)}
          >
            + {MODULE_LABELS[kind]}
          </button>
        ))}
      </div>

      <div className="ToolbarGroup">
        <select
          className="PresetSelect"
          value=""
          title="Load a demo patch"
          onChange={(e) => {
            if (e.target.value) props.onLoadPreset(e.target.value);
          }}
        >
          <option value="" disabled>
            Demo patches…
          </option>
          {PRESETS.map((preset) => (
            <option key={preset.name} value={preset.name} title={preset.description}>
              {preset.name}
            </option>
          ))}
        </select>
        <label className="Toggle" title="Randomize into a slow stereo drone">
          <input
            type="checkbox"
            checked={props.binauralEnabled}
            onChange={(e) => props.onToggleBinaural(e.target.checked)}
          />
          Binaural
        </label>
        <button type="button" onClick={props.onRandomize} title="Generate a random patch">
          🎲 Randomize
        </button>
        <button type="button" onClick={props.onShare} title="Copy a link to this patch">
          🔗 Share
        </button>
      </div>
    </div>
  );
}
