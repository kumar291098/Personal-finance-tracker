import React from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { formatCurrency } from '../../utils/transactionUtils';
import './SharedBarChart.css';

const SharedBarChart = ({
  data = [],
  series = [],
  xKey = 'label',
  height = 300,
  emptyMessage = 'No chart data available',
  showLegend = true,
  className = ''
}) => {
  const hasData = data.some(item =>
    series.some(current => Number(item[current.dataKey] || 0) > 0)
  );

  if (!hasData) {
    return (
      <div className={`shared-bar-chart shared-bar-chart-empty ${className}`.trim()} style={{ minHeight: height }}>
        <div className="shared-bar-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`shared-bar-chart ${className}`.trim()}>
      <BarChart
        dataset={data}
        xAxis={[
          {
            scaleType: 'band',
            dataKey: xKey,
            tickLabelStyle: {
              fill: '#64748b',
              fontSize: 12
            }
          }
        ]}
        yAxis={[
          {
            valueFormatter: value => `INR ${Math.round(value)}`,
            tickLabelStyle: {
              fill: '#64748b',
              fontSize: 12
            }
          }
        ]}
        series={series.map(item => ({
          dataKey: item.dataKey,
          label: item.label,
          color: item.color,
          valueFormatter: value => formatCurrency(value || 0)
        }))}
        height={height}
        borderRadius={6}
        grid={{ horizontal: true }}
        margin={{ top: showLegend ? 42 : 18, right: 16, bottom: 34, left: 68 }}
        slotProps={{
          legend: {
            hidden: !showLegend
          }
        }}
      />
    </div>
  );
};

export default SharedBarChart;
