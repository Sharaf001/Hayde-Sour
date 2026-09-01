import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

// Lets a card be dismissed by dragging its top handle down past a
// threshold. Uses direct DOM style writes during the drag (no React state)
// so tracking the finger stays smooth even on slower phones.
export function useSwipeToClose<T extends HTMLElement>(onClose: () => void, threshold = 90) {
  const cardRef = useRef<T | null>(null);
  const drag = useRef({ startY: 0, dragging: false });

  const onPointerDown = (event: ReactPointerEvent) => {
    drag.current = { startY: event.clientY, dragging: true };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!drag.current.dragging || !cardRef.current) return;
    const delta = Math.max(0, event.clientY - drag.current.startY);
    cardRef.current.style.transform = delta ? `translateY(${delta}px)` : '';
  };

  const endDrag = (event: ReactPointerEvent) => {
    if (!drag.current.dragging || !cardRef.current) return;
    const delta = Math.max(0, event.clientY - drag.current.startY);
    drag.current.dragging = false;
    cardRef.current.style.transform = '';
    if (delta > threshold) onClose();
  };

  return {
    cardRef,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
