import React, { useEffect, useMemo, useState } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { formatCurrency } from '../../utils/transactionUtils';

const DEFAULT_COLORS = [
  '#0d9488', // teal
  '#3b82f6', // blue
  '#ec4899', // pink
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#64748b'  // slate
];

const SharedPieChart = ({
  data = [],
  emptyMessage = 'No data available',
  height = 260,
  showLegend = true,
  centerLabel = 'Total',
  className = ''
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setIsDarkMode(theme === 'dark');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    return data
      .filter(item => Number(item.amount ?? item.value) > 0)
      .map((item, index) => ({
        id: item.id ?? item.category ?? item.label ?? index,
        label: item.label ?? item.category ?? 'Other',
        value: Number(item.amount ?? item.value),
        color: item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
      }));
  }, [data]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const legendNameColor = isDarkMode ? '#e2e8f0' : '#475569';
  const legendValueColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const centerLabelColor = isDarkMode ? '#94a3b8' : '#64748b';
  const centerValueColor = isDarkMode ? '#f8fafc' : '#0f172a';

  if (chartData.length === 0) {
    return (
      <div
        className={`shared-pie-chart shared-pie-chart-empty ${className}`.trim()}
        style={{ minHeight: height }}
      >
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
              innerRadius: 58,
              outerRadius: 92,
              paddingAngle: 2.5,
              cornerRadius: 5,
              highlightScope: { fade: 'global', highlight: 'item' },
              faded: { innerRadius: 54, additionalRadius: -4, color: 'gray' },
              valueFormatter: item => formatCurrency(item.value)
            }
          ]}
          height={height}
          margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          slotProps={{ legend: { hidden: true } }}
          sx={{
            '& text': {
              fill: isDarkMode ? '#e2e8f0 !important' : '#475569 !important'
            },
            '& .MuiPieArcLabel-root': {
              fill: isDarkMode ? '#e2e8f0 !important' : '#475569 !important'
            }
          }}
        />

        <div className="shared-pie-center" aria-hidden="true">
          <span style={{ color: centerLabelColor }}>
            {centerLabel}
          </span>
          <strong style={{ color: centerValueColor }}>
            {formatCurrency(total)}
          </strong>
        </div>
      </div>

      {showLegend && (
        <>
          <div className="shared-pie-divider" />

          <div className="shared-pie-legend" role="list" aria-label="Chart legend">
            {chartData.map(item => {
              const pct = total > 0 ? (item.value / total) * 100 : 0;

              return (
                <div
                  key={item.id}
                  className="shared-pie-legend-item"
                  role="listitem"
                >
                  <span
                    className="shared-pie-swatch"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />

                  <span
                    className="shared-pie-name"
                    style={{ color: legendNameColor }}
                    title={item.label}
                  >
                    {item.label}
                  </span>

                  <strong
                    className="shared-pie-value"
                    style={{ color: legendValueColor }}
                  >
                    {pct.toFixed(0)}%
                  </strong>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SharedPieChart;
