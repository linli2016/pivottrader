import React, { forwardRef } from 'react';
import CandlestickChart from '../CandlestickChart';

/**
 * DailyChart - Primary daily timeframe candlestick chart.
 * Reusable standalone (e.g. in Trading Journal with execution markers) or inside StockView.
 */
const DailyChart = forwardRef(function DailyChart({
  data,
  symbol,
  companyName,
  asOfDate = null,
  setupName = null,
  height = '100%',
  showVolumeProfile = true,
  tradeExecutions = null,
  tradePriceLines = null,
  showScreenshotButton = false,
  onScreenshotSaved = null,
  earnings = null,
  showPriceLine = true,
  hideTools = false,
  showYearlyThumbnail = null,
  showRsLine = null,
  showEarnings = null,
  showSymbol = null,
  ...rest
}, ref) {
  return (
    <CandlestickChart
      ref={ref}
      data={data}
      symbol={symbol}
      companyName={companyName}
      asOfDate={asOfDate}
      setupName={setupName}
      height={height}
      timeframe="daily"
      showVolumeProfile={showVolumeProfile}
      tradeExecutions={tradeExecutions}
      tradePriceLines={tradePriceLines}
      showScreenshotButton={showScreenshotButton}
      onScreenshotSaved={onScreenshotSaved}
      earnings={earnings}
      showPriceLine={showPriceLine}
      hideTools={hideTools}
      showYearlyThumbnail={showYearlyThumbnail}
      showRsLine={showRsLine}
      showEarnings={showEarnings}
      showSymbol={showSymbol}
      {...rest}
    />
  );
});

export default DailyChart;

