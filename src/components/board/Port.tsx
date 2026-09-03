import { useCallback } from 'react';
import type { PortDirection } from '../../model/geometry';

export type PortSelection = {
  id: string;
  direction: PortDirection;
  port: string;
};

type PortProps = {
  moduleId: string;
  direction: PortDirection;
  port: string;
  connected: boolean;
  active: boolean;
  onClick: (selection: PortSelection) => void;
};

export const Port = ({ moduleId, direction, port, connected, active, onClick }: PortProps) => {
  const onButtonClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onClick({ id: moduleId, direction, port });
    },
    [moduleId, direction, port, onClick]
  );

  const className = `Port Port_${direction}${connected ? ' Port_connected' : ''}${active ? ' Port_active' : ''}`;

  return (
    <button
      type="button"
      className={className}
      title={`${direction === 'in' ? 'Input' : 'Output'}: ${port}`}
      onClick={onButtonClick}
      onDoubleClick={onButtonClick}
    />
  );
};
