import { useCallback, type CSSProperties } from 'react';
import type { Point } from '../../model/geometry';

type EdgeProps = {
  from: Point;
  to: Point;
  color?: string;
  temporary?: boolean;
  onClick?: () => void;
};

function getPath(from: Point, to: Point): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Adaptive curve strength based on distance (min 50, max 200). Cables always
  // leave an output heading right and enter an input heading right, which
  // makes feedback connections loop around naturally.
  const curveStrength = Math.min(Math.max(distance * 0.4, 50), 200);
  const cp1x = from.x + curveStrength;
  const cp2x = to.x - curveStrength;

  return `M ${from.x} ${from.y} C ${cp1x} ${from.y} ${cp2x} ${to.y} ${to.x} ${to.y}`;
}

export const Edge = ({ from, to, color, temporary, onClick }: EdgeProps) => {
  const onPathClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.();
    },
    [onClick]
  );

  const d = getPath(from, to);
  const style = color ? ({ '--edge-color': color } as CSSProperties) : undefined;

  return (
    <g className={`Edge${temporary ? ' Edge_temp' : ''}`} style={style}>
      {onClick && <path className="Edge_hit" d={d} onClick={onPathClick} />}
      <path className="Edge_line" d={d} />
      <circle cx={from.x} cy={from.y} r="3.5" />
      <circle cx={to.x} cy={to.y} r="3.5" />
    </g>
  );
};
