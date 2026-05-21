import React, { useEffect, useState } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import { formatCurrency } from '../../utils/transactionUtils';

const SharedLineChart = ({
  data = [],
  series = [],
  xKey = 'label',
  height = 320,
  emptyMessage = 'No line chart data available',
  showLegend = true,
  className = ''
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.getAttribute('data-theme') === 'dark');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  const hasData = data.some(item =>
    series.some(current => Number(item[current.dataKey] || 0) !== 0)
  );

  const tickColor = isDarkMode ? '#cbd5e1' : '#64748b';
  const gridColor = isDarkMode ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.25)';
  const axisColor = isDarkMode ? 'rgba(148, 163, 184, 0.32)' : 'rgba(148, 163, 184, 0.48)';

  if (!hasData) {
    return (
      <div className={`shared-line-chart shared-line-chart-empty ${className}`.trim()} style={{ minHeight: height }}>
        <div className="shared-line-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`shared-line-chart ${className}`.trim()}>
      <LineChart
        dataset={data}
        xAxis={[
          {
            scaleType: 'point',
            dataKey: xKey,
            tickLabelStyle: {
              fill: tickColor,
              fontSize: 12,
              fontWeight: 600
            }
          }
        ]}
        yAxis={[
          {
            valueFormatter: value => `INR ${Math.round(value)}`,
            tickLabelStyle: {
              fill: tickColor,
              fontSize: 12,
              fontWeight: 600
            }
          }
        ]}
        series={series.map(item => ({
          dataKey: item.dataKey,
          label: item.label,
          color: item.color,
          curve: 'monotoneX',
          showMark: true,
          valueFormatter: value => formatCurrency(value || 0)
        }))}
        height={height}
        grid={{ horizontal: true }}
        margin={{ top: showLegend ? 42 : 18, right: 18, bottom: 34, left: 72 }}
        slotProps={{
          legend: {
            hidden: !showLegend
          }
        }}
        sx={{
          '& .MuiChartsAxis-tickLabel': {
            fill: `${tickColor} !important`
          },
          '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': {
            stroke: `${axisColor} !important`
          },
          '& .MuiChartsGrid-line': {
            stroke: `${gridColor} !important`,
            strokeDasharray: '4 6'
          },
          '& .MuiLineElement-root': {
            strokeWidth: 3
          },
          '& .MuiMarkElement-root': {
            stroke: isDarkMode ? '#0f172a' : '#ffffff',
            strokeWidth: 2
          },
          '& .MuiChartsLegend-series text': {
            fill: isDarkMode ? '#e2e8f0 !important' : '#475569 !important',
            fontSize: '12px !important',
            fontWeight: '700 !important'
          }
        }}
      />
    </div>
  );
};

export default SharedLineChart;
