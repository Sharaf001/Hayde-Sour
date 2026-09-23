import { useRef, type PointerEvent as ReactPointerEvent } from 'react';

// Lets a card be dismissed by dragging its top handle down past a
// threshold. Uses direct DOM style writes during the drag (no React state)
// so tracking the finger stays smooth even on slower phones.
//
// Two reliability fixes over a plain distance threshold:
// - a fast short flick also counts (velocity check), since browsers don't
//   always deliver enough pointermove events for a slow-drag distance check
//   to catch a quick swipe
// - onLostPointerCapture acts as a safety net for cases where the browser
//   silently drops pointer capture without firing pointerup/pointercancel,
//   which otherwise leaves the drag "stuck" and the handle unresponsive
export function useSwipeToClose<T extends HTMLElement>(onClose: () => void, threshold = 70) {
  const cardRef = useRef<T | null>(null);
  const drag = useRef({ startY: 0, startTime: 0, dragging: false });

  const onPointerDown = (event: ReactPointerEvent) => {
    drag.current = { startY: event.clientY, startTime: event.timeStamp, dragging: true };
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
    const elapsed = Math.max(1, event.timeStamp - drag.current.startTime);
    const velocity = delta / elapsed; // px per ms
    drag.current.dragging = false;
    cardRef.current.style.transform = '';
    if (delta > threshold || (delta > 24 && velocity > 0.5)) onClose();
  };

  return {
    cardRef,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag,
    },
  };
}
