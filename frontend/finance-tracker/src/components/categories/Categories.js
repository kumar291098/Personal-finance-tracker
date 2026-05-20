import React, { useCallback, useEffect, useState } from 'react';
import { categoryService } from '../../services/categoryService';
import './Categories.css';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE',
    icon: '📝'
  });

  const availableIcons = [
    '💼', '💻', '📈', '🍔', '🚗', '🛍️', '🎬', '⚡', '🏥', '📚', '🤝', '🛒', '🏏',
    '✈️', '🏠', '📱', '💰', '💸', '🎯', '🎨', '🏋️', '📝', '🔧',
    '🌟', '🎵', '📊', '🎮', '☕', '🍕', '🚌', '⛽', '💊', '📖'
  ];

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await categoryService.getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError('');
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, formData);
      } else {
        await categoryService.createCategory(formData);
      }
      await fetchCategories();
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save category');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon || '📝'
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category from your preferences?')) {
      return;
    }

    try {
      setError('');
      await categoryService.deleteCategory(categoryId);
      await fetchCategories();
    } catch (err) {
      setError(err.message || 'Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'EXPENSE',
      icon: '📝'
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const getIncomeCategories = () => categories.filter(cat => cat.type === 'INCOME');
  const getExpenseCategories = () => categories.filter(cat => cat.type === 'EXPENSE');

  const renderCategoryCard = (category, cardClass) => (
    <div key={category.id} className={`category-card ${cardClass}`}>
      <div className="category-icon">{category.icon}</div>
      <div className="category-info">
        <h4 className="category-name">{category.name}</h4>
        <span className="category-type">{category.type === 'INCOME' ? 'Income' : 'Expense'}</span>
      </div>
      <div className="category-actions">
        <button
          className="action-btn edit-btn"
          onClick={() => handleEdit(category)}
          aria-label={`Edit ${category.name}`}
        >
          ✏️
        </button>
        <button
          className="action-btn delete-btn"
          onClick={() => handleDelete(category.id)}
          aria-label={`Delete ${category.name}`}
        >
          🗑️
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="categories-page">
        <div className="categories-header-card">
          <div className="categories-header-content">
            <p className="categories-kicker">Categories</p>
            <h1 className="categories-title">Categories</h1>
            <p className="categories-subtitle">Loading your category preferences...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="categories-page">
      <div className="categories-header-card">
        <div className="categories-header-content">
          <p className="categories-kicker">Categories</p>
          <h1 className="categories-title">Categories</h1>
          <p className="categories-subtitle">
            Organize your transactions with custom categories.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-primary export-btn"
            onClick={() => setShowForm(true)}
          >
            <span>＋</span>
            Add Category
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="categories-content">
        <div className="category-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="section-icon">📈</span>
              Income Categories
            </h3>
            <span className="category-count">{getIncomeCategories().length} categories</span>
          </div>

          <div className="categories-grid">
            {getIncomeCategories().map(category => renderCategoryCard(category, 'income-card'))}
          </div>
        </div>

        <div className="category-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="section-icon">📉</span>
              Expense Categories
            </h3>
            <span className="category-count">{getExpenseCategories().length} categories</span>
          </div>

          <div className="categories-grid">
            {getExpenseCategories().map(category => renderCategoryCard(category, 'expense-card'))}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Add New Category'}</h3>
              <button className="modal-close" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="category-form">
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <div className="type-selector">
                  <label className={`type-option ${formData.type === 'INCOME' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value="INCOME"
                      checked={formData.type === 'INCOME'}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    />
                    <span className="type-icon">📈</span>
                    <span className="type-label">Income</span>
                  </label>
                  <label className={`type-option ${formData.type === 'EXPENSE' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="type"
                      value="EXPENSE"
                      checked={formData.type === 'EXPENSE'}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    />
                    <span className="type-icon">📉</span>
                    <span className="type-label">Expense</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Icon</label>
                <div className="icon-grid">
                  {availableIcons.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-option ${formData.icon === icon ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
