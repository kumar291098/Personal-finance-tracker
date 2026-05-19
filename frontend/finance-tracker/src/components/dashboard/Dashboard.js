import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, CalendarDays, CreditCard, Flag, Lightbulb, PieChart, Plus, Target, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { transactionService } from '../../services/transactionService';
import { formatCurrency, getISTDateString } from '../../utils/transactionUtils';
import StatsCard from '../shared/StatsCard';
import TransactionForm from '../transactions/TransactionForm';
import RecentTransactions from '../transactions/RecentTransactions';
import ExpenseChart from '../charts/ExpenseChart';
import IncomeExpenseChart from '../charts/IncomeExpenseChart';
import SharedBarChart from '../charts/SharedBarChart';
import SharedPieChart from '../charts/SharedPieChart';
import MaterialCard from '../shared/MaterialCard';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [dashboardFilters, setDashboardFilters] = useState({
    range: 'month',
    category: 'ALL'
  });
  const [goalData, setGoalData] = useState(() => {
    const defaultGoal = {
      title: 'Monthly Savings',
      targetAmount: '',
      targetDate: getISTDateString()
    };

    try {
      const savedGoal = localStorage.getItem('financeGoal');
      return savedGoal ? { ...defaultGoal, ...JSON.parse(savedGoal) } : defaultGoal;
    } catch (error) {
      return defaultGoal;
    }
  });
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    transactionCount: 0
  });

  const calculateStats = useCallback((transactionData) => {
    const income = transactionData
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactionData
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    setStats({
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      transactionCount: transactionData.length
    });
  }, []);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await transactionService.getUserTransactions();
      setTransactions(data);
      calculateStats(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateStats]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleTransactionAdded = () => {
    fetchTransactions();
    setShowTransactionForm(false);
  };

  const handleGoalChange = (e) => {
    const { name, value } = e.target;
    setGoalData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGoalSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('financeGoal', JSON.stringify(goalData));
    setShowGoalForm(false);
  };

  const openGoalForm = (title = goalData.title) => {
    setGoalData(prev => ({
      ...prev,
      title
    }));
    setShowGoalForm(true);
  };

  const getGreeting = () => {
    const hour = Number(new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hour12: false
    }).format(new Date()));
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.firstName?.trim() || user?.username || 'User';

  const getRecentTransactions = () => {
    return transactions
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  };

  const getRangeStartDate = () => {
    const now = new Date();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    switch (dashboardFilters.range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        return startDate;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        return startDate;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        return startDate;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        return startDate;
      default:
        return new Date(0);
    }
  };

  const getFilteredExpenses = () => {
    const startDate = getRangeStartDate();
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.transactionDate);
      const matchesType = transaction.type === 'EXPENSE';
      const matchesRange = transactionDate >= startDate;
      const matchesCategory = dashboardFilters.category === 'ALL' ||
        transaction.category === dashboardFilters.category;
      return matchesType && matchesRange && matchesCategory;
    });
  };

  const getExpenseCategories = () => {
    return [...new Set(
      transactions
        .filter(transaction => transaction.type === 'EXPENSE')
        .map(transaction => transaction.category || 'Other')
    )].sort();
  };

  const getCategoryInsights = () => {
    const expenses = getFilteredExpenses();
    const totals = expenses.reduce((acc, transaction) => {
      const category = transaction.category || 'Other';
      acc[category] = (acc[category] || 0) + transaction.amount;
      return acc;
    }, {});

    const total = Object.values(totals).reduce((sum, amount) => sum + amount, 0);
    return Object.entries(totals)
      .sort(([, firstAmount], [, secondAmount]) => secondAmount - firstAmount)
      .slice(0, 6)
      .map(([category, amount], index) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: ['#0f766e', '#2563eb', '#db2777', '#f59e0b', '#7c3aed', '#64748b'][index % 6]
      }));
  };

  const getDailyExpenseTrend = () => {
    const expenses = getFilteredExpenses();
    const totals = expenses.reduce((acc, transaction) => {
      const dateKey = getISTDateString(new Date(transaction.transactionDate));
      acc[dateKey] = (acc[dateKey] || 0) + transaction.amount;
      return acc;
    }, {});

    return Object.entries(totals)
      .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
      .slice(-10)
      .map(([date, amount]) => ({
        date,
        amount,
        label: new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short'
        })
      }));
  };

  const filteredExpenses = getFilteredExpenses();
  const categoryInsights = getCategoryInsights();
  const dailyExpenseTrend = getDailyExpenseTrend();
  const filteredExpenseTotal = filteredExpenses.reduce((sum, transaction) => sum + transaction.amount, 0);
  const topCategory = categoryInsights[0];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your financial overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <p className="dashboard-kicker">Personal Finance</p>
          <h1 className="dashboard-title">
            {getGreeting()}, {displayName}
          </h1>
          <p className="dashboard-subtitle">
            A clear view of your balance, cash flow, and recent activity.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowTransactionForm(true)}
          >
            <Plus size={18} />
            Add Transaction
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard
          title="Total Balance"
          value={stats.balance}
          type={stats.balance >= 0 ? 'success' : 'error'}
          trend={stats.balance >= 0 ? 'up' : 'down'}
          subtitle="Current balance"
        />
        <StatsCard
          title="Total Income"
          value={stats.totalIncome}
          type="success"
          trend="up"
          subtitle="This month"
        />
        <StatsCard
          title="Total Expenses"
          value={stats.totalExpenses}
          type="error"
          trend="down"
          subtitle="This month"
        />
        <StatsCard
          title="Transactions"
          value={stats.transactionCount}
          type="primary"
          subtitle="Total recorded"
          isCount={true}
        />
      </div>

      <div className="dashboard-grid">
        <div className="charts-section">
          <MaterialCard className="chart-card dashboard-insights-card">
            <div className="chart-header enhanced-chart-header">
              <div>
                <h3 className="chart-title"><PieChart size={20} /> Expense Intelligence</h3>
                <p className="chart-subtitle">Customize by date range and category</p>
              </div>
              <div className="dashboard-filter-row">
                <select
                  value={dashboardFilters.range}
                  onChange={(event) => setDashboardFilters(prev => ({ ...prev, range: event.target.value }))}
                  className="dashboard-filter-select"
                  aria-label="Expense date range"
                >
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last 3 Months</option>
                  <option value="year">Last Year</option>
                  <option value="all">All Time</option>
                </select>
                <select
                  value={dashboardFilters.category}
                  onChange={(event) => setDashboardFilters(prev => ({ ...prev, category: event.target.value }))}
                  className="dashboard-filter-select"
                  aria-label="Expense category"
                >
                  <option value="ALL">All Categories</option>
                  {getExpenseCategories().map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="expense-intelligence-grid">
              <div className="expense-focus-panel">
                <span className="focus-label">Filtered Expenses</span>
                <strong>{formatCurrency(filteredExpenseTotal)}</strong>
                <p>
                  {topCategory
                    ? `${topCategory.category} leads with ${topCategory.percentage.toFixed(1)}% of this view.`
                    : 'Add expense transactions to see category insights.'}
                </p>
              </div>

              <div className="category-donut-panel">
                <SharedPieChart
                  data={categoryInsights}
                  emptyMessage="No category data for this filter."
                  centerLabel="Total"
                  height={240}
                />
              </div>
            </div>
          </MaterialCard>

          <MaterialCard className="chart-card">
            <div className="chart-header enhanced-chart-header">
              <div>
                <h3 className="chart-title"><CalendarDays size={20} /> Date-wise Expenses</h3>
                <p className="chart-subtitle">Daily spending for the selected filter</p>
              </div>
            </div>
            <SharedBarChart
              data={dailyExpenseTrend}
              series={[{ dataKey: 'amount', label: 'Expenses', color: '#ef4444' }]}
              emptyMessage="No daily expense data for this filter."
              height={280}
              showLegend={false}
            />
          </MaterialCard>

          <MaterialCard className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Income vs Expenses</h3>
              <p className="chart-subtitle">Monthly comparison</p>
            </div>
            <IncomeExpenseChart transactions={transactions} />
          </MaterialCard>

          <MaterialCard className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Expense Categories</h3>
              <p className="chart-subtitle">Where your money goes</p>
            </div>
            <ExpenseChart transactions={transactions.filter(t => t.type === 'EXPENSE')} />
          </MaterialCard>
        </div>

        <MaterialCard className="recent-section">
          <div className="section-header">
            <h3 className="section-title">Recent Transactions</h3>
            <button className="view-all-btn" onClick={() => navigate('/transactions')}>
              View All
            </button>
          </div>
          <RecentTransactions
            transactions={getRecentTransactions()}
            onRefresh={fetchTransactions}
          />
        </MaterialCard>
      </div>

      <MaterialCard className="quick-actions">
        <h3 className="section-title">Quick Actions</h3>
        <div className="actions-grid">
          <MaterialCard className="action-card" component="button" type="button" onClick={() => setShowTransactionForm(true)}>
            <span className="action-icon"><CreditCard size={24} /></span>
            <span className="action-label">Add Expense</span>
          </MaterialCard>
          <MaterialCard className="action-card" component="button" type="button" onClick={() => setShowTransactionForm(true)}>
            <span className="action-icon"><Wallet size={24} /></span>
            <span className="action-label">Add Income</span>
          </MaterialCard>
          <MaterialCard className="action-card" component="button" type="button" onClick={() => navigate('/analytics')}>
            <span className="action-icon"><BarChart3 size={24} /></span>
            <span className="action-label">View Reports</span>
          </MaterialCard>
          <MaterialCard className="action-card" component="button" type="button" onClick={() => openGoalForm('Monthly Savings')}>
            <span className="action-icon"><Flag size={24} /></span>
            <span className="action-label">Set Goals</span>
          </MaterialCard>
        </div>
      </MaterialCard>

      <MaterialCard className="tips-section">
        <h3 className="section-title"><Lightbulb size={20} /> Financial Tips</h3>
        <div className="tips-grid">
          <MaterialCard
            type="button"
            className="tip-card"
            component="button"
            onClick={() => openGoalForm('Monthly Budget')}
          >
            <span className="tip-icon"><Target size={18} /></span>
            <div className="tip-content">
              <h4>Set Monthly Budgets</h4>
              <p>Create spending limits for different categories to stay on track.</p>
            </div>
          </MaterialCard>
          <MaterialCard
            type="button"
            className="tip-card"
            component="button"
            onClick={() => setShowTransactionForm(true)}
          >
            <span className="tip-icon"><CreditCard size={18} /></span>
            <div className="tip-content">
              <h4>Track Daily Expenses</h4>
              <p>Record transactions immediately to maintain accurate records.</p>
            </div>
          </MaterialCard>
          <MaterialCard
            type="button"
            className="tip-card"
            component="button"
            onClick={() => navigate('/analytics')}
          >
            <span className="tip-icon"><BarChart3 size={18} /></span>
            <div className="tip-content">
              <h4>Review Weekly</h4>
              <p>Check your spending patterns every week to identify trends.</p>
            </div>
          </MaterialCard>
        </div>
      </MaterialCard>

      {showTransactionForm && (
        <div className="modal-overlay" onClick={() => setShowTransactionForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Transaction</h3>
              <button
                className="modal-close"
                onClick={() => setShowTransactionForm(false)}
              >
                x
              </button>
            </div>
            <TransactionForm
              onSuccess={handleTransactionAdded}
              onCancel={() => setShowTransactionForm(false)}
            />
          </div>
        </div>
      )}

      {showGoalForm && (
        <div className="modal-overlay" onClick={() => setShowGoalForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Set Financial Goal</h3>
              <button
                className="modal-close"
                onClick={() => setShowGoalForm(false)}
                aria-label="Close goal form"
              >
                x
              </button>
            </div>
            <form className="goal-form" onSubmit={handleGoalSubmit}>
              <div className="goal-summary">
                <span className="goal-summary-icon"><Target size={20} /></span>
                <div>
                  <h4>{goalData.title || 'Monthly Goal'}</h4>
                  <p>
                    {goalData.targetAmount
                      ? `Target: ₹${Number(goalData.targetAmount).toLocaleString('en-IN')}`
                      : 'Choose an amount you want to save or reach.'}
                  </p>
                </div>
              </div>

              <div className="goal-field">
                <label htmlFor="goalTitle">Goal Name</label>
                <input
                  id="goalTitle"
                  name="title"
                  type="text"
                  value={goalData.title}
                  onChange={handleGoalChange}
                  placeholder="Monthly Savings"
                  required
                />
              </div>

              <div className="goal-field">
                <label htmlFor="targetAmount">Target Amount</label>
                <input
                  id="targetAmount"
                  name="targetAmount"
                  type="number"
                  min="1"
                  step="1"
                  value={goalData.targetAmount}
                  onChange={handleGoalChange}
                  placeholder="25000"
                  required
                />
              </div>

              <div className="goal-field">
                <label htmlFor="targetDate">Target Date</label>
                <input
                  id="targetDate"
                  name="targetDate"
                  type="date"
                  value={goalData.targetDate}
                  onChange={handleGoalChange}
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowGoalForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
