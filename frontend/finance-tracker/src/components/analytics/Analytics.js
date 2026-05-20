import React, { useEffect, useState } from 'react';
<<<<<<< HEAD
import { BarChart3, CalendarDays, FileSpreadsheet, Flag, PieChart, Printer, TrendingDown, TrendingUp, Target } from 'lucide-react';
=======
import { BarChart3, CalendarDays, PieChart, TrendingDown, TrendingUp, Target, Download, FileText } from 'lucide-react';
>>>>>>> main
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
<<<<<<< HEAD
=======
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
>>>>>>> main
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { transactionService } from '../../services/transactionService';
import StatsCard from '../shared/StatsCard';
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
<<<<<<< HEAD
  const categoryTotal = expenseCategoryData.reduce((sum, item) => sum + item.amount, 0);
  const maxTrendAmount = Math.max(
    ...monthlyTrend.flatMap(item => [item.income, item.expense]),
    1
  );
=======
>>>>>>> main
  const incomeExpenseTotal = Math.max(analytics.income + analytics.expenses, 1);
  const incomeShare = (analytics.income / incomeExpenseTotal) * 100;
  const expenseShare = (analytics.expenses / incomeExpenseTotal) * 100;

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
      <div className="analytics-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header-card">
        <div className="analytics-header-content">
          <p className="analytics-kicker">Analytics</p>
          <h1 className="analytics-title">Analytics & Reports</h1>
          <p className="analytics-subtitle">
            Track income, expenses, date ranges, trends, and progress toward your goal.
          </p>
        </div>
        <div className="header-actions">
<<<<<<< HEAD
          <button className="btn btn-secondary export-btn" onClick={exportCsv}>
            <FileSpreadsheet size={18} />
            Export CSV
          </button>
          <button className="btn btn-primary export-btn" onClick={exportPdf}>
            <Printer size={18} />
=======
          <button className="export-btn" onClick={exportCsv}>
            <Download size={18} />
            Export CSV
          </button>
          <button className="export-btn pdf-btn" onClick={exportPdf}>
            <FileText size={18} />
>>>>>>> main
            Export PDF
          </button>
        </div>
      </div>

      <div className="analytics-controls-grid">
        <div className="analytics-card">
          <div className="analytics-card-content">
            <div className="control-header">
              <span className="control-icon"><CalendarDays size={20} /></span>
              <div>
                <h3 className="control-title">Analysis Date Range</h3>
                <p className="control-subtitle">{analytics.transactionCount} transactions in this view</p>
              </div>
            </div>
            
            <div className="control-form-group">
              <label htmlFor="analysis-period">Range</label>
              <select
                id="analysis-period"
                value={analysisFilter.period}
                onChange={(event) => updateFilter('period', event.target.value)}
                className="analytics-select"
              >
                {periodOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            
            {analysisFilter.period === 'custom' && (
              <div className="custom-date-grid">
                <div className="control-form-group">
                  <label htmlFor="start-date">From</label>
                  <input
                    id="start-date"
                    type="date"
                    className="analytics-input"
                    value={analysisFilter.startDate}
                    onChange={(event) => updateFilter('startDate', event.target.value)}
                  />
                </div>
                <div className="control-form-group">
                  <label htmlFor="end-date">To</label>
                  <input
                    id="end-date"
                    type="date"
                    className="analytics-input"
                    value={analysisFilter.endDate}
                    onChange={(event) => updateFilter('endDate', event.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-content">
            <div className="control-header">
              <span className="control-icon goal-icon"><Target size={20} /></span>
              <div>
                <h3 className="control-title">{goal.title || 'Financial Goal'}</h3>
                <p className="control-subtitle">
                  {goal.targetDate ? `Target date ${goal.targetDate}` : 'Set a goal from Dashboard'}
                </p>
              </div>
            </div>
            
            <div className="goal-progress-container">
              <div className="goal-progress-header">
                <span className="goal-achieved">{formatCurrency(analytics.goal.achievedAmount)} achieved</span>
                <span className="goal-percent">{analytics.goal.progress.toFixed(0)}%</span>
              </div>
              <div className="goal-progress-track">
                <div 
                  className="goal-progress-fill" 
                  style={{ width: `${analytics.goal.progress}%` }}
                ></div>
              </div>
              <div className="goal-progress-footer">
                <span>Goal: {analytics.goal.targetAmount ? formatCurrency(analytics.goal.targetAmount) : 'Not set'}</span>
                <span>Left: {analytics.goal.targetAmount ? formatCurrency(analytics.goal.remainingAmount) : formatCurrency(0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-stats">
        <StatsCard
          title="Total Income"
          value={analytics.income}
          icon="📈"
          type="success"
          trend="up"
          subtitle="Selected date range"
        />
        <StatsCard
          title="Total Expenses"
          value={analytics.expenses}
          icon="📉"
          type="error"
          trend="down"
          subtitle="Selected date range"
        />
        <StatsCard
          title="Net Balance"
          value={analytics.balance}
          icon="💰"
          type={analytics.balance >= 0 ? 'success' : 'error'}
          trend={analytics.balance >= 0 ? 'up' : 'down'}
          subtitle="Income - expenses"
        />
        <StatsCard
          title="Avg Transaction"
          value={analytics.avgTransaction}
          icon="📊"
          type="primary"
          subtitle="Average amount"
        />
      </div>

      <div className="report-grid">
        <div className="report-card report-card-wide">
          <div className="report-card-header">
            <div>
              <h3><TrendingUp size={20} /> Cash Flow Line</h3>
              <p>Daily income, expenses, and net balance for the selected date range.</p>
            </div>
          </div>
          {dailyTrend.length === 0 ? (
            <div className="empty-analytics">No line chart data available for this range.</div>
          ) : (
            <div className="line-chart-wrap">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={dailyTrend} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `INR ${Math.round(value)}`}
                    width={70}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(value), name]}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Expenses"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="report-card report-card-wide">
          <div className="report-card-header">
            <div>
              <h3><BarChart3 size={20} /> Cash Flow Trend</h3>
              <p>Month-wise income and expenses for the selected filters.</p>
            </div>
          </div>
          <div className="cashflow-chart" style={{ display: 'block', minHeight: 'auto', padding: 0 }}>
            {monthlyTrend.length === 0 ? (
              <div className="empty-analytics">No cash flow data available for this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={monthlyTrend} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="label" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    tickFormatter={(value) => `₹${Math.round(value)}`} 
                  />
                  <Tooltip 
                    formatter={(value, name) => [formatCurrency(value), name]} 
                    cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} 
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)' }} 
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="income" name="Income" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-header">
            <div>
              <h3><PieChart size={20} /> Expense Mix</h3>
              <p>Top categories by spend.</p>
            </div>
          </div>
          <div className="analytics-donut-layout">
            <div className="analytics-donut-container" style={{ width: '100%', height: 220 }}>
              {expenseCategoryData.length === 0 ? (
                <div className="empty-analytics" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}>
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={expenseCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="amount"
                      nameKey="category"
                      stroke="none"
                    >
                      {expenseCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)} 
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)' }} 
                      itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="donut-list">
              {expenseCategoryData.length === 0 ? (
                <div className="empty-analytics">No expense categories yet.</div>
              ) : expenseCategoryData.map(item => (
                <div key={item.category} className="donut-list-item">
                  <span style={{ backgroundColor: item.color }} />
                  <p>{item.category}</p>
                  <strong>{item.percentage.toFixed(0)}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="report-card">
          <div className="report-card-header">
            <div>
              <h3><TrendingUp size={20} /> Income Sources</h3>
              <p>Where your money comes from.</p>
            </div>
          </div>
          <div className="source-list">
            {incomeCategoryData.length === 0 ? (
              <div className="empty-analytics">No income sources for this range.</div>
            ) : incomeCategoryData.map(item => (
              <div key={item.category} className="source-item">
                <div>
                  <span>{item.category}</span>
                  <strong>{formatCurrency(item.amount)}</strong>
                </div>
                <div className="source-track">
                  <span style={{ width: `${item.percentage}%`, backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="report-card report-card-wide">
          <div className="report-card-header">
            <div>
              <h3><TrendingDown size={20} /> Income vs Expense Ratio</h3>
              <p>Compare the selected income filter against the selected expense filter.</p>
            </div>
          </div>
          <div className="ratio-chart">
            <div className="ratio-row">
              <span>Income</span>
              <div><i className="ratio-income" style={{ width: `${incomeShare}%` }} /></div>
              <strong>{formatCurrency(analytics.income)}</strong>
            </div>
            <div className="ratio-row">
              <span>Expenses</span>
              <div><i className="ratio-expense" style={{ width: `${expenseShare}%` }} /></div>
              <strong>{formatCurrency(analytics.expenses)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-content">
        <div className="category-breakdown">
          <h3 className="section-title"><CalendarDays size={20} /> Category Breakdown</h3>
          <div className="category-list">
            {Object.keys(analytics.categoryBreakdown).length === 0 ? (
              <div className="empty-analytics">
                No transactions found for the selected filters.
              </div>
            ) : (
              Object.entries(analytics.categoryBreakdown).map(([category, data]) => (
                <div key={category} className="category-item">
                  <div className="category-info">
                    <span className="category-name">{category}</span>
                    <span className="category-count">{data.count} transactions</span>
                  </div>
                  <div className="category-amounts">
                    {data.income > 0 && (
                      <span className="income-amount">
                        +{formatCurrency(data.income)}
                      </span>
                    )}
                    {data.expense > 0 && (
                      <span className="expense-amount">
                        -{formatCurrency(data.expense)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="insights-section">
          <h3 className="section-title">Financial Insights</h3>
          <div className="insights-grid">
            <div className="insight-card">
              <span className="insight-icon">💡</span>
              <div className="insight-content">
                <h4>Spending Pattern</h4>
                <p>
                  {analytics.expenses > analytics.income
                    ? "You're spending more than you earn for these filters. Try narrowing expenses by week or category."
                    : "Your filtered income is ahead of expenses for this view."
                  }
                </p>
              </div>
            </div>

            <div className="insight-card">
              <span className="insight-icon">📊</span>
              <div className="insight-content">
                <h4>Transaction Frequency</h4>
                <p>
                  This view includes {analytics.transactionCount} transactions:
                  {' '}{analytics.incomeCount} income and {analytics.expenseCount} expense.
                </p>
              </div>
            </div>

            <div className="insight-card">
              <span className="insight-icon">🎯</span>
              <div className="insight-content">
                <h4>Goal Progress</h4>
                <p>
                  {analytics.goal.targetAmount > 0
                    ? `You have achieved ${analytics.goal.progress.toFixed(1)}% of your goal with ${formatCurrency(analytics.goal.remainingAmount)} remaining.`
                    : "Set a goal from the dashboard to track achieved vs target progress here."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
