import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import MaterialCard from '../shared/MaterialCard';
import { DEFAULT_FILTERS } from './transactionConstants';

const TransactionControls = ({
  filters,
  categories,
  sortBy,
  sortOrder,
  onFilterChange,
  onResetFilters,
  onSortByChange,
  onSortOrderToggle
}) => {
  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const submitSearch = (event) => {
    event.preventDefault();
    onFilterChange('search', searchInput.trim());
  };

  const resetFilters = () => {
    setSearchInput(DEFAULT_FILTERS.search);
    onResetFilters();
  };

  return (
    <MaterialCard className="transactions-controls">
      <form className="search-section" onSubmit={submitSearch}>
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="search-input"
          />
          <button className="btn btn-primary search-submit-btn" type="submit">
            Search
          </button>
        </div>
      </form>

      <div className="filters-section">
        <select
          value={filters.type}
          onChange={(event) => onFilterChange('type', event.target.value)}
          className="filter-select"
        >
          <option value="ALL">All Types</option>
          <option value="INCOME">Income</option>
          <option value="EXPENSE">Expense</option>
        </select>

        <select
          value={filters.category}
          onChange={(event) => onFilterChange('category', event.target.value)}
          className="filter-select"
        >
          <option value="ALL">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <select
          value={filters.dateRange}
          onChange={(event) => onFilterChange('dateRange', event.target.value)}
          className="filter-select"
        >
          <option value="ALL">All Time</option>
          <option value="TODAY">Today</option>
          <option value="WEEK">Last 7 Days</option>
          <option value="MONTH">Last Month</option>
          <option value="YEAR">Last Year</option>
        </select>

        <button className="btn btn-secondary" type="button" onClick={resetFilters}>
          Clear Filters
        </button>
      </div>

      <div className="sort-section">
        <label className="sort-label" htmlFor="transactionSortBy">Sort by:</label>
        <select
          id="transactionSortBy"
          value={sortBy}
          onChange={(event) => onSortByChange(event.target.value)}
          className="sort-select"
        >
          <option value="date">Date</option>
          <option value="amount">Amount</option>
          <option value="category">Category</option>
          <option value="description">Description</option>
        </select>
        <button className="sort-order-btn" type="button" onClick={onSortOrderToggle}>
          {sortOrder === 'asc' ? 'Up' : 'Down'}
        </button>
      </div>
    </MaterialCard>
  );
};

export default TransactionControls;
