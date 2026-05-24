import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, StatusBar, RefreshControl,
  Animated, Dimensions, Modal, TextInput,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { getTransactions, addTransaction, Transaction } from '../../api/transactions';
import { getCategories, Category } from '../../api/categories';
import { getProfile } from '../../api/profile';
import { Fonts, Radii, useTheme } from '../../theme';
import { InteractivePieChart, InteractiveLineChart, DualBarChart } from '../../components/charts';

const SCREEN_W = Dimensions.get('window').width;
// Scroll has px:20 each side = 40. Card has padding:18 each side = 36. Total = 76.
const CARD_INNER_W = SCREEN_W - 76;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function fmt(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function getMonthStart(monthsAgo = 0) {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() - monthsAgo);
  return d;
}

const DATE_FILTERS = [
  { label: 'This Week', days: 7 },
  { label: 'Last Month', days: 30 },
  { label: 'Last 3 Months', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'All Time', days: 9999 },
];

const CAT_COLORS = [
  '#6C63FF', '#00D2C8', '#EF4444', '#F59E0B', '#22C55E',
  '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316',
];

const TIPS = [
  { icon: '🎯', title: 'Set Monthly Budgets', body: 'Create spending limits for categories to stay on track.' },
  { icon: '📝', title: 'Track Daily Expenses', body: 'Record transactions immediately for accurate records.' },
  { icon: '📅', title: 'Review Weekly', body: 'Check spending patterns every week to spot trends.' },
  { icon: '💡', title: 'Invest Savings', body: 'Put at least 20% of income into investments or savings.' },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ title, colors }: { title: string; colors: any }) {
  return <Text style={[ss.secTitle, { color: colors.textPrimary }]}>{title}</Text>;
}

function EmptyBox({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={[ss.emptyBox, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}>
      <Text style={ss.emptyEmoji}>📭</Text>
      <Text style={[ss.emptyLbl, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}


// ── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { colors, shadows, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [displayName, setDisplayName] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateFilter, setDateFilter] = useState(DATE_FILTERS[1]);
  const [catFilter, setCatFilter] = useState('All Categories');
  const [catDropOpen, setCatDropOpen] = useState(false);

  const [addModal, setAddModal] = useState<'INCOME' | 'EXPENSE' | null>(null);
  const [addDesc, setAddDesc] = useState('');
  const [addAmt, setAddAmt] = useState('');
  const [addCategory, setAddCategory] = useState<Category | null>(null);
  const [addCategoryDropOpen, setAddCategoryDropOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Try to get firstName from profile, fall back to stored username
      const [profileData, txs, cats] = await Promise.all([
        getProfile().catch(() => null),
        getTransactions(),
        getCategories(),
      ]);
      if (profileData) {
        setDisplayName(profileData.firstName?.trim() || profileData.username?.trim() || '');
      } else {
        const stored = Platform.OS === 'web'
          ? localStorage.getItem('username')
          : await SecureStore.getItemAsync('username');
        if (stored) setDisplayName(stored);
      }
      setTransactions(txs.sort((a, b) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      ));
      setCategories(cats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, []);

  // ── Derived Data ──────────────────────────────────────────────────────────

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const cutoff = new Date(Date.now() - dateFilter.days * 86_400_000);
  const filtered = transactions.filter(t => {
    const inDate = dateFilter.days >= 9999 || new Date(t.transactionDate) >= cutoff;
    const inCat = catFilter === 'All Categories' || t.category === catFilter;
    return inDate && inCat;
  });
  const filteredExpense = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  // Category map for pie / donut
  const catMap: Record<string, number> = {};
  filtered.filter(t => t.type === 'EXPENSE').forEach(t => {
    catMap[t.category] = (catMap[t.category] || 0) + t.amount;
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topCat = catEntries[0];
  const topCatPct = topCat && filteredExpense > 0 ? ((topCat[1] / filteredExpense) * 100).toFixed(1) : '0';

  // Pie chart data (react-native-chart-kit format)
  const pieData = catEntries.map(([name, amount], i) => ({
    name: name.length > 10 ? name.slice(0, 9) + '…' : name,
    population: amount,
    color: CAT_COLORS[i % CAT_COLORS.length],
    legendFontColor: colors.textSecondary,
    legendFontSize: 11,
  }));

  // Monthly bar data — last 6 months
  const months = Array.from({ length: 6 }, (_, i) => {
    const start = getMonthStart(5 - i);
    const end = getMonthStart(4 - i);
    const slice = transactions.filter(t => {
      const d = new Date(t.transactionDate);
      return d >= start && d < end;
    });
    return {
      label: start.toLocaleString('en', { month: 'short' }),
      income: slice.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
      expense: slice.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
    };
  });
  const maxMonthVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);

  // Line chart — daily expenses for selected date range (max 10 points)
  const dailyMap: Record<string, number> = {};
  filtered.filter(t => t.type === 'EXPENSE').forEach(t => {
    const day = t.transactionDate.slice(0, 10);
    dailyMap[day] = (dailyMap[day] || 0) + t.amount;
  });
  const dailyKeys = Object.keys(dailyMap).sort().slice(-10);
  const lineLabels = dailyKeys.map(d => d.slice(8)); // just day number e.g. "05"
  const lineValues = dailyKeys.map(d => dailyMap[d]);

  // Ensure at least 2 data points for LineChart
  const hasLineData = lineValues.length >= 2;

  const chartConfig = {
    backgroundGradientFrom: colors.bgCard,
    backgroundGradientTo: colors.bgCard,
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(108,99,255,${opacity})`,
    labelColor: (opacity = 1) => isDark
      ? `rgba(136,146,164,${opacity})`
      : `rgba(71,85,105,${opacity})`,
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#6C63FF' },
    propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '4' },
  };

  const uniqueCats = Array.from(new Set(transactions.map(t => t.category)));

  const closeAddModal = () => {
    setAddModal(null); setAddDesc(''); setAddAmt('');
    setAddCategory(null); setAddCategoryDropOpen(false);
  };

  const handleSaveTransaction = async () => {
    if (!addDesc.trim() || !addAmt.trim()) return;
    if (!addCategory) {
      if (Platform.OS === 'web') window.alert('Please select a category.');
      return;
    }
    setAddSaving(true);
    try {
      await addTransaction({
        description: addDesc.trim(),
        amount: parseFloat(addAmt),
        type: addModal!,
        category: addCategory.name,
        categoryId: addCategory.id || undefined,
        transactionDate: new Date().toISOString().slice(0, 10),
      });
      closeAddModal();
      loadData(true);
    } catch (e: any) {
      if (Platform.OS === 'web') window.alert(e.message);
    } finally { setAddSaving(false); }
  };

  if (loading) return (
    <View style={[ss.root, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[{ marginTop: 12, fontSize: 14 }, { color: colors.textSecondary }]}>Loading your finances…</Text>
    </View>
  );

  return (
    <View style={[ss.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={[ss.orbTR, { backgroundColor: colors.primary }]} />
      <View style={[ss.orbBL, { backgroundColor: colors.teal }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={ss.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData(true); }}
            tintColor={colors.primary} />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── HEADER ─────────────────────────────────────────────── */}
          <View style={ss.header}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[ss.greeting, { color: colors.textPrimary }]}>
                {getGreeting()}{displayName ? `, ${displayName}` : ''} 👋
              </Text>
              <Text style={[ss.headerSub, { color: colors.textMuted }]}>A clear view of your balance, cash flow, and recent activity.</Text>
            </View>
            <TouchableOpacity style={[ss.addBtn, { backgroundColor: colors.primary, ...shadows.violet }]} onPress={() => setAddModal('EXPENSE')}>
              <Text style={ss.addBtnTxt}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {/* ── BALANCE HERO ────────────────────────────────────────── */}
          <View style={[ss.hero, { backgroundColor: colors.primary, ...shadows.violet }]}>
            <Text style={ss.heroLabel}>Total Balance</Text>
            <Text style={ss.heroAmt} numberOfLines={1} adjustsFontSizeToFit>{balance < 0 ? '-' : ''}{fmt(balance)}</Text>
            <Text style={ss.heroSub}>Current balance</Text>
            <View style={ss.heroDivider} />
            <View style={ss.heroRow}>
              {[
                { label: 'Total Income', val: fmt(totalIncome) },
                { label: 'Total Expenses', val: fmt(totalExpense) },
                { label: 'Transactions', val: String(transactions.length) },
              ].map(item => (
                <View key={item.label} style={[ss.heroStat, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <Text style={ss.heroStatVal} numberOfLines={1} adjustsFontSizeToFit>{item.val}</Text>
                  <Text style={ss.heroStatLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── KPI ROW ─────────────────────────────────────────────── */}
          <View style={ss.kpiRow}>
            {[
              { label: 'Total Income', val: fmt(totalIncome), sub: 'This month', color: colors.income },
              { label: 'Total Expenses', val: fmt(totalExpense), sub: 'This month', color: colors.expense },
              { label: 'Savings Rate', val: `${savingsRate.toFixed(0)}%`, sub: 'Of income', color: colors.teal },
            ].map(k => (
              <View key={k.label} style={[ss.kpiCard, { backgroundColor: colors.bgCard, borderColor: `${k.color}33` }]}>
                <Text style={[ss.kpiVal, { color: k.color }]} numberOfLines={1} adjustsFontSizeToFit>{k.val}</Text>
                <Text style={[ss.kpiLabel, { color: colors.textPrimary }]}>{k.label}</Text>
                <Text style={[ss.kpiSub, { color: colors.textMuted }]}>{k.sub}</Text>
              </View>
            ))}
          </View>

          {/* ── EXPENSE INTELLIGENCE ────────────────────────────────── */}
          <View style={[ss.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <SectionTitle title="💡 Expense Intelligence" colors={colors} />
            <Text style={[ss.cardSub, { color: colors.textMuted }]}>Customize by date range and category</Text>

            {/* Date filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.chipsRow}>
              {DATE_FILTERS.map(f => {
                const active = dateFilter.label === f.label;
                return (
                  <TouchableOpacity
                    key={f.label}
                    style={[ss.chip, { backgroundColor: active ? colors.primary : colors.bgCardAlt, borderColor: active ? colors.primary : colors.border }]}
                    onPress={() => setDateFilter(f)}
                  >
                    <Text style={[ss.chipTxt, { color: active ? '#fff' : colors.textSecondary }]}>{f.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Category filter */}
            <TouchableOpacity
              style={[ss.dropBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
              onPress={() => setCatDropOpen(v => !v)}
            >
              <Text style={[ss.dropBtnTxt, { color: colors.textPrimary }]}>{catFilter}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>{catDropOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {catDropOpen && (
              <View style={[ss.dropList, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}>
                {['All Categories', ...uniqueCats].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[ss.dropItem, { borderBottomColor: colors.border }]}
                    onPress={() => { setCatFilter(c); setCatDropOpen(false); }}
                  >
                    <Text style={[ss.dropItemTxt, { color: catFilter === c ? colors.primary : colors.textPrimary, fontWeight: catFilter === c ? '700' : '400' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Filtered totals */}
            <View style={[ss.filtBox, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}33` }]}>
              <Text style={[ss.filtLabel, { color: colors.textSecondary }]}>Filtered Expenses</Text>
              <Text style={[ss.filtAmt, { color: colors.expense }]}>{fmt(filteredExpense)}</Text>
              {topCat && <Text style={[ss.filtNote, { color: colors.textMuted }]}>{topCat[0]} leads with {topCatPct}% of this view.</Text>}
            </View>

            {/* ── INTERACTIVE PIE CHART ── */}
            {catEntries.length > 0 ? (
              <>
                <Text style={[ss.miniLabel, { color: colors.textSecondary }]}>Category Breakdown — Tap a slice</Text>
                <InteractivePieChart
                  data={catEntries.map(([name, amount], i) => ({
                    value: amount,
                    color: CAT_COLORS[i % CAT_COLORS.length],
                    label: name,
                  }))}
                  colors={colors}
                  size={90}
                  centerLabel="Tap slice"
                />
              </>
            ) : (
              <EmptyBox label="No expenses in this filter" colors={colors} />
            )}
          </View>

          <View style={[ss.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <SectionTitle title="📈 Date-wise Expenses" colors={colors} />
            <Text style={[ss.cardSub, { color: colors.textMuted }]}>Daily spending — tap a point to see value</Text>
            {hasLineData ? (
              <View style={ss.chartWrap}>
                <InteractiveLineChart
                  data={lineLabels.map((label, i) => ({ label, value: lineValues[i] }))}
                  colors={colors}
                  width={CARD_INNER_W}
                  lineColor={colors.primary}
                  areaColor={colors.primary}
                />
              </View>
            ) : (
              <EmptyBox label="Need at least 2 expense days" colors={colors} />
            )}
          </View>

          {/* ── INCOME vs EXPENSES ──────────────────────────────────── */}
          <View style={[ss.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <SectionTitle title="📊 Income vs Expenses" colors={colors} />
            <Text style={[ss.cardSub, { color: colors.textMuted }]}>Monthly comparison — last 6 months</Text>

            {/* Summary badges */}
            <View style={ss.incExpBadges}>
              <View style={[ss.incExpBadge, { backgroundColor: `${colors.income}15`, borderColor: `${colors.income}40` }]}>
                <Text style={[ss.incExpBadgeLbl, { color: colors.textMuted }]}>📈 Income</Text>
                <Text style={[ss.incExpBadgeAmt, { color: colors.income }]}>{fmt(totalIncome)}</Text>
              </View>
              <View style={[ss.incExpBadge, { backgroundColor: `${colors.expense}15`, borderColor: `${colors.expense}40` }]}>
                <Text style={[ss.incExpBadgeLbl, { color: colors.textMuted }]}>📉 Expenses</Text>
                <Text style={[ss.incExpBadgeAmt, { color: colors.expense }]}>{fmt(totalExpense)}</Text>
              </View>
            </View>

            {/* Net flow & savings rate */}
            <View style={[ss.flowRow, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}>
              <View style={ss.flowItem}>
                <Text style={[ss.flowLbl, { color: colors.textMuted }]}>Net cash flow</Text>
                <Text style={[ss.flowVal, { color: balance >= 0 ? colors.income : colors.expense }]}>
                  {balance >= 0 ? '+' : '-'}{fmt(balance)}
                </Text>
              </View>
              <View style={[ss.flowDivider, { backgroundColor: colors.border }]} />
              <View style={ss.flowItem}>
                <Text style={[ss.flowLbl, { color: colors.textMuted }]}>Savings rate</Text>
                <Text style={[ss.flowVal, { color: colors.teal }]}>{savingsRate.toFixed(1)}%</Text>
              </View>
            </View>

            {/* Interactive dual bar chart */}
            <DualBarChart
              data={months}
              colors={colors}
              width={CARD_INNER_W}
              title=""
            />
          </View>

          {/* ── RECENT TRANSACTIONS ─────────────────────────────────── */}
          <View style={[ss.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={ss.secHdr}>
              <SectionTitle title="🕒 Recent Transactions" colors={colors} />
              <TouchableOpacity onPress={() => router.push('/(tabs)/transactions')}>
                <Text style={[ss.viewAll, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            {transactions.slice(0, 5).length === 0 ? (
              <EmptyBox label="No transactions yet" colors={colors} />
            ) : (
              transactions.slice(0, 5).map(item => {
                const inc = item.type === 'INCOME';
                return (
                  <View key={item.id} style={[ss.txRow, { borderBottomColor: colors.border }]}>
                    <View style={[ss.txIcon, { backgroundColor: inc ? `${colors.income}22` : `${colors.expense}22` }]}>
                      <Text style={{ fontSize: 16 }}>{inc ? '⬆️' : '⬇️'}</Text>
                    </View>
                    <View style={ss.txBody}>
                      <Text style={[ss.txDesc, { color: colors.textPrimary }]} numberOfLines={1}>{item.description}</Text>
                      <Text style={[ss.txMeta, { color: colors.textMuted }]}>
                        {item.category} · {new Date(item.transactionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </Text>
                    </View>
                    <Text style={[ss.txAmt, { color: inc ? colors.income : colors.expense }]}>
                      {inc ? '+' : '-'}{fmt(item.amount)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          {/* ── QUICK ACTIONS ───────────────────────────────────────── */}
          <View style={[ss.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <SectionTitle title="⚡ Quick Actions" colors={colors} />
            <View style={ss.qaGrid}>
              {[
                { emoji: '➕', label: 'Add Expense', color: colors.expense, action: () => setAddModal('EXPENSE') },
                { emoji: '💰', label: 'Add Income', color: colors.income, action: () => setAddModal('INCOME') },
                { emoji: '📊', label: 'View Reports', color: colors.primary, action: () => router.push('/(tabs)/analytics') },
                { emoji: '🏷️', label: 'Categories', color: colors.teal, action: () => router.push('/(tabs)/categories') },
              ].map(qa => (
                <TouchableOpacity key={qa.label} style={[ss.qaBtn, { backgroundColor: `${qa.color}15`, borderColor: `${qa.color}40` }]} onPress={qa.action}>
                  <Text style={{ fontSize: 22, marginBottom: 6 }}>{qa.emoji}</Text>
                  <Text style={[ss.qaLbl, { color: qa.color }]}>{qa.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── FINANCIAL TIPS ──────────────────────────────────────── */}
          <View style={[ss.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <SectionTitle title="💡 Financial Tips" colors={colors} />
            {TIPS.map(tip => (
              <View key={tip.title} style={[ss.tipRow, { borderBottomColor: colors.border }]}>
                <Text style={ss.tipIcon}>{tip.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[ss.tipTitle, { color: colors.textPrimary }]}>{tip.title}</Text>
                  <Text style={[ss.tipBody, { color: colors.textMuted }]}>{tip.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* ── ADD TRANSACTION MODAL ───────────────────────────────────── */}
      <Modal visible={!!addModal} transparent animationType="slide" onRequestClose={closeAddModal}>
        <View style={ss.overlay}>
          <View style={[ss.modal, { backgroundColor: colors.bgCard }]}>
            <View style={[ss.modalHandle, { backgroundColor: colors.border }]} />
            <Text style={[ss.modalTitle, { color: colors.textPrimary }]}>
              {addModal === 'INCOME' ? '💰 Add Income' : '💸 Add Expense'}
            </Text>

            {/* Type toggle */}
            <View style={ss.typeRow}>
              {(['EXPENSE', 'INCOME'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[ss.typeBtn, { backgroundColor: addModal === type ? (type === 'INCOME' ? colors.income : colors.expense) : colors.bgCardAlt }]}
                  onPress={() => setAddModal(type)}
                >
                  <Text style={[ss.typeBtnTxt, { color: addModal === type ? '#fff' : colors.textSecondary }]}>
                    {type === 'INCOME' ? '📈 Income' : '📉 Expense'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[ss.mLabel, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              style={[ss.mInput, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="e.g. Grocery, Salary…"
              placeholderTextColor={colors.textMuted}
              value={addDesc}
              onChangeText={setAddDesc}
            />

            <Text style={[ss.mLabel, { color: colors.textSecondary }]}>Amount (₹)</Text>
            <TextInput
              style={[ss.mInput, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="0.00"
              placeholderTextColor={colors.textMuted}
              value={addAmt}
              onChangeText={setAddAmt}
              keyboardType="decimal-pad"
            />

            <Text style={[ss.mLabel, { color: colors.textSecondary }]}>Category</Text>
            <TouchableOpacity
              style={[
                ss.mDropTrigger,
                { backgroundColor: colors.bgInput, borderColor: colors.border },
                addCategoryDropOpen
                  ? { borderColor: colors.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }
                  : { marginBottom: 12 },
              ]}
              onPress={() => setAddCategoryDropOpen(o => !o)}
            >
              <Text style={addCategory
                ? [ss.mDropValue, { color: colors.textPrimary }]
                : [ss.mDropPlaceholder, { color: colors.textMuted }]
              }>
                {addCategory
                  ? `${addCategory.icon || '📁'}  ${addCategory.name}`
                  : 'Select a category…'}
              </Text>
              <Text style={[ss.mDropChevron, { color: colors.textSecondary }]}>{addCategoryDropOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {addCategoryDropOpen && (
              <View style={[ss.mDropList, { backgroundColor: colors.bgCardAlt, borderColor: colors.primary }]}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 150 }} showsVerticalScrollIndicator={false}>
                  {categories.filter(c => c.type === addModal).length === 0 ? (
                    <Text style={[ss.mDropEmpty, { color: colors.textMuted }]}>No categories for {addModal?.toLowerCase()}</Text>
                  ) : (
                    categories.filter(c => c.type === addModal).map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          ss.mDropItem,
                          { borderBottomColor: colors.border },
                          addCategory?.id === cat.id && { backgroundColor: `${colors.primary}20` },
                        ]}
                        onPress={() => { setAddCategory(cat); setAddCategoryDropOpen(false); }}
                      >
                        <Text style={ss.mDropItemIcon}>{cat.icon || '📁'}</Text>
                        <Text style={[
                          ss.mDropItemTxt,
                          { color: colors.textSecondary },
                          addCategory?.id === cat.id && { color: colors.textPrimary, fontWeight: '600' },
                        ]}>
                          {cat.name}
                        </Text>
                        {addCategory?.id === cat.id && (
                          <Text style={[ss.mCheckmark, { color: colors.primary }]}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            )}

            <View style={ss.mActions}>
              <TouchableOpacity style={[ss.mCancel, { borderColor: colors.border }]} onPress={closeAddModal}>
                <Text style={[ss.mCancelTxt, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ss.mSave, { backgroundColor: addModal === 'INCOME' ? colors.income : colors.expense }, addSaving && { opacity: 0.65 }]}
                onPress={handleSaveTransaction}
                disabled={addSaving}
              >
                <Text style={ss.mSaveTxt}>{addSaving ? 'Saving…' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  root: { flex: 1 },
  orbTR: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -70, right: -70, opacity: 0.10 },
  orbBL: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: 80, left: -50, opacity: 0.07 },
  scroll: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 40 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  headerSub: { fontSize: 12 },
  addBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  addBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Hero balance card
  hero: { borderRadius: 22, padding: 22, marginBottom: 14 },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 4 },
  heroAmt: { color: '#fff', fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 2 },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 14 },
  heroRow: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  heroStatVal: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, textAlign: 'center' },

  // KPI row
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  kpiCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  kpiVal: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  kpiLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  kpiSub: { fontSize: 9, textAlign: 'center' },

  // Card container
  card: { borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 14 },
  cardSub: { fontSize: 11, marginTop: -10, marginBottom: 14 },
  secHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  secTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 0.1, marginBottom: 6 },
  viewAll: { fontSize: 12, fontWeight: '600' },

  // Filter chips
  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  chipTxt: { fontSize: 12, fontWeight: '600' },

  // Dropdown
  dropBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10 },
  dropBtnTxt: { fontSize: 13, fontWeight: '500' },
  dropList: { borderRadius: 10, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  dropItem: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  dropItemTxt: { fontSize: 13 },

  // Filtered box
  filtBox: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
  filtLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  filtAmt: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  filtNote: { fontSize: 12 },

  miniLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },

  emptyBox: { borderRadius: 12, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 14 },
  emptyEmoji: { fontSize: 32, marginBottom: 8 },
  emptyLbl: { fontSize: 13, fontWeight: '500' },

  // Pie chart wrapper — clips overflow, centers the chart
  pieWrap: { width: CARD_INNER_W, overflow: 'hidden', alignSelf: 'center', marginBottom: 12 },
  chartWrap: { width: CARD_INNER_W, overflow: 'visible', alignSelf: 'center' },
  chartStyle: { borderRadius: 12 },

  // Donut legend rows
  donutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  donutDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8, flexShrink: 0 },
  donutName: { fontSize: 13, fontWeight: '500', width: 90, flexShrink: 0 },
  donutBarWrap: { flex: 1, marginHorizontal: 8 },
  donutBarTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  donutBarFill: { height: '100%', borderRadius: 4 },
  donutPct: { fontSize: 12, fontWeight: '700', width: 32, textAlign: 'right', flexShrink: 0 },
  donutAmt: { fontSize: 12, fontWeight: '600', width: 60, textAlign: 'right', flexShrink: 0 },
  donutTotalRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  donutTotalLbl: { flex: 1, fontSize: 13, fontWeight: '800', marginLeft: 18 },
  donutTotalAmt: { fontSize: 13, fontWeight: '800' },

  // Income vs Expenses
  incExpBadges: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  incExpBadge: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12 },
  incExpBadgeLbl: { fontSize: 11, marginBottom: 4 },
  incExpBadgeAmt: { fontSize: 17, fontWeight: '800' },
  flowRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  flowItem: { flex: 1, padding: 12 },
  flowDivider: { width: 1 },
  flowLbl: { fontSize: 11, marginBottom: 4 },
  flowVal: { fontSize: 16, fontWeight: '800' },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendTxt: { fontSize: 12 },

  // Monthly bars
  mBarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mBarLabel: { fontSize: 11, fontWeight: '600', width: 28 },
  mBarBars: { flex: 1, marginHorizontal: 10 },
  mBarTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  mBarFill: { height: '100%', borderRadius: 5 },
  mBarAmts: { width: 64, alignItems: 'flex-end', gap: 6 },
  mBarAmt: { fontSize: 10, fontWeight: '700' },

  // Transactions
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  txIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txBody: { flex: 1 },
  txDesc: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  txMeta: { fontSize: 11 },
  txAmt: { fontSize: 14, fontWeight: '800' },

  // Quick actions
  qaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  qaBtn: { width: '47.5%', borderRadius: 14, borderWidth: 1, paddingVertical: 16, alignItems: 'center' },
  qaLbl: { fontSize: 12, fontWeight: '700' },

  // Financial tips
  tipRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, gap: 12, alignItems: 'flex-start' },
  tipIcon: { fontSize: 20, marginTop: 1 },
  tipTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  tipBody: { fontSize: 12, lineHeight: 17 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 19, fontWeight: '800', marginBottom: 18 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  typeBtnTxt: { fontWeight: '700', fontSize: 13 },
  mLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  mInput: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 12 },
  mActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  mCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  mCancelTxt: { fontWeight: '700' },
  mSave: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  mSaveTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Dropdown Styles
  mDropTrigger: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1,
  },
  mDropValue: { fontSize: 14, fontWeight: '500' },
  mDropPlaceholder: { fontSize: 14 },
  mDropChevron: { fontSize: 11 },
  mDropList: { borderWidth: 1, borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden', marginBottom: 16 },
  mDropItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  mDropItemIcon: { fontSize: 16, marginRight: 10 },
  mDropItemTxt: { flex: 1, fontSize: 14 },
  mCheckmark: { fontWeight: '700', fontSize: 14 },
  mDropEmpty: { padding: 14, fontSize: 13, textAlign: 'center' },
});
