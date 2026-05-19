import React from 'react';
import { ArrowDownRight, ArrowUpRight, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/transactionUtils';
import SharedBarChart from './SharedBarChart';
import './Charts.css';

const IncomeExpenseChart = ({ transactions }) => {
  const chartData = getMonthlyChartData(transactions);
  const totals = chartData.reduce(
    (result, item) => ({
      income: result.income + item.income,
      expense: result.expense + item.expense
    }),
    { income: 0, expense: 0 }
  );
  const net = totals.income - totals.expense;
  const savingsRate = totals.income > 0 ? Math.max((net / totals.income) * 100, 0) : 0;

  if (chartData.length === 0) {
    return (
      <div className="chart-container income-expense-shell">
        <div className="chart-empty">
          <TrendingUp size={34} />
          <p>No data available for comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container income-expense-shell">
      <div className="cashflow-overview">
        <div className="cashflow-metric income">
          <span><ArrowUpRight size={16} /> Income</span>
          <strong>{formatCurrency(totals.income)}</strong>
        </div>
        <div className="cashflow-metric expense">
          <span><ArrowDownRight size={16} /> Expenses</span>
          <strong>{formatCurrency(totals.expense)}</strong>
        </div>
        <div className={`cashflow-metric net ${net >= 0 ? 'positive' : 'negative'}`}>
          <span>Net cash flow</span>
          <strong>{formatSignedCurrency(net)}</strong>
        </div>
      </div>

      <div className="cashflow-track">
        <div className="cashflow-track-header">
          <span>Savings rate</span>
          <strong>{savingsRate.toFixed(1)}%</strong>
        </div>
        <div className="cashflow-progress">
          <span style={{ width: `${Math.min(savingsRate, 100)}%` }} />
        </div>
      </div>

      <div className="income-expense-chart">
        <SharedBarChart
          data={chartData.map(item => ({
            ...item,
            label: formatMonth(item.month)
          }))}
          series={[
            { dataKey: 'income', label: 'Income', color: '#0f766e' },
            { dataKey: 'expense', label: 'Expenses', color: '#ef4444' }
          ]}
          emptyMessage="No data available for comparison"
          height={300}
        />
      </div>
    </div>
  );
};

const getMonthlyChartData = (transactions) => {
  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = new Date(transaction.transactionDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!acc[monthKey]) {
      acc[monthKey] = { income: 0, expense: 0, month: monthKey };
    }

    if (transaction.type === 'INCOME') {
      acc[monthKey].income += Number(transaction.amount || 0);
    } else {
      acc[monthKey].expense += Number(transaction.amount || 0);
    }

    return acc;
  }, {});

  return Object.values(monthlyData)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);
};

const formatMonth = (monthKey) => {
  const [year, month] = monthKey.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
};

const formatSignedCurrency = (amount) => {
  return `${amount >= 0 ? '+' : '-'}${formatCurrency(Math.abs(amount))}`;
};


export default IncomeExpenseChart;

