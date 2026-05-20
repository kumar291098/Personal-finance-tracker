import React, { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, PieChart, TrendingDown, TrendingUp, Target, Download, FileText, AlertCircle } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { transactionService } from '../../services/transactionService';
import SharedBarChart from '../charts/SharedBarChart';
import SharedHorizontalBarChart from '../charts/SharedHorizontalBarChart';
import SharedPieChart from '../charts/SharedPieChart';
import { formatCurrency } from '../../utils/transactionUtils';
import './Analytics.css';

const defaultGoal = {
  title: 'Monthly Savings',
  targetAmount: '',
  targetDate: ''
};

const periodOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last Month' },
  { value: 'year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
  { value: 'all', label: 'All Time' }
];

const Analytics = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trends');
  const [analysisFilter, setAnalysisFilter] = useState({
    period: 'all',
    startDate: '',
    endDate: ''
  });

  const readSavedGoal = () => {
    try {
      const savedGoal = localStorage.getItem('financeGoal');
      return savedGoal ? { ...defaultGoal, ...JSON.parse(savedGoal) } : defaultGoal;
    } catch (error) {
      return defaultGoal;
    }
  };
  const [goal, setGoal] = useState(readSavedGoal);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    const refreshAnalyticsData = () => {
      setGoal(readSavedGoal());
      fetchTransactions();
    };

    window.addEventListener('focus', refreshAnalyticsData);
    window.addEventListener('storage', refreshAnalyticsData);

    return () => {
      window.removeEventListener('focus', refreshAnalyticsData);
      window.removeEventListener('storage', refreshAnalyticsData);
    };
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await transactionService.getUserTransactions();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartOfToday = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getEndOfToday = () => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const getDateRange = (filter) => {
    const now = new Date();
    const startDate = getStartOfToday();

    switch (filter.period) {
      case 'today':
        return { startDate, endDate: getEndOfToday() };
      case 'week':
        startDate.setDate(now.getDate() - 7);
        return { startDate, endDate: getEndOfToday() };
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        return { startDate, endDate: getEndOfToday() };
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        return { startDate, endDate: getEndOfToday() };
      case 'custom':
        return {
          startDate: filter.startDate ? new Date(`${filter.startDate}T00:00:00`) : new Date(0),
          endDate: filter.endDate ? new Date(`${filter.endDate}T23:59:59`) : new Date()
        };
      default:
        return { startDate: new Date(0), endDate: getEndOfToday() };
    }
  };

  const getTotal = (items) => items.reduce((sum, transaction) => sum + transaction.amount, 0);

  const filterTransactionsByRange = (type) => {
    const { startDate, endDate } = getDateRange(analysisFilter);
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.transactionDate);
      return transaction.type === type &&
        transactionDate >= startDate &&
        transactionDate <= endDate;
    });
  };

  const updateFilter = (field, value) => {
    setAnalysisFilter(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getAnalytics = () => {
    const incomeTransactions = filterTransactionsByRange('INCOME');
    const expenseTransactions = filterTransactionsByRange('EXPENSE');
    const periodTransactions = [...incomeTransactions, ...expenseTransactions];

    const income = getTotal(incomeTransactions);
    const expenses = getTotal(expenseTransactions);
    const allIncome = getTotal(transactions.filter(transaction => transaction.type === 'INCOME'));
    const allExpenses = getTotal(transactions.filter(transaction => transaction.type === 'EXPENSE'));
    const achievedAmount = Math.max(allIncome - allExpenses, 0);
    const targetAmount = Number(goal.targetAmount) || 0;
    const goalProgress = targetAmount > 0
      ? Math.min((achievedAmount / targetAmount) * 100, 100)
      : 0;

    const categoryBreakdown = periodTransactions.reduce((acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = { income: 0, expense: 0, count: 0 };
      }

      if (transaction.type === 'INCOME') {
        acc[transaction.category].income += transaction.amount;
      } else {
        acc[transaction.category].expense += transaction.amount;
      }

      acc[transaction.category].count += 1;
      return acc;
    }, {});

    return {
      incomeTransactions,
      expenseTransactions,
      periodTransactions,
      income,
      expenses,
      balance: income - expenses,
      transactionCount: periodTransactions.length,
      incomeCount: incomeTransactions.length,
      expenseCount: expenseTransactions.length,
      categoryBreakdown,
      avgTransaction: periodTransactions.length > 0
        ? (income + expenses) / periodTransactions.length
        : 0,
      goal: {
        targetAmount,
        achievedAmount,
        remainingAmount: Math.max(targetAmount - achievedAmount, 0),
        progress: goalProgress
      }
    };
  };

  const analytics = getAnalytics();
  
  const getCategoryChartData = (type) => {
    const source = type === 'income' ? analytics.incomeTransactions : analytics.expenseTransactions;
    const totals = source.reduce((acc, transaction) => {
      const category = transaction.category || 'Other';
      acc[category] = (acc[category] || 0) + transaction.amount;
      return acc;
    }, {});
    const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
    const colors = type === 'income'
      ? ['#16a34a', '#0f766e', '#2563eb', '#7c3aed', '#0891b2', '#64748b']
      : ['#ef4444', '#f97316', '#db2777', '#7c3aed', '#2563eb', '#64748b'];

    return Object.entries(totals)
      .sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount)
      .slice(0, 6)
      .map(([category, amount], index) => ({
        category,
        amount,
        color: colors[index % colors.length],
        percentage: total > 0 ? (amount / total) * 100 : 0
      }));
  };

  const getMonthlyTrend = () => {
    const grouped = analytics.periodTransactions.reduce((acc, transaction) => {
      const date = new Date(transaction.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!acc[key]) {
        acc[key] = { month: key, income: 0, expense: 0 };
      }

      if (transaction.type === 'INCOME') {
        acc[key].income += transaction.amount;
      } else {
        acc[key].expense += transaction.amount;
      }

      return acc;
    }, {});

    return Object.values(grouped)
      .sort((first, second) => first.month.localeCompare(second.month))
      .slice(-6)
      .map(item => ({
        ...item,
        label: new Date(`${item.month}-01T00:00:00`).toLocaleDateString('en-IN', {
          month: 'short',
          year: '2-digit'
        })
      }));
  };

  const getDailyTrend = () => {
    const grouped = analytics.periodTransactions.reduce((acc, transaction) => {
      const date = new Date(transaction.transactionDate);
      const key = date.toISOString().slice(0, 10);

      if (!acc[key]) {
        acc[key] = { date: key, income: 0, expense: 0, balance: 0 };
      }

      if (transaction.type === 'INCOME') {
        acc[key].income += transaction.amount;
      } else {
        acc[key].expense += transaction.amount;
      }

      acc[key].balance = acc[key].income - acc[key].expense;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((first, second) => first.date.localeCompare(second.date))
      .slice(-12)
      .map(item => ({
        ...item,
        label: new Date(`${item.date}T00:00:00`).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short'
        })
      }));
  };

  const expenseCategoryData = getCategoryChartData('expense');
  const incomeCategoryData = getCategoryChartData('income');
  const monthlyTrend = getMonthlyTrend();
  const dailyTrend = getDailyTrend();

  const getExportRows = () => {
    return analytics.periodTransactions.map(transaction => ({
      Date: new Date(transaction.transactionDate).toLocaleDateString('en-IN'),
      Type: transaction.type,
      Category: transaction.category || 'Other',
      Description: transaction.description || '',
      Amount: transaction.amount
    }));
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const escapeCell = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const escapeCsvCell = (value) => {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
  };

  const exportCsv = () => {
    const rows = getExportRows();
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount'];
    const summaryRows = [
      ['FinanceTracker Report'],
      ['Total Income', analytics.income],
      ['Total Expenses', analytics.expenses],
      ['Net Balance', analytics.balance],
      ['Goal Progress', `${analytics.goal.progress.toFixed(1)}%`],
      [],
      headers
    ];
    const csv = [
      ...summaryRows.map(row => row.map(escapeCsvCell).join(',')),
      ...rows.map(row => headers.map(header => escapeCsvCell(row[header])).join(','))
    ].join('\r\n');

    downloadFile(`\uFEFF${csv}`, `finance-report-${Date.now()}.csv`, 'text/csv;charset=utf-8');
  };

  const exportPdf = () => {
    const rows = getExportRows();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>FinanceTracker Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 6px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
            .box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; }
            .box span { display: block; color: #6b7280; font-size: 12px; }
            .box strong { display: block; margin-top: 6px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>FinanceTracker Report</h1>
          <p>Income, expenses, and goal progress from the selected filters.</p>
          <div class="summary">
            <div class="box"><span>Income</span><strong>${escapeCell(formatCurrency(analytics.income))}</strong></div>
            <div class="box"><span>Expenses</span><strong>${escapeCell(formatCurrency(analytics.expenses))}</strong></div>
            <div class="box"><span>Balance</span><strong>${escapeCell(formatCurrency(analytics.balance))}</strong></div>
            <div class="box"><span>Goal</span><strong>${analytics.goal.progress.toFixed(1)}%</strong></div>
          </div>
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
            <tbody>
              ${rows.map(row => `<tr><td>${escapeCell(row.Date)}</td><td>${escapeCell(row.Type)}</td><td>${escapeCell(row.Category)}</td><td>${escapeCell(row.Description)}</td><td>${escapeCell(formatCurrency(row.Amount))}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      {/* Header */}
      <div className="analytics-header">
        <div className="header-top">
          <div>
            <p className="header-kicker">Analytics & Reports</p>
            <h1 className="header-title">Financial Dashboard</h1>
            <p className="header-subtitle">Track income, expenses, and progress toward your financial goals.</p>
          </div>
          <div className="header-actions">
            <button className="export-btn" onClick={exportCsv}>
              <Download size={18} />
              Export CSV
            </button>
            <button className="export-btn pdf-btn" onClick={exportPdf}>
              <FileText size={18} />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="filter-card">
        <div className="filter-header">
          <CalendarDays size={20} />
          <h3>Analysis Period</h3>
        </div>
        <div className="filter-controls">
          <div className="filter-group">
            <select
              value={analysisFilter.period}
              onChange={(e) => updateFilter('period', e.target.value)}
              className="select"
            >
              {periodOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {analysisFilter.period === 'custom' && (
            <div className="date-inputs">
              <input
                type="date"
                value={analysisFilter.startDate}
                onChange={(e) => updateFilter('startDate', e.target.value)}
                className="input"
              />
              <input
                type="date"
                value={analysisFilter.endDate}
                onChange={(e) => updateFilter('endDate', e.target.value)}
                className="input"
              />
            </div>
          )}
        </div>
        <div className="filter-info">
          {analytics.transactionCount} transactions in this view
        </div>
      </div>

      {/* Goal Card */}
      <div className="goal-card">
        <div className="goal-header">
          <Target size={20} />
          <div>
            <h3>{goal.title || 'Financial Goal'}</h3>
            {goal.targetDate && <p>{goal.targetDate}</p>}
          </div>
          <div className="goal-badge">{analytics.goal.progress.toFixed(0)}%</div>
        </div>
        <div className="goal-progress-bar">
          <div className="progress-fill" style={{ width: `${analytics.goal.progress}%` }}></div>
        </div>
        <div className="goal-details">
          <div className="goal-detail">
            <span>Achieved</span>
            <strong>{formatCurrency(analytics.goal.achievedAmount)}</strong>
          </div>
          <div className="goal-detail">
            <span>Target</span>
            <strong>{analytics.goal.targetAmount ? formatCurrency(analytics.goal.targetAmount) : 'Not set'}</strong>
          </div>
          <div className="goal-detail">
            <span>Remaining</span>
            <strong>{analytics.goal.targetAmount ? formatCurrency(analytics.goal.remainingAmount) : formatCurrency(0)}</strong>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon income-icon">📈</div>
          <div className="stat-info">
            <p className="stat-label">Total Income</p>
            <h3 className="stat-value">{formatCurrency(analytics.income)}</h3>
            <small>Selected period</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon expense-icon">📉</div>
          <div className="stat-info">
            <p className="stat-label">Total Expenses</p>
            <h3 className="stat-value">{formatCurrency(analytics.expenses)}</h3>
            <small>Selected period</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon balance-icon">💰</div>
          <div className="stat-info">
            <p className="stat-label">Net Balance</p>
            <h3 className={`stat-value ${analytics.balance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(analytics.balance)}
            </h3>
            <small>Income - Expenses</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon avg-icon">📊</div>
          <div className="stat-info">
            <p className="stat-label">Avg Transaction</p>
            <h3 className="stat-value">{formatCurrency(analytics.avgTransaction)}</h3>
            <small>Average amount</small>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-section">
        <div className="tabs-nav">
          <button
            className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <TrendingUp size={18} />
            <span>Trends</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <PieChart size={18} />
            <span>Categories</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'breakdown' ? 'active' : ''}`}
            onClick={() => setActiveTab('breakdown')}
          >
            <BarChart3 size={18} />
            <span>Breakdown</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="tabs-content">
          {/* Trends Tab */}
          {activeTab === 'trends' && (
            <div className="tab-panel">
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h3><TrendingUp size={20} /> Daily Cash Flow</h3>
                    <p>Income, expenses, and net balance over time</p>
                  </div>
                </div>
                {dailyTrend.length === 0 ? (
                  <div className="empty-chart">
                    <AlertCircle size={24} />
                    <p>No data available for this period</p>
                  </div>
                ) : (
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dailyTrend} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="income" name="Income" stroke="#16a34a" strokeWidth={2} />
                        <Line type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" strokeWidth={2} />
                        <Line type="monotone" dataKey="balance" name="Balance" stroke="#2563eb" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h3><BarChart3 size={20} /> Monthly Cash Flow</h3>
                    <p>Month-wise income and expense trends</p>
                  </div>
                </div>
                <SharedBarChart
                  data={monthlyTrend}
                  series={[
                    { dataKey: 'income', label: 'Income', color: '#16a34a' },
                    { dataKey: 'expense', label: 'Expenses', color: '#ef4444' }
                  ]}
                  emptyMessage="No cash flow data available for this range."
                  height={280}
                />
              </div>
            </div>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div className="tab-panel">
              <div className="chart-grid">
                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3><PieChart size={20} /> Expense Categories</h3>
                      <p>Top spending categories</p>
                    </div>
                  </div>
                  <SharedPieChart
                    data={expenseCategoryData}
                    emptyMessage="No expense categories available."
                    centerLabel="Expenses"
                    height={280}
                  />
                </div>

                <div className="chart-card">
                  <div className="chart-header">
                    <div>
                      <h3><TrendingUp size={20} /> Income Sources</h3>
                      <p>Where your money comes from</p>
                    </div>
                  </div>
                  <SharedHorizontalBarChart
                    data={incomeCategoryData.map(item => ({
                      label: item.category,
                      amount: item.amount
                    }))}
                    series={[{ dataKey: 'amount', label: 'Income', color: '#16a34a' }]}
                    emptyMessage="No income sources available."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Breakdown Tab */}
          {activeTab === 'breakdown' && (
            <div className="tab-panel">
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h3><TrendingDown size={20} /> Income vs Expense Ratio</h3>
                    <p>Comparative analysis of selected periods</p>
                  </div>
                </div>
                <SharedHorizontalBarChart
                  data={[
                    { label: 'Income', income: analytics.income, expenses: 0 },
                    { label: 'Expenses', income: 0, expenses: analytics.expenses }
                  ]}
                  series={[
                    { dataKey: 'income', label: 'Income', color: '#16a34a' },
                    { dataKey: 'expenses', label: 'Expenses', color: '#ef4444' }
                  ]}
                  emptyMessage="No data available."
                  height={200}
                />
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <h3><BarChart3 size={20} /> Category Breakdown</h3>
                    <p>{Object.keys(analytics.categoryBreakdown).length} categories</p>
                  </div>
                </div>
                {Object.keys(analytics.categoryBreakdown).length === 0 ? (
                  <div className="empty-chart">
                    <AlertCircle size={24} />
                    <p>No transactions for the selected period</p>
                  </div>
                ) : (
                  <div className="category-grid">
                    {Object.entries(analytics.categoryBreakdown).map(([category, data]) => (
                      <div key={category} className="category-card">
                        <div className="category-header">
                          <h4>{category}</h4>
                          <span className="count-badge">{data.count}x</span>
                        </div>
                        <div className="category-amounts">
                          {data.income > 0 && <div className="amount income-amt">+{formatCurrency(data.income)}</div>}
                          {data.expense > 0 && <div className="amount expense-amt">-{formatCurrency(data.expense)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Insights */}
      <div className="insights-section">
        <h3>💡 Financial Insights</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Spending Pattern</h4>
            <p>
              {analytics.expenses > analytics.income
                ? "⚠️ You're spending more than you earn. Consider reducing expenses."
                : "✓ Your income exceeds expenses for this period."}
            </p>
          </div>
          <div className="insight-card">
            <h4>Transaction Activity</h4>
            <p>
              📊 {analytics.transactionCount} total transactions ({analytics.incomeCount} income, {analytics.expenseCount} expenses)
            </p>
          </div>
          <div className="insight-card">
            <h4>Goal Progress</h4>
            <p>
              {analytics.goal.targetAmount > 0
                ? `🎯 ${analytics.goal.progress.toFixed(1)}% complete - ${formatCurrency(analytics.goal.remainingAmount)} left`
                : "Set a goal from the dashboard to track progress."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
