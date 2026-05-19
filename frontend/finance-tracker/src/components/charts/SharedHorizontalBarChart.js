import React from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import { formatCurrency } from '../../utils/transactionUtils';
import './SharedHorizontalBarChart.css';

const SharedHorizontalBarChart = ({
  data = [],
  series,
  yKey = 'label',
  height,
  emptyMessage = 'No chart data available',
  className = ''
}) => {
  const chartSeries = series || [{ dataKey: 'amount', label: 'Amount', color: '#0f766e' }];
  const hasData = data.some(item =>
    chartSeries.some(current => Number(item[current.dataKey] || 0) > 0)
  );
  const chartHeight = height || Math.max(180, data.length * 48 + 64);

  if (!hasData) {
    return (
      <div className={`shared-horizontal-bar shared-horizontal-bar-empty ${className}`.trim()} style={{ minHeight: chartHeight }}>
        <div className="shared-horizontal-bar-message">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`shared-horizontal-bar ${className}`.trim()}>
      <BarChart
        dataset={data}
        layout="horizontal"
        yAxis={[
          {
            scaleType: 'band',
            dataKey: yKey,
            tickLabelStyle: {
              fill: '#64748b',
              fontSize: 12
            }
          }
        ]}
        xAxis={[
          {
            valueFormatter: value => formatCurrency(value || 0),
            tickLabelStyle: {
              fill: '#64748b',
              fontSize: 12
            }
          }
        ]}
        series={chartSeries.map(item => ({
          dataKey: item.dataKey,
          label: item.label,
          color: item.color,
          valueFormatter: value => formatCurrency(value || 0)
        }))}
        height={chartHeight}
        borderRadius={6}
        grid={{ vertical: true }}
        margin={{ top: 20, right: 20, bottom: 34, left: 96 }}
        slotProps={{
          legend: { hidden: chartSeries.length < 2 }
        }}
      />
    </div>
  );
};

export default SharedHorizontalBarChart;
