import React from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  ListChecks,
  TrendingDown,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { formatCurrency } from '../../utils/transactionUtils';
import MaterialCard from './MaterialCard';
import './StatsCard.css';

const StatsCard = ({
  title,
  value,
  type = 'primary',
  trend,
  subtitle,
  isCount = false,
  onClick
}) => {
  const formatValue = (val) => {
    if (isCount) {
      return val.toLocaleString();
    }

    if (typeof val === 'number') {
      return formatCurrency(Math.abs(val));
    }

    return val;
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />;
  };

  const getMainIcon = () => {
    const normalizedTitle = title.toLowerCase();
    if (normalizedTitle.includes('balance') || normalizedTitle.includes('net')) return <Wallet size={24} />;
    if (normalizedTitle.includes('income')) return <TrendingUp size={24} />;
    if (normalizedTitle.includes('expense')) return <TrendingDown size={24} />;
    if (normalizedTitle.includes('transaction')) return <ListChecks size={24} />;
    if (normalizedTitle.includes('amount')) return <Banknote size={24} />;
    return <Activity size={24} />;
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success': return 'stats-card-success';
      case 'error': return 'stats-card-error';
      case 'warning': return 'stats-card-warning';
      default: return 'stats-card-primary';
    }
  };

  return (
    <MaterialCard
      className={`stats-card ${getTypeClass()} ${onClick ? 'stats-card-clickable' : ''}`}
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick}
    >
      <div className="stats-card-header">
        <div className="stats-card-icon">
          {getMainIcon()}
        </div>
        {trend && (
          <div className={`stats-card-trend trend-${trend}`}>
            {getTrendIcon()}
          </div>
        )}
      </div>

      <div className="stats-card-content">
        <div className="stats-card-value">
          {!isCount && value < 0 && <span className="negative-sign">-</span>}
          {formatValue(value)}
        </div>
        <div className="stats-card-title">{title}</div>
        {subtitle && (
          <div className="stats-card-subtitle">{subtitle}</div>
        )}
      </div>
    </MaterialCard>
  );
};

export default StatsCard;
