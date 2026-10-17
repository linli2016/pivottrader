import React from 'react';

/**
 * VerticalSplitter - Draggable col-resize divider between Stock Chart Pane and Stock Detail Panel.
 */
export default function VerticalSplitter({
  isResizing = false,
  onMouseDown,
  title = 'Drag to resize Stock Inspector panel',
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`stock-view-vertical-splitter ${isResizing ? 'resizing' : ''}`}
      title={title}
      role="separator"
      aria-orientation="vertical"
    >
      <div className="stock-view-vertical-splitter-grip" />
    </div>
  );
}

