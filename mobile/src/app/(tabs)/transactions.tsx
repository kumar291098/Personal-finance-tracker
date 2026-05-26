import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, Platform, StatusBar, ActivityIndicator,
  ScrollView, Animated,
} from 'react-native';
import {
  getTransactions, addTransaction, updateTransaction,
  deleteTransaction, Transaction,
} from '../../api/transactions';
import { getCategories, Category } from '../../api/categories';
import { useTheme, Fonts, Radii } from '../../theme';

const FILTERS = ['All', 'Income', 'Expense'] as const;
type Filter = typeof FILTERS[number];

// ── helpers ──────────────────────────────────────────────────────────────────
function showAlert(title: string, msg: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n${msg}`);
  else Alert.alert(title, msg);
}

function confirm(msg: string, onOk: () => void) {
  if (Platform.OS === 'web') { if (window.confirm(msg)) onOk(); }
  else Alert.alert('Confirm', msg, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', style: 'destructive', onPress: onOk },
  ]);
}

// ── swipeable row ─────────────────────────────────────────────────────────────
function TxCard({
  item, colors, onEdit, onDelete,
}: {
  item: Transaction;
  colors: any;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const isIncome = item.type === 'INCOME';
  const dateStr = (() => {
    try { return new Date(item.transactionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return item.transactionDate?.slice(0, 10) ?? ''; }
  })();

  return (
    <View style={[tc.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {/* Left: icon badge */}
      <View style={[tc.badge, { backgroundColor: isIncome ? `${colors.income}20` : `${colors.expense}20` }]}>
        <Text style={{ fontSize: 20 }}>{isIncome ? '📈' : '📉'}</Text>
      </View>

      {/* Middle: details */}
      <View style={tc.body}>
        <Text style={[tc.desc, { color: colors.textPrimary }]} numberOfLines={1}>{item.description}</Text>
        <View style={tc.metaRow}>
          <View style={[tc.pill, { backgroundColor: `${colors.primary}20` }]}>
            <Text style={[tc.pillTxt, { color: colors.primaryLight }]}>{item.category}</Text>
          </View>
          <Text style={[tc.date, { color: colors.textMuted }]}>{dateStr}</Text>
        </View>
      </View>

      {/* Right: amount + actions */}
      <View style={tc.right}>
        <Text style={[tc.amount, { color: isIncome ? colors.income : colors.expense }]}>
          {isIncome ? '+' : '-'}₹{item.amount.toFixed(2)}
        </Text>
        <View style={tc.actions}>
          {/* Edit button */}
          <TouchableOpacity
            style={[tc.actionBtn, { backgroundColor: `${colors.primary}20` }]}
            onPress={() => onEdit(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 12, color: colors.primary }}>✏️</Text>
          </TouchableOpacity>
          {/* Delete button */}
          <TouchableOpacity
            style={[tc.actionBtn, { backgroundColor: `${colors.expense}20` }]}
            onPress={() => onDelete(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 12, color: colors.expense }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const tc = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  badge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  body: { flex: 1 },
  desc: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  pillTxt: { fontSize: 11, fontWeight: '500' },
  date: { fontSize: 11 },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 14, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
});

// ── main screen ───────────────────────────────────────────────────────────────
export default function TransactionsScreen() {
  const { colors, shadows, isDark } = useTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<Filter>('All');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null); // null = add mode
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // form fields
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));

  // ── data ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txData, catData] = await Promise.all([getTransactions(), getCategories()]);
      setTransactions(txData.sort((a, b) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      ));
      setCategories(catData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  // ── derived ─────────────────────────────────────────────────────────────────
  const filteredCategories = categories.filter(c => c.type === type);
  const filtered = transactions.filter(t =>
    filter === 'All' ? true : t.type === filter.toUpperCase()
  );
  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  // ── modal open helpers ───────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingTx(null);
    setDesc(''); setAmount(''); setType('EXPENSE');
    setSelectedCategory(null); setCategoryDropdownOpen(false);
    setTxDate(new Date().toISOString().slice(0, 10));
    setModalVisible(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setDesc(tx.description);
    setAmount(String(tx.amount));
    setType(tx.type);
    setTxDate(tx.transactionDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    // Try to match existing category object
    const matchCat = categories.find(c => c.name === tx.category);
    setSelectedCategory(matchCat ?? { id: 0, name: tx.category, type: tx.type, icon: '' });
    setCategoryDropdownOpen(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingTx(null);
    setCategoryDropdownOpen(false);
  };

  // ── save (add or update) ────────────────────────────────────────────────────
  const handleSave = async () => {
    const trimDesc = desc.trim();
    if (!trimDesc) { showAlert('Validation', 'Please enter a description.'); return; }
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { showAlert('Validation', 'Enter a valid amount greater than 0.'); return; }
    if (!selectedCategory) { showAlert('Validation', 'Please select a category.'); return; }

    setSubmitting(true);
    try {
      const payload: Omit<Transaction, 'id'> = {
        description: trimDesc,
        amount: num,
        type,
        category: selectedCategory.name,
        categoryId: selectedCategory.id || undefined,
        transactionDate: txDate,
      };

      if (editingTx) {
        // UPDATE mode
        await updateTransaction(editingTx.id, payload);
      } else {
        // ADD mode
        await addTransaction(payload);
      }
      closeModal();
      await load();
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Something went wrong.');
    } finally { setSubmitting(false); }
  };

  // ── delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    confirm('Delete this transaction?', async () => {
      try { await deleteTransaction(id); await load(); }
      catch (e: any) { showAlert('Error', e?.message ?? 'Delete failed.'); }
    });
  };

  // ── type change resets category ─────────────────────────────────────────────
  const handleTypeChange = (t: 'INCOME' | 'EXPENSE') => {
    setType(t);
    setSelectedCategory(null);
    setCategoryDropdownOpen(false);
  };

  const isEditMode = !!editingTx;

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.textPrimary }]}>Transactions</Text>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }, shadows.violet]} onPress={openAdd}>
          <Text style={s.addBtnTxt}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* ── SUMMARY ── */}
      <View style={s.summaryRow}>
        <View style={[s.summaryCard, { backgroundColor: colors.bgCard, borderColor: `${colors.income}44` }]}>
          <Text style={s.summaryIcon}>📈</Text>
          <Text style={[s.summaryAmt, { color: colors.income }]}>₹{totalIncome.toFixed(2)}</Text>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Income</Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: colors.bgCard, borderColor: `${colors.expense}44` }]}>
          <Text style={s.summaryIcon}>📉</Text>
          <Text style={[s.summaryAmt, { color: colors.expense }]}>₹{totalExpense.toFixed(2)}</Text>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Expenses</Text>
        </View>
        <View style={[s.summaryCard, { backgroundColor: colors.bgCard, borderColor: `${colors.teal}44` }]}>
          <Text style={s.summaryIcon}>💰</Text>
          <Text style={[s.summaryAmt, { color: colors.teal }]}>₹{(totalIncome - totalExpense).toFixed(2)}</Text>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Balance</Text>
        </View>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={s.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[s.filterTab, { backgroundColor: active ? colors.primary : colors.bgCard, borderColor: active ? colors.primary : colors.border }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterTxt, { color: active ? '#fff' : colors.textSecondary, fontWeight: active ? '700' : '500' }]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
        <Text style={[s.countBadge, { color: colors.textMuted }]}>{filtered.length} records</Text>
      </View>

      {/* ── LIST ── */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>💸</Text>
          <Text style={[s.emptyTxt, { color: colors.textSecondary }]}>No transactions yet</Text>
          <TouchableOpacity style={[s.emptyBtn, { backgroundColor: colors.primary, ...shadows.violet }]} onPress={openAdd}>
            <Text style={s.emptyBtnTxt}>+ Add First Transaction</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id.toString()}
          renderItem={({ item }) => (
            <TxCard
              item={item}
              colors={colors}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── ADD / EDIT MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.bgCard }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />

            {/* Title */}
            <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
              {isEditMode ? '✏️ Edit Transaction' : '➕ New Transaction'}
            </Text>

            {/* If editing, show a subtle "editing" tag */}
            {isEditMode && (
              <View style={[s.editTag, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }]}>
                <Text style={[s.editTagTxt, { color: colors.primary }]}>
                  Editing: {editingTx?.description}
                </Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Type Toggle */}
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Type</Text>
              <View style={s.typeRow}>
                {(['EXPENSE', 'INCOME'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      s.typeBtn,
                      { backgroundColor: colors.bgCardAlt },
                      type === t && { backgroundColor: t === 'EXPENSE' ? colors.expense : colors.income },
                    ]}
                    onPress={() => handleTypeChange(t)}
                  >
                    <Text style={[s.typeBtnTxt, { color: type === t ? '#fff' : colors.textSecondary }]}>
                      {t === 'EXPENSE' ? '📉  Expense' : '📈  Income'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description */}
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="e.g. Grocery, Monthly Salary"
                placeholderTextColor={colors.textMuted}
                value={desc}
                onChangeText={setDesc}
                returnKeyType="next"
              />

              {/* Amount */}
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Amount (₹)</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />

              {/* Date */}
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.bgInput, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={txDate}
                onChangeText={setTxDate}
                keyboardType="numeric"
                maxLength={10}
              />

              {/* Category Dropdown */}
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Category</Text>
              <TouchableOpacity
                style={[
                  s.dropTrigger,
                  { backgroundColor: colors.bgInput, borderColor: colors.border },
                  categoryDropdownOpen && { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
                ]}
                onPress={() => setCategoryDropdownOpen(o => !o)}
              >
                <Text style={selectedCategory
                  ? [s.dropValue, { color: colors.textPrimary }]
                  : [s.dropPlaceholder, { color: colors.textMuted }]
                }>
                  {selectedCategory
                    ? `${selectedCategory.icon || '📁'}  ${selectedCategory.name}`
                    : 'Select a category…'}
                </Text>
                <Text style={[s.dropChevron, { color: colors.textSecondary }]}>{categoryDropdownOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {categoryDropdownOpen && (
                <View style={[s.dropList, { backgroundColor: colors.bgCardAlt, borderColor: colors.primary }]}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                    {filteredCategories.length === 0 ? (
                      <Text style={[s.dropEmpty, { color: colors.textMuted }]}>No categories for {type.toLowerCase()}</Text>
                    ) : (
                      filteredCategories.map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            s.dropItem,
                            { borderBottomColor: colors.border },
                            selectedCategory?.id === cat.id && { backgroundColor: `${colors.primary}20` },
                          ]}
                          onPress={() => { setSelectedCategory(cat); setCategoryDropdownOpen(false); }}
                        >
                          <Text style={s.dropItemIcon}>{cat.icon || '📁'}</Text>
                          <Text style={[
                            s.dropItemTxt,
                            { color: colors.textSecondary },
                            selectedCategory?.id === cat.id && { color: colors.textPrimary, fontWeight: '600' },
                          ]}>
                            {cat.name}
                          </Text>
                          {selectedCategory?.id === cat.id && (
                            <Text style={[s.checkmark, { color: colors.primary }]}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}

              {/* Action buttons */}
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.cancelBtn, { borderColor: colors.border }]}
                  onPress={closeModal}
                >
                  <Text style={[s.cancelBtnTxt, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.saveBtn,
                    { backgroundColor: isEditMode ? colors.teal : colors.primary },
                    shadows.violet,
                    submitting && { opacity: 0.6 },
                  ]}
                  onPress={handleSave}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.saveBtnTxt}>{isEditMode ? '✓ Update' : 'Save'}</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, paddingTop: 52 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 18, marginLeft: 54 },
  title: { fontSize: 26, fontWeight: '800' },
  addBtn: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  summaryIcon: { fontSize: 18, marginBottom: 4 },
  summaryAmt: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  summaryLabel: { fontSize: 10 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 14, alignItems: 'center' },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterTxt: { fontSize: 13 },
  countBadge: { marginLeft: 'auto', fontSize: 12 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
  emptyTxt: { fontSize: 16, marginBottom: 20 },
  emptyBtn: { borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '92%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },

  editTag: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16 },
  editTagTxt: { fontSize: 13, fontWeight: '600' },

  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  typeBtnTxt: { fontWeight: '700', fontSize: 13 },

  input: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 15, marginBottom: 16, borderWidth: 1,
  },

  dropTrigger: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, marginBottom: 0,
  },
  dropValue: { fontSize: 15, fontWeight: '500' },
  dropPlaceholder: { fontSize: 15 },
  dropChevron: { fontSize: 12 },
  dropList: { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, overflow: 'hidden', marginBottom: 16 },
  dropItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  dropItemIcon: { fontSize: 18, marginRight: 12 },
  dropItemTxt: { flex: 1, fontSize: 15 },
  checkmark: { fontWeight: '700', fontSize: 16 },
  dropEmpty: { padding: 16, fontSize: 14, textAlign: 'center' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  cancelBtnTxt: { fontWeight: '700', fontSize: 14 },
  saveBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  saveBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
