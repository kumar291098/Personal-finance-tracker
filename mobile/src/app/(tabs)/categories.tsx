import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator,
  TextInput, Modal, Alert, Platform,
} from 'react-native';
import { getTransactions, Transaction } from '../../api/transactions';
import { createCategory, getCategories, Category } from '../../api/categories';
import { useTheme, Fonts, Radii } from '../../theme';

const CATEGORY_EMOJIS: Record<string, string> = {
  food: '🍔', groceries: '🛒', transport: '🚗', health: '💊', fitness: '💪',
  entertainment: '🎬', shopping: '🛍️', utilities: '💡', rent: '🏠', salary: '💼',
  freelance: '💻', investment: '📈', education: '📚', travel: '✈️', other: '📦',
};

function getEmoji(cat: string) {
  const key = cat.toLowerCase();
  return CATEGORY_EMOJIS[key] || '💰';
}

type CategorySummary = {
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon?: string;
  income: number;
  expense: number;
  count: number;
};

export default function CategoriesScreen() {
  const { colors, shadows, isDark } = useTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeType, setActiveType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');

  const showAlert = useCallback((title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txData, categoryData] = await Promise.all([getTransactions(), getCategories()]);
      setTransactions(txData);
      setCategories(categoryData);
    } catch (error: any) {
      showAlert('Categories Error', error?.message || 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAddModal = () => {
    setNewCategoryName('');
    setNewCategoryType('EXPENSE');
    setNewCategoryIcon('');
    setModalVisible(true);
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    const icon = newCategoryIcon.trim() || '$';

    if (!name) {
      showAlert('Validation Error', 'Please enter a category name.');
      return;
    }

    setSaving(true);
    try {
      await createCategory({ name, type: newCategoryType, icon });
      setModalVisible(false);
      await loadData();
    } catch (error: any) {
      showAlert('Category Error', error?.message || 'Could not add category.');
    } finally {
      setSaving(false);
    }
  };

  // Build category summaries
  const categoryMap: Record<string, CategorySummary> = {};
  categories.forEach(category => {
    const key = category.name || 'Other';
    categoryMap[key] = {
      name: key,
      type: category.type,
      icon: category.icon,
      income: 0,
      expense: 0,
      count: 0,
    };
  });

  transactions.forEach(t => {
    const key = t.category || 'Other';
    if (!categoryMap[key]) {
      categoryMap[key] = {
        name: key,
        type: t.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        income: 0,
        expense: 0,
        count: 0,
      };
    }
    if (t.type === 'INCOME') categoryMap[key].income += t.amount;
    else categoryMap[key].expense += t.amount;
    categoryMap[key].count += 1;
  });

  const allCategories = Object.values(categoryMap);
  const filteredCategories = allCategories.filter(c => {
    if (activeType === 'INCOME') return c.type === 'INCOME' || c.income > 0;
    if (activeType === 'EXPENSE') return c.type === 'EXPENSE' || c.expense > 0;
    return true;
  }).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));

  const totalCategories = allCategories.length;
  const totalTransactions = transactions.length;
  const uniqueExpenseCategories = allCategories.filter(c => c.expense > 0).length;

  if (loading) return (
    <View style={[s.root, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={[s.pageTitle, { color: colors.textPrimary }]}>Categories</Text>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.primary }, shadows.violet]}
            onPress={openAddModal}
            activeOpacity={0.84}
          >
            <Text style={s.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={[s.statBadge, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.statNum, { color: colors.primary }]}>{totalCategories}</Text>
            <Text style={[s.statLbl, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[s.statBadge, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.statNum, { color: colors.primary }]}>{uniqueExpenseCategories}</Text>
            <Text style={[s.statLbl, { color: colors.textSecondary }]}>Expense Types</Text>
          </View>
          <View style={[s.statBadge, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.statNum, { color: colors.primary }]}>{totalTransactions}</Text>
            <Text style={[s.statLbl, { color: colors.textSecondary }]}>Transactions</Text>
          </View>
        </View>

        {/* Filter Row */}
        <View style={s.filterRow}>
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                s.filterBtn,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
                activeType === f && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setActiveType(f)}
            >
              <Text
                style={[
                  s.filterText,
                  { color: colors.textSecondary },
                  activeType === f && { color: '#fff', fontWeight: Fonts.bold },
                ]}
              >
                {f === 'ALL' ? '🔀 All' : f === 'INCOME' ? '📈 Income' : '📉 Expense'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Cards */}
        {filteredCategories.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyEmoji}>🏷️</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No categories yet</Text>
            <Text style={[s.emptySubtext, { color: colors.textMuted }]}>
              Add a category to organize future transactions
            </Text>
          </View>
        ) : (
          filteredCategories.map(cat => {
            const emoji = cat.icon || getEmoji(cat.name);

            return (
              <View
                key={cat.name}
                style={[
                  s.catCard,
                  { backgroundColor: colors.bgCard, borderColor: colors.border },
                ]}
              >
                <View style={s.catLeft}>
                  <View style={[s.emojiCircle, { backgroundColor: `${colors.primary}22` }]}>
                    <Text style={s.catEmoji}>{emoji}</Text>
                  </View>
                  <View>
                    <Text style={[s.catName, { color: colors.textPrimary }]}>{cat.name}</Text>
                    <Text style={[s.catCount, { color: colors.textMuted }]}>
                      {cat.count === 0
                        ? `${cat.type === 'INCOME' ? 'Income' : 'Expense'} category`
                        : `${cat.count} transaction${cat.count !== 1 ? 's' : ''}`}
                    </Text>
                  </View>
                </View>

                <View style={s.catRight}>
                  {cat.income > 0 && (
                    <Text style={[s.catAmt, { color: colors.income }]}>+${cat.income.toFixed(2)}</Text>
                  )}
                  {cat.expense > 0 && (
                    <Text style={[s.catAmt, { color: colors.expense }]}>-${cat.expense.toFixed(2)}</Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={[s.modalCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>Add Category</Text>
            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="Category name"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
              autoCapitalize="words"
            />

            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Type</Text>
            <View style={s.typeRow}>
              {(['EXPENSE', 'INCOME'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    s.typeBtn,
                    { backgroundColor: colors.bgInput, borderColor: colors.border },
                    newCategoryType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setNewCategoryType(type)}
                  disabled={saving}
                >
                  <Text
                    style={[
                      s.typeText,
                      { color: colors.textSecondary },
                      newCategoryType === type && { color: '#FFFFFF' },
                    ]}
                  >
                    {type === 'EXPENSE' ? 'Expense' : 'Income'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Icon</Text>
            <TextInput
              style={[s.input, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
              value={newCategoryIcon}
              onChangeText={setNewCategoryIcon}
              placeholder="Optional icon"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
              maxLength={4}
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={[s.secondaryBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.primary }, saving && s.disabledBtn]}
                onPress={handleAddCategory}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={s.primaryBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingTop: 52 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginLeft: 54,
  },
  pageTitle: { fontSize: 26, fontWeight: Fonts.bold },
  addBtn: {
    borderRadius: Radii.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: Fonts.bold },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statBadge: {
    flex: 1, borderRadius: Radii.md,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1,
  },
  statNum: { fontSize: 22, fontWeight: Fonts.bold },
  statLbl: { fontSize: 11, marginTop: 2 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  filterBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radii.full,
    borderWidth: 1, alignItems: 'center',
  },
  filterText: { fontSize: 12, fontWeight: Fonts.medium },

  catCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: Radii.md, padding: 16, marginBottom: 10, borderWidth: 1,
  },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  emojiCircle: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  catEmoji: { fontSize: 22 },
  catName: { fontSize: 16, fontWeight: Fonts.semiBold },
  catCount: { fontSize: 12, marginTop: 2 },
  catRight: { alignItems: 'flex-end', gap: 2 },
  catAmt: { fontSize: 15, fontWeight: Fonts.bold },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 14 },
  emptyText: { fontSize: 18, fontWeight: Fonts.bold },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },

  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.54)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: { fontSize: 20, fontWeight: Fonts.bold, marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: Fonts.semiBold, marginBottom: 8 },
  input: {
    borderRadius: Radii.md,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: {
    alignItems: 'center',
    borderRadius: Radii.full,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 11,
  },
  typeText: { fontSize: 13, fontWeight: Fonts.bold },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  secondaryBtn: {
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: Fonts.bold },
  primaryBtn: {
    alignItems: 'center',
    borderRadius: Radii.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: Fonts.bold },
  disabledBtn: { opacity: 0.65 },
});
