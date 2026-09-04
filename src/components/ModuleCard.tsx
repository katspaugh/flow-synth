import { useCallback, type CSSProperties } from 'react';
import type { ModuleDefinition } from '../types/graph';
import {
  INPUT_PORTS,
  MODULE_COLORS,
  MODULE_DESCRIPTIONS,
  MODULE_LABELS,
  OUTPUT_PORTS,
} from '../model/ports';
import { PARAM_DEFS, getParamValue } from '../model/params';
import { portRowCount } from '../model/geometry';
import { Port, type PortSelection } from './board/Port';
import { Scope } from './Scope';

type ModuleCardProps = {
  module: ModuleDefinition;
  scope?: number[];
  connectedPorts: ReadonlySet<string>;
  activePort: PortSelection | null;
  onPortClick: (selection: PortSelection) => void;
  onParamChange: (id: string, param: string, value: number | string) => void;
  onDelete: (id: string) => void;
};

export const portKey = (direction: 'in' | 'out', port: string) => `${direction}:${port}`;

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

export function ModuleCard(props: ModuleCardProps) {
  const { module, connectedPorts, activePort, onPortClick, onParamChange, onDelete } = props;
  const color = MODULE_COLORS[module.kind];
  const inputs = INPUT_PORTS[module.kind];
  const outputs = OUTPUT_PORTS[module.kind];
  const rows = portRowCount(module);
  const params = Object.entries(PARAM_DEFS[module.kind]);

  const onDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(module.id);
    },
    [module.id, onDelete]
  );

  const isActive = (direction: 'in' | 'out', port: string) =>
    activePort?.id === module.id && activePort.direction === direction && activePort.port === port;

  return (
    <div
      className="ModuleCard"
      style={{ '--module-color': color } as CSSProperties}
      title={MODULE_DESCRIPTIONS[module.kind]}
    >
      <div className="ModuleCard_header">
        <span className="ModuleCard_kind">{MODULE_LABELS[module.kind]}</span>
        <span className="ModuleCard_id">{module.id}</span>
        <Scope samples={props.scope} color={color} />
        <button
          type="button"
          className="ModuleCard_delete"
          title="Delete module"
          onClick={onDeleteClick}
          onDoubleClick={stopPropagation}
        >
          ×
        </button>
      </div>

      <div className="ModuleCard_ports">
        {Array.from({ length: rows }, (_, i) => (
          <div className="PortRow" key={i}>
            {inputs[i] !== undefined && (
              <>
                <Port
                  moduleId={module.id}
                  direction="in"
                  port={inputs[i]}
                  connected={connectedPorts.has(portKey('in', inputs[i]))}
                  active={isActive('in', inputs[i])}
                  onClick={onPortClick}
                />
                <span className="PortRow_label PortRow_label_in">{inputs[i]}</span>
              </>
            )}
            {outputs[i] !== undefined && (
              <>
                <span className="PortRow_label PortRow_label_out">{outputs[i]}</span>
                <Port
                  moduleId={module.id}
                  direction="out"
                  port={outputs[i]}
                  connected={connectedPorts.has(portKey('out', outputs[i]))}
                  active={isActive('out', outputs[i])}
                  onClick={onPortClick}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {params.length > 0 && (
        <div className="ModuleCard_params" onDoubleClick={stopPropagation}>
          {params.map(([key, def]) => {
            const value = getParamValue(module.kind, module.params, key);
            return (
              <label className="ParamRow" key={key} onClick={stopPropagation}>
                <span className="ParamRow_label">{def.label}</span>
                {def.kind === 'number' ? (
                  <>
                    <input
                      type="range"
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      value={value as number}
                      onChange={(e) => onParamChange(module.id, key, parseFloat(e.target.value))}
                    />
                    <span className="ParamRow_value">
                      {formatValue(value as number, def.step)}
                      {def.unit ?? ''}
                    </span>
                  </>
                ) : (
                  <select
                    value={value as string}
                    onChange={(e) => onParamChange(module.id, key, e.target.value)}
                  >
                    {def.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatValue(value: number, step: number): string {
  const decimals = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)));
  return value.toFixed(decimals);
}
