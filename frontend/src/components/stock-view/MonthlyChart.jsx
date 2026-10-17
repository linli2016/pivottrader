import React, { forwardRef } from 'react';
import CandlestickChart from '../CandlestickChart';

/**
 * MonthlyChart - Compact monthly timeframe candlestick chart for macro trend context.
 */
const MonthlyChart = forwardRef(function MonthlyChart({
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
      timeframe="monthly"
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

export default MonthlyChart;

