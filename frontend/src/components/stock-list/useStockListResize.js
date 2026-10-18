import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useStockListResize - Hook to manage draggable panel width with localStorage persistence.
 * Tailored for right-side panels (dragging left increases width, dragging right decreases width).
 */
export function useStockListResize({
  storageKey = 'pt_stock_list_panel_width',
  defaultWidth = 380,
  minWidth = 260,
  maxWidth = null,
} = {}) {
  const [panelWidth, setPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= minWidth) return val;
      }
    } catch (_) {}
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(defaultWidth);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = panelWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const delta = resizeStartXRef.current - e.clientX;
      const computedMax = maxWidth || (window.innerWidth - 80);
      const newWidth = Math.max(minWidth, Math.min(resizeStartWidthRef.current + delta, computedMax));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try {
          localStorage.setItem(storageKey, panelWidth);
        } catch (_) {}
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, panelWidth, minWidth, maxWidth, storageKey]);

  return { panelWidth, isResizing, startResizing, setPanelWidth };
}

export default useStockListResize;

