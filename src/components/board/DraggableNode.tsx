import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { draggable } from '../../lib/draggable';
import { NODE_WIDTH } from '../../model/geometry';

type DraggableNodeProps = {
  id: string;
  x: number;
  y: number;
  zoom: number;
  selected: boolean;
  onNodeUpdate: (id: string, position: { x: number; y: number }) => void;
  onClick: (id: string) => void;
  children: ReactNode;
};

const stopPropagation = (e: React.SyntheticEvent) => e.stopPropagation();

export function DraggableNode(props: DraggableNodeProps) {
  const { id, onNodeUpdate, onClick: onNodeClick } = props;
  const ref = useRef<HTMLDivElement>(null);
  const position = useRef({ x: props.x, y: props.y });
  const zoom = useRef(props.zoom);
  // The parent's callback changes identity whenever the graph changes (i.e. on
  // every drag step). Reading it through a ref keeps the pointer subscription
  // below stable for the whole drag instead of resetting it mid-gesture.
  const onNodeUpdateRef = useRef(onNodeUpdate);
  onNodeUpdateRef.current = onNodeUpdate;

  const onDrag = useCallback(
    (dx: number, dy: number) => {
      // Accumulate locally: pointer events can arrive faster than React
      // re-renders, so waiting for props.x/y to catch up would drop deltas.
      const pos = position.current;
      pos.x += dx / zoom.current;
      pos.y += dy / zoom.current;
      onNodeUpdateRef.current(id, { x: Math.round(pos.x), y: Math.round(pos.y) });
    },
    [id]
  );

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onNodeClick(id);
    },
    [id, onNodeClick]
  );

  useEffect(() => {
    position.current.x = props.x;
    position.current.y = props.y;
  }, [props.x, props.y]);

  useEffect(() => {
    zoom.current = props.zoom;
  }, [props.zoom]);

  useEffect(() => {
    if (!ref.current) return;
    return draggable(ref.current, onDrag);
  }, [onDrag]);

  const style = useMemo(
    () => ({
      transform: `translate(${props.x}px, ${props.y}px)`,
      width: `${NODE_WIDTH}px`,
    }),
    [props.x, props.y]
  );

  const className = `DraggableNode${props.selected ? ' DraggableNode_selected' : ''}`;

  return (
    <div
      className={className}
      style={style}
      ref={ref}
      onClick={onClick}
      onDoubleClick={stopPropagation}
    >
      <div className="DraggableNode_content">{props.children}</div>
    </div>
  );
}
