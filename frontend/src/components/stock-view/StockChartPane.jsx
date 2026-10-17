import React, { forwardRef } from 'react';
import StockInfo from './StockInfo';
import MultiTimeframeChart from './MultiTimeframeChart';

/**
 * StockChartPane - The primary chart area combining StockInfo header and MultiTimeframeChart.
 */
const StockChartPane = forwardRef(function StockChartPane({
  stock,
  stockDetail = null,
  stockPrices = [],
  loadingPrices = false,
  asOfDate = null,
  setupName = null,
  marketRegime = null,
  // Watchlist props
  watchlists = [],
  targetWatchlistId = null,
  onTargetWatchlistChange = null,
  onToggleWatchlist = null,
  isWatchlistSaved = false,
  // Multi-chart toggle & split state
  showMultiCharts = true,
  onToggleMultiCharts = null,
  multiChartTopPct = 62,
  onMultiChartTopPctChange = null,
  // Inspector drawer toggle
  isDetailCollapsed = true,
  onToggleDetail = null,
  // Group navigation
  onSelectGroup = null,
  // Header extra elements
  headerExtra = null,
  // Chart specific props
  tradeExecutions = null,
  tradePriceLines = null,
  showVolumeProfile = true,
  showScreenshotButton = false,
  onScreenshotSaved = null,
  showYearlyThumbnail = null,
  showRsLine = null,
  showEarnings = null,
  showSymbol = null,
}, ref) {
  const symbol = stock?.symbol || stock?.ticker || (typeof stock === 'string' ? stock : '');
  const companyName = stock?.name || stockDetail?.metadata?.name || symbol;

  return (
    <div className="stock-view-chart-pane">
      {/* Top Header Bar */}
      <StockInfo
        stock={stock}
        stockDetail={stockDetail}
        stockPrices={stockPrices}
        loadingPrices={loadingPrices}
        watchlists={watchlists}
        targetWatchlistId={targetWatchlistId}
        onTargetWatchlistChange={onTargetWatchlistChange}
        onToggleWatchlist={onToggleWatchlist}
        isWatchlistSaved={isWatchlistSaved}
        showMultiCharts={showMultiCharts}
        onToggleMultiCharts={onToggleMultiCharts}
        isDetailCollapsed={isDetailCollapsed}
        onToggleDetail={onToggleDetail}
        onSelectGroup={onSelectGroup}
        asOfDate={asOfDate}
        setupName={setupName}
        marketRegime={marketRegime}
        headerExtra={headerExtra}
      />

      {/* Main Chart Area */}
      <MultiTimeframeChart
        ref={ref}
        data={stockPrices}
        symbol={symbol}
        companyName={companyName}
        asOfDate={asOfDate}
        setupName={setupName}
        showMultiCharts={showMultiCharts}
        multiChartTopPct={multiChartTopPct}
        onMultiChartTopPctChange={onMultiChartTopPctChange}
        loadingPrices={loadingPrices}
        showVolumeProfile={showVolumeProfile}
        tradeExecutions={tradeExecutions}
        tradePriceLines={tradePriceLines}
        showScreenshotButton={showScreenshotButton}
        onScreenshotSaved={onScreenshotSaved}
        showYearlyThumbnail={showYearlyThumbnail}
        showRsLine={showRsLine}
        showEarnings={showEarnings}
        showSymbol={showSymbol}
      />
    </div>
  );
});

export default StockChartPane;

