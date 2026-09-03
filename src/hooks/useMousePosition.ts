import { useEffect, useState } from 'react';

export function useMousePosition(zoom = 1) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      setMousePos({
        x: (e.clientX + scrollX) / zoom,
        y: (e.clientY + scrollY) / zoom,
      });
    };

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, [zoom]);

  return mousePos;
}
