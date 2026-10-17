import React, { forwardRef } from 'react';
import CandlestickChart from '../CandlestickChart';

/**
 * WeeklyChart - Compact weekly timeframe candlestick chart for intermediate trend context.
 */
const WeeklyChart = forwardRef(function WeeklyChart({
  data,
  symbol,
  companyName,
  height = '100%',
  showSymbol = false,
  hideTools = true,
  showVolumeProfile = false,
  showYearlyThumbnail = false,
  showRsLine = false,
  showEarnings = false,
  ...rest
}, ref) {
  return (
    <CandlestickChart
      ref={ref}
      data={data}
      symbol={symbol}
      companyName={companyName}
      height={height}
      timeframe="weekly"
      showSymbol={showSymbol}
      hideTools={hideTools}
      showVolumeProfile={showVolumeProfile}
      showYearlyThumbnail={showYearlyThumbnail}
      showRsLine={showRsLine}
      showEarnings={showEarnings}
      {...rest}
    />
  );
});

export default WeeklyChart;

