import React from 'react';
import SharedPieChart from './SharedPieChart';
import './Charts.css';

const ExpenseChart = ({ transactions }) => {
  const categoryTotals = transactions.reduce((acc, transaction) => {
    const category = transaction.category || 'Other';
    acc[category] = (acc[category] || 0) + transaction.amount;
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount)
    .slice(0, 6);

  const getColor = (index) => {
    const colors = [
      'var(--error-500)',
      'var(--warning-500)',
      'var(--primary-500)',
      'var(--success-500)',
      'var(--secondary-500)',
      'var(--gray-500)'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="chart-container">
      <SharedPieChart
        data={sortedCategories.map(([category, amount], index) => ({
          category,
          amount,
          color: getColor(index)
        }))}
        emptyMessage="No expense data available"
        centerLabel="Expenses"
      />
    </div>
  );
};

export default ExpenseChart;
