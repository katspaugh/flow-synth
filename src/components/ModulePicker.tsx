import { useEffect, useRef, type CSSProperties } from 'react';
import { ModuleKind } from '../types/graph';
import type { Point } from '../model/geometry';
import { MODULE_COLORS, MODULE_DESCRIPTIONS, MODULE_LABELS } from '../model/ports';

type ModulePickerProps = {
  position: Point;
  onPick: (kind: ModuleKind) => void;
};

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

/** Pop-up menu for adding a module where the user double-clicked. */
export function ModulePicker({ position, onPick }: ModulePickerProps) {
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstButton.current?.focus();
  }, []);

  return (
    <div
      className="ModulePicker"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onClick={stopPropagation}
      onDoubleClick={stopPropagation}
      onPointerDown={stopPropagation}
    >
      {Object.values(ModuleKind).map((kind, index) => (
        <button
          type="button"
          key={kind}
          ref={index === 0 ? firstButton : undefined}
          className="ModulePicker_item"
          style={{ '--module-color': MODULE_COLORS[kind] } as CSSProperties}
          title={MODULE_DESCRIPTIONS[kind]}
          onClick={() => onPick(kind)}
        >
          {MODULE_LABELS[kind]}
        </button>
      ))}
    </div>
  );
}
