import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  ChartLine,
  Clapperboard,
  Edit3,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Plane,
  ReceiptText,
  ShoppingBag,
  Trophy,
  Trash2,
  Utensils,
  Zap
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/transactionUtils';
import MaterialCard from '../shared/MaterialCard';
import './TransactionList.css';

const categoryIcons = {
  Salary: Briefcase,
  Freelance: BookOpen,
  Investment: ChartLine,
  Food: Utensils,
  'Food & Dining': Utensils,
  Transportation: Car,
  Shopping: ShoppingBag,
  Entertainment: Clapperboard,
  Utilities: Zap,
  Healthcare: HeartPulse,
  Education: GraduationCap,
  Donation: HandHeart,
  Grocery: ShoppingBag,
  Sports: Trophy,
  Travel: Plane,
  Income: Banknote,
  Expense: ReceiptText
};

const TransactionList = ({
  transactions,
  onEdit,
  onDelete,
  sortBy,
  sortOrder,
  onSort
}) => {
  const formatAmount = (amount, type) => {
    const formatted = formatCurrency(amount);
    return type === 'INCOME' ? `+${formatted}` : `-${formatted}`;
  };

  const getCategoryIcon = (category) => {
    const Icon = categoryIcons[category] || ReceiptText;
    return <Icon size={16} />;
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={14} />;
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="transaction-list-empty">
        <div className="empty-icon"><ReceiptText size={28} /></div>
        <h3>No transactions found</h3>
        <p>Try adjusting your filters or add some transactions.</p>
      </div>
    );
  }

  return (
    <div className="transaction-list">
      <div className="transaction-table-container">
        <table className="transaction-table">
          <thead>
            <tr>
              <th>
                <button className="sort-header" onClick={() => onSort('date')}>
                  Date <span className="sort-icon">{getSortIcon('date')}</span>
                </button>
              </th>
              <th>
                <button className="sort-header" onClick={() => onSort('description')}>
                  Description <span className="sort-icon">{getSortIcon('description')}</span>
                </button>
              </th>
              <th>
                <button className="sort-header" onClick={() => onSort('category')}>
                  Category <span className="sort-icon">{getSortIcon('category')}</span>
                </button>
              </th>
              <th>
                <button className="sort-header" onClick={() => onSort('amount')}>
                  Amount <span className="sort-icon">{getSortIcon('amount')}</span>
                </button>
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(transaction => (
              <tr
                key={transaction.id}
                className={`transaction-row ${transaction.type.toLowerCase()}`}
              >
                <td className="date-cell">{formatDate(transaction.transactionDate)}</td>
                <td className="description-cell">
                  <div className="description-content">
                    <span className="category-icon">
                      {getCategoryIcon(transaction.category)}
                    </span>
                    <span className="description-text">{transaction.description}</span>
                  </div>
                </td>
                <td className="category-cell">
                  <span className={`category-badge ${transaction.type.toLowerCase()}`}>
                    {transaction.category}
                  </span>
                </td>
                <td className={`amount-cell ${transaction.type.toLowerCase()}`}>
                  {formatAmount(transaction.amount, transaction.type)}
                </td>
                <td className="actions-cell">
                  <div className="action-buttons">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => onEdit(transaction)}
                      title="Edit transaction"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => onDelete(transaction.id)}
                      title="Delete transaction"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="transaction-cards">
        {transactions.map(transaction => (
          <MaterialCard
            key={transaction.id}
            className={`transaction-card ${transaction.type.toLowerCase()}`}
          >
            <div className="card-header">
              <div className="card-icon">
                {getCategoryIcon(transaction.category)}
              </div>
              <div className="card-info">
                <div className="card-description">{transaction.description}</div>
                <div className="card-date">{formatDate(transaction.transactionDate)}</div>
              </div>
              <div className={`card-amount ${transaction.type.toLowerCase()}`}>
                {formatAmount(transaction.amount, transaction.type)}
              </div>
            </div>

            <div className="card-body">
              <div className="card-category">
                <span className={`category-badge ${transaction.type.toLowerCase()}`}>
                  {transaction.category}
                </span>
              </div>

              <div className="card-actions">
                <button className="action-btn edit-btn" onClick={() => onEdit(transaction)}>
                  <Edit3 size={16} />
                  Edit
                </button>
                <button className="action-btn delete-btn" onClick={() => onDelete(transaction.id)}>
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>
          </MaterialCard>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
