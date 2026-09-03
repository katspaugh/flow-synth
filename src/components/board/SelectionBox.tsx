import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { draggable } from '../../lib/draggable';

type Box = { x1: number; y1: number; x2: number; y2: number };

type SelectionBoxProps = {
  zoom: number;
  onChange: (box: Box) => void;
};

const HIDDEN: Box = { x1: -10000, y1: -10000, x2: -10000, y2: -10000 };

function MouseSelectionBox({ zoom, onChange }: SelectionBoxProps) {
  const [box, setBox] = useState<Box>(HIDDEN);
  const ref = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  // The live box lives in a ref: pointer moves accumulate faster than renders.
  const boxRef = useRef<Box>(HIDDEN);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const onDragStart = useCallback((x: number, y: number) => {
    const z = zoomRef.current;
    boxRef.current = { x1: x / z, y1: y / z, x2: x / z, y2: y / z };
    setBox(boxRef.current);
  }, []);

  const onDrag = useCallback((dx: number, dy: number) => {
    const z = zoomRef.current;
    const prevBox = boxRef.current;
    const newBox = { ...prevBox, x2: prevBox.x2 + dx / z, y2: prevBox.y2 + dy / z };
    boxRef.current = newBox;
    setBox(newBox);

    const flippedBox = { ...newBox };
    if (flippedBox.x2 < flippedBox.x1) {
      [flippedBox.x1, flippedBox.x2] = [flippedBox.x2, flippedBox.x1];
    }
    if (flippedBox.y2 < flippedBox.y1) {
      [flippedBox.y1, flippedBox.y2] = [flippedBox.y2, flippedBox.y1];
    }
    onChangeRef.current(flippedBox);
  }, []);

  const onDragEnd = useCallback(() => {
    boxRef.current = HIDDEN;
    setBox(HIDDEN);
  }, []);

  useEffect(() => {
    if (!ref.current) return;
    return draggable(ref.current, onDrag, onDragStart, onDragEnd);
  }, [onDrag, onDragStart, onDragEnd]);

  let width = box.x2 - box.x1;
  let height = box.y2 - box.y1;
  let left = box.x1;
  let top = box.y1;

  if (width < 0) {
    left = box.x2;
    width = -width;
  }

  if (height < 0) {
    top = box.y2;
    height = -height;
  }

  const style = useMemo(
    () => ({
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    }),
    [left, top, width, height]
  );

  return (
    <div className="SelectionBox" ref={ref}>
      <div style={style} />
    </div>
  );
}

export function SelectionBox(props: SelectionBoxProps) {
  const isTouchDevice = matchMedia('(pointer: coarse)').matches;
  if (isTouchDevice) return null;
  return <MouseSelectionBox {...props} />;
}
