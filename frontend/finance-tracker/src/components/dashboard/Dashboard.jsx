import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transactionService } from '../../services/transactionService';
import './Dashboard.css';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    if (user && token) {
      loadTransactions();
    }
  }, [user, token]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await transactionService.getUserTransactions(user.id, token);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setError('Failed to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    if (filter !== 'all') {
      filtered = filtered.filter(t => t.type === filter);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const rangeDate = new Date();
      
      switch (dateRange) {
        case 'week':
          rangeDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          rangeDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          rangeDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(t => 
        new Date(t.transactionDate) >= rangeDate
      );
    }

    return filtered.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  };

  const filteredTransactions = getFilteredTransactions();

  const calculateMetrics = () => {
    const income = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const expenses = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const balance = income - expenses;

    return { income, expenses, balance };
  };

  const { income, expenses, balance } = calculateMetrics();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-message">
          <h3>Oops! Something went wrong</h3>
          <p>{error}</p>
          <button onClick={loadTransactions} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <p className="dashboard-kicker">Overview</p>
          <h1 className="dashboard-title">Financial Dashboard</h1>
          <p className="dashboard-subtitle">Welcome back, <strong>{user?.username}</strong>! Here is what's happening with your finances today.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Income</h3>
          <p className="amount income">{formatCurrency(income)}</p>
        </div>
        <div className="stat-card">
          <h3>Total Expenses</h3>
          <p className="amount expense">{formatCurrency(expenses)}</p>
        </div>
        <div className="stat-card">
          <h3>Net Balance</h3>
          <p className={`amount ${balance >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="charts-section">
          <div className="chart-card dashboard-insights-card">
            <div className="chart-header">
              <h3 className="chart-title">Filters</h3>
              <p className="chart-subtitle">Refine your transaction view</p>
            </div>
            <div className="dashboard-filter-row">
              <select className="dashboard-filter-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                <option value="all">All Transactions</option>
                <option value="INCOME">Income Only</option>
                <option value="EXPENSE">Expenses Only</option>
              </select>

              <select className="dashboard-filter-select" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="all">All Time</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </div>

        <div className="recent-section">
          <div className="section-header">
            <h3 className="section-title">Your Transactions</h3>
          </div>
          {filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions found. Start by adding your first transaction!</p>
            </div>
          ) : (
            <div className="transactions-list">
              {filteredTransactions.map(transaction => (
                <div key={transaction.id} className="transaction-card">
                  <div className="transaction-header">
                    <h4>{transaction.description}</h4>
                    <span className={`type ${transaction.type.toLowerCase()}`}>
                      {transaction.type}
                    </span>
                  </div>
                  <div className="transaction-details">
                    <p><strong>Amount:</strong> {formatCurrency(transaction.amount)}</p>
                    <p><strong>Category:</strong> {transaction.category || 'Other'}</p>
                    <p><strong>Date:</strong> {formatDate(transaction.transactionDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
