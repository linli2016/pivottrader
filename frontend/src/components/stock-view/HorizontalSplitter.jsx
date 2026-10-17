import React from 'react';

/**
 * HorizontalSplitter - Draggable row-resize divider between Daily and Bottom (Monthly/Weekly) charts.
 */
export default function HorizontalSplitter({
  isResizing = false,
  onMouseDown,
  onDoubleClick,
  title = 'Drag to adjust height between Daily and Monthly/Weekly charts (Double-click to reset)',
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      className={`stock-view-horizontal-splitter ${isResizing ? 'resizing' : ''}`}
      title={title}
      role="separator"
      aria-orientation="horizontal"
    >
      <div className="stock-view-horizontal-splitter-grip" />
    </div>
  );
}

