import React from 'react';

/**
 * StockListSplitter - Reusable col-resize vertical splitter between Stock View and Stock List.
 * Follows the visual design of WatchlistsTab divider.
 */
export default function StockListSplitter({
  isResizing = false,
  onMouseDown,
  title = 'Drag to resize chart / table panels',
  className = '',
  style = {},
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={`stock-list-splitter ${isResizing ? 'resizing' : ''} ${className}`}
      title={title}
      role="separator"
      aria-orientation="vertical"
      style={style}
    >
      <div className="stock-list-splitter-grip" />
    </div>
  );
}

