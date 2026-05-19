import React from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { formatCurrency } from '../../utils/transactionUtils';
import './SharedPieChart.css';

const DEFAULT_COLORS = [
  '#0f766e',
  '#2563eb',
  '#db2777',
  '#f59e0b',
  '#7c3aed',
  '#64748b'
];

const SharedPieChart = ({
  data = [],
  emptyMessage = 'No data available',
  height = 260,
  showLegend = true,
  centerLabel = 'Total',
  className = ''
}) => {
  const chartData = data
    .filter(item => Number(item.amount ?? item.value) > 0)
    .map((item, index) => ({
      id: item.id ?? item.category ?? item.label ?? index,
      label: item.label ?? item.category ?? 'Other',
      value: Number(item.amount ?? item.value),
      color: item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
    }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <div className={`shared-pie-chart shared-pie-chart-empty ${className}`.trim()} style={{ minHeight: height }}>
        <div className="shared-pie-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className={`shared-pie-chart ${className}`.trim()}>
      <div className="shared-pie-visual" style={{ height }}>
        <PieChart
          series={[
            {
              data: chartData,
              innerRadius: 62,
              outerRadius: 94,
              paddingAngle: 3,
              cornerRadius: 4,
              highlightScope: { fade: 'global', highlight: 'item' },
              faded: { innerRadius: 58, additionalRadius: -4, color: 'gray' },
              valueFormatter: item => formatCurrency(item.value)
            }
          ]}
          height={height}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          slotProps={{
            legend: { hidden: true }
          }}
        />
        <div className="shared-pie-center" aria-hidden="true">
          <span>{centerLabel}</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>

      {showLegend && (
        <div className="shared-pie-legend">
          {chartData.map(item => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.id} className="shared-pie-legend-item">
                <span className="shared-pie-swatch" style={{ backgroundColor: item.color }} />
                <span className="shared-pie-name">{item.label}</span>
                <strong className="shared-pie-value">{percentage.toFixed(0)}%</strong>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SharedPieChart;
