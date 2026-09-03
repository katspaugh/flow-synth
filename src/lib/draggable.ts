export function draggable(
  element: HTMLElement | SVGElement,
  onDrag: (dx: number, dy: number, x: number, y: number) => void,
  onStart?: (x: number, y: number) => void,
  onEnd?: (x: number, y: number) => void,
  { threshold = 3, touchDelay = 100 } = {}
) {
  if (!element) return () => void 0;

  let isPointerDown = false;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let touchStart = 0;
  const isTouchDevice = matchMedia('(pointer: coarse)').matches;

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    if (e.shiftKey) return;
    // Let form controls inside a node (sliders, selects) work normally.
    if ((e.target as HTMLElement).closest('input, select, button')) return;
    e.stopPropagation();

    isPointerDown = true;
    isDragging = false;
    touchStart = Date.now();
    startX = e.clientX;
    startY = e.clientY;
  };

  const onPointerUp = (e: PointerEvent) => {
    isPointerDown = false;
    touchStart = 0;

    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();

      setTimeout(() => {
        isDragging = false;
      }, 300);

      const rect = element.getBoundingClientRect();
      const x = lastX - rect.left;
      const y = lastY - rect.top;
      onEnd?.(x, y);
    }
  };

  const onPointerMove = (e: PointerEvent) => {
    if (e.shiftKey) return;
    if (!isPointerDown) return;
    if (isTouchDevice && Date.now() - touchStart < touchDelay) {
      touchStart = Date.now();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const x = e.clientX;
    const y = e.clientY;
    const dx = x - startX;
    const dy = y - startY;

    lastX = x;
    lastY = y;

    if (isDragging || Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      if (!isDragging) {
        const rect = element.getBoundingClientRect();
        onStart?.(startX - rect.left, startY - rect.top);
        isDragging = true;
      }

      onDrag(dx, dy, x, y);

      startX = x;
      startY = y;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
    }
  };

  // Prevent clicks after dragging
  const onClick = (event: Event) => isDragging && event.stopPropagation();

  element.addEventListener('pointerdown', onPointerDown as EventListener);
  element.addEventListener('click', onClick, true);

  document.addEventListener('click', onClick, true);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointerleave', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown as EventListener);
    element.removeEventListener('click', onClick, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointerleave', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
  };
}
