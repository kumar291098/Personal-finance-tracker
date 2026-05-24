import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar, Platform, Dimensions
} from 'react-native';
import { getTransactions, Transaction } from '../../api/transactions';
import { Fonts, Radii, useTheme } from '../../theme';
import { InteractivePieChart, InteractiveLineChart, DualBarChart } from '../../components/charts';
import { DateRangePicker, Preset } from '../../components/date-range-picker';
import { ExpenseHeatmap } from '../../components/expense-heatmap';

const SCREEN_W = Dimensions.get('window').width;
const CARD_INNER_W = SCREEN_W - 76;

const CAT_COLORS = [
  '#6C63FF', '#00D2C8', '#EF4444', '#F59E0B', '#22C55E',
  '#3B82F6', '#EC4899', '#8B5CF6', '#14B8A6', '#F97316',
];

const DATE_PRESETS: Preset[] = [
  { label: 'This Week', days: 7 },
  { label: 'This Month', days: 30 },
  { label: 'Last 3 Months', days: 90 },
  { label: 'Last 6 Months', days: 180 },
  { label: 'Custom', days: -1 },
];

function fmt(n: number) {
  return `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
}

function EmptyBox({ label, colors }: { label: string; colors: any }) {
  return (
    <View style={[a.emptyBox, { backgroundColor: colors.bgCardAlt, borderColor: colors.border }]}>
      <Text style={a.emptyEmoji}>📭</Text>
      <Text style={[a.emptyLbl, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors, isDark, shadows } = useTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Range State
  const [preset, setPreset] = useState<Preset>(DATE_PRESETS[1]); // Default to "This Month"
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  });
  const [endDate, setEndDate] = useState(() => new Date());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Preset changes
  const handlePresetSelect = (p: Preset) => {
    setPreset(p);
    if (p.days !== -1) {
      const start = new Date();
      start.setDate(start.getDate() - p.days);
      setStartDate(start);
      setEndDate(new Date());
    }
  };

  // Filtered transactions for KPIs and Charts
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.transactionDate.slice(0, 10));
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      return d >= start && d <= end;
    });
  }, [transactions, startDate, endDate]);

  const totalIncome = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  }, [filteredTransactions]);

  const savingsRate = useMemo(() => {
    return totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  }, [totalIncome, totalExpense]);

  // Category breakdown for Pie Chart
  const catMap = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [filteredTransactions]);

  const catEntries = useMemo(() => {
    return Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  }, [catMap]);

  const pieData = useMemo(() => {
    return catEntries.slice(0, 6).map(([name, amount], i) => ({
      value: amount,
      color: CAT_COLORS[i % CAT_COLORS.length],
      label: name.length > 10 ? name.slice(0, 9) + '…' : name,
    }));
  }, [catEntries]);

  // Top list
  const topExpenses = useMemo(() => {
    return catEntries.slice(0, 5).map(([name, total]) => ({
      name,
      total,
      count: filteredTransactions.filter(t => t.category === name && t.type === 'EXPENSE').length,
    }));
  }, [catEntries, filteredTransactions]);

  const maxCatExpense = topExpenses.length > 0 ? topExpenses[0].total : 1;

  // Comparison Bar Chart (Income vs Expense) with Dynamic Range Aggregation
  const comparisonBarData = useMemo(() => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Map daily values for income and expenses
    const dailyIncomeMap: Record<string, number> = {};
    const dailyExpenseMap: Record<string, number> = {};
    
    filteredTransactions.forEach(t => {
      const key = t.transactionDate.slice(0, 10);
      if (t.type === 'INCOME') {
        dailyIncomeMap[key] = (dailyIncomeMap[key] || 0) + t.amount;
      } else {
        dailyExpenseMap[key] = (dailyExpenseMap[key] || 0) + t.amount;
      }
    });

    if (diffDays <= 7) {
      // Daily Income vs Expense comparison (e.g. 1 week)
      const result: { label: string; income: number; expense: number }[] = [];
      const temp = new Date(startDate);
      while (temp <= endDate) {
        const key = temp.toISOString().slice(0, 10);
        const label = temp.toLocaleString('en', { weekday: 'short' }); // "Sun", "Mon"...
        result.push({
          label,
          income: dailyIncomeMap[key] || 0,
          expense: dailyExpenseMap[key] || 0
        });
        temp.setDate(temp.getDate() + 1);
      }
      return result;
    } else if (diffDays <= 35) {
      // Weekly Income vs Expense comparison (e.g. 1 month)
      const result: { label: string; income: number; expense: number }[] = [];
      const temp = new Date(startDate);
      let weekInc = 0;
      let weekExp = 0;
      let weekStart = new Date(temp);
      let count = 1;

      while (temp <= endDate) {
        const key = temp.toISOString().slice(0, 10);
        weekInc += dailyIncomeMap[key] || 0;
        weekExp += dailyExpenseMap[key] || 0;

        if (temp.getDay() === 6 || temp.getTime() === endDate.getTime()) {
          result.push({
            label: `Wk ${count++}`,
            income: weekInc,
            expense: weekExp
          });
          weekInc = 0;
          weekExp = 0;
          weekStart = new Date(temp);
          weekStart.setDate(weekStart.getDate() + 1);
        }
        temp.setDate(temp.getDate() + 1);
      }
      return result;
    } else {
      // Monthly Income vs Expense comparison
      const result: { label: string; income: number; expense: number }[] = [];
      const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const endLimit = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

      while (current <= endLimit) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 1);

        const slice = filteredTransactions.filter(t => {
          const d = new Date(t.transactionDate);
          return d >= monthStart && d < monthEnd;
        });

        result.push({
          label: current.toLocaleString('en', { month: 'short' }),
          income: slice.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0),
          expense: slice.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0),
        });

        current.setMonth(current.getMonth() + 1);
      }
      return result;
    }
  }, [filteredTransactions, startDate, endDate]);

  // Line Chart aggregated daily/weekly/monthly expenses
  const lineData = useMemo(() => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dailyMap: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      const key = t.transactionDate.slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + t.amount;
    });

    if (diffDays <= 7) {
      // Show daily labels as weekday names for weekly data
      const sortedDays: { label: string; value: number }[] = [];
      const temp = new Date(startDate);
      while (temp <= endDate) {
        const key = temp.toISOString().slice(0, 10);
        const label = temp.toLocaleString('en', { weekday: 'short' });
        sortedDays.push({ label, value: dailyMap[key] || 0 });
        temp.setDate(temp.getDate() + 1);
      }
      return sortedDays;
    } else if (diffDays <= 31) {
      // Show daily labels as Date/Month for up to a month
      const sortedDays: { label: string; value: number }[] = [];
      const temp = new Date(startDate);
      while (temp <= endDate) {
        const key = temp.toISOString().slice(0, 10);
        const label = `${temp.getDate()}/${temp.getMonth() + 1}`;
        sortedDays.push({ label, value: dailyMap[key] || 0 });
        temp.setDate(temp.getDate() + 1);
      }
      return sortedDays;
    } else if (diffDays <= 90) {
      // Aggregate by week
      const sortedWeeks: { label: string; value: number }[] = [];
      const temp = new Date(startDate);
      let weekSum = 0;
      let weekStart = new Date(temp);

      while (temp <= endDate) {
        const key = temp.toISOString().slice(0, 10);
        weekSum += dailyMap[key] || 0;

        if (temp.getDay() === 6 || temp.getTime() === endDate.getTime()) {
          const label = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
          sortedWeeks.push({ label, value: weekSum });
          weekSum = 0;
          weekStart = new Date(temp);
          weekStart.setDate(weekStart.getDate() + 1);
        }
        temp.setDate(temp.getDate() + 1);
      }
      return sortedWeeks;
    } else {
      // Aggregate by month
      const monthMap: Record<string, number> = {};
      const temp = new Date(startDate);
      while (temp <= endDate) {
        const key = temp.toISOString().slice(0, 10);
        const monthKey = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}`;
        monthMap[monthKey] = (monthMap[monthKey] || 0) + (dailyMap[key] || 0);
        temp.setDate(temp.getDate() + 1);
      }

      return Object.keys(monthMap).sort().map(k => {
        const parts = k.split('-');
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
        const label = d.toLocaleString('en', { month: 'short' });
        return { label, value: monthMap[k] };
      });
    }
  }, [filteredTransactions, startDate, endDate]);

  if (loading) return (
    <View style={[a.root, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  return (
    <View style={[a.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={a.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Title */}
        <Text style={[a.pageTitle, { color: colors.textPrimary }]}>Analytics</Text>

        {/* Reusable Date Range Picker */}
        <View style={a.pickerContainer}>
          <DateRangePicker
            presets={DATE_PRESETS}
            preset={preset}
            onPresetSelect={handlePresetSelect}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            colors={colors}
            shadows={shadows}
            fonts={{ medium: Fonts.medium }}
          />
        </View>

        {/* KPI Cards */}
        <View style={a.kpiRow}>
          <View style={[a.kpiCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            <Text style={a.kpiEmoji}>📈</Text>
            <Text style={[a.kpiVal, { color: colors.income }]}>{fmt(totalIncome)}</Text>
            <Text style={[a.kpiLabel, { color: colors.textSecondary }]}>Income</Text>
          </View>
          <View style={[a.kpiCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            <Text style={a.kpiEmoji}>📉</Text>
            <Text style={[a.kpiVal, { color: colors.expense }]}>{fmt(totalExpense)}</Text>
            <Text style={[a.kpiLabel, { color: colors.textSecondary }]}>Expenses</Text>
          </View>
          <View style={[a.kpiCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            <Text style={a.kpiEmoji}>🎯</Text>
            <Text style={[a.kpiVal, { color: colors.teal }]}>{savingsRate.toFixed(0)}%</Text>
            <Text style={[a.kpiLabel, { color: colors.textSecondary }]}>Saved</Text>
          </View>
        </View>

        {/* Reusable Leetcode Expense Heatmap Grid */}
        <View style={a.section}>
          <Text style={[a.sectionTitle, { color: colors.textPrimary }]}>📅 Daily Expense Heatmap (Last 6 Months)</Text>
          <ExpenseHeatmap
            transactions={transactions}
            startDate={startDate}
            endDate={endDate}
            colors={colors}
            isDark={isDark}
            shadows={shadows}
            fonts={{ medium: Fonts.medium }}
          />
        </View>

        {/* Savings Rate progress */}
        <View style={a.section}>
          <Text style={[a.sectionTitle, { color: colors.textPrimary }]}>Savings Performance</Text>
          <View style={[a.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            <View style={[a.rateBarTrack, { backgroundColor: colors.bgCardAlt }]}>
              <View style={[a.rateBarFill, {
                width: `${Math.min(Math.max(savingsRate, 0), 100)}%`,
                backgroundColor: savingsRate >= 0 ? colors.income : colors.expense
              }]} />
            </View>
            <Text style={[a.rateValue, { color: savingsRate >= 0 ? colors.income : colors.expense }]}>
              {savingsRate >= 0 ? '✅' : '⚠️'} {Math.abs(savingsRate).toFixed(1)}% of income saved in this range
            </Text>
          </View>
        </View>

        {/* Category Breakdown Donut/Pie Chart */}
        <View style={a.section}>
          <Text style={[a.sectionTitle, { color: colors.textPrimary }]}>🏷️ Expense Categories</Text>
          <View style={[a.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            {pieData.length > 0 ? (
              <InteractivePieChart
                data={pieData}
                colors={colors}
                size={85}
                centerLabel="Tap slice"
              />
            ) : (
              <EmptyBox label="No expenses in this filter range" colors={colors} />
            )}
          </View>
        </View>

        {/* Daily/Aggregated Spending Trend Line Chart */}
        <View style={a.section}>
          <Text style={[a.sectionTitle, { color: colors.textPrimary }]}>📈 Spending Trend</Text>
          <View style={[a.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            {lineData.some(item => item.value > 0) ? (
              <View style={a.chartWrap}>
                <InteractiveLineChart
                  data={lineData}
                  colors={colors}
                  width={CARD_INNER_W}
                  lineColor={colors.primary}
                  areaColor={colors.primary}
                />
              </View>
            ) : (
              <EmptyBox label="No expenses to map a trend line" colors={colors} />
            )}
          </View>
        </View>

        {/* Dynamic Comparison Chart */}
        <View style={a.section}>
          <Text style={[a.sectionTitle, { color: colors.textPrimary }]}>📊 Income vs Expenses</Text>
          <View style={[a.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            {comparisonBarData.length > 0 ? (
              <DualBarChart
                data={comparisonBarData}
                colors={colors}
                width={CARD_INNER_W}
              />
            ) : (
              <EmptyBox label="No comparison data in this filter range" colors={colors} />
            )}
          </View>
        </View>

        {/* Top Expense Categories Breakdown Details */}
        {topExpenses.length > 0 && (
          <View style={a.section}>
            <Text style={[a.sectionTitle, { color: colors.textPrimary }]}>Top Expense Categories Details</Text>
            <View style={[a.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
              {topExpenses.map((cat, i) => (
                <View key={cat.name} style={a.catRow}>
                  <View style={a.catLeft}>
                    <Text style={[a.catRank, { color: colors.primary }]}>#{i + 1}</Text>
                    <Text style={[a.catName, { color: colors.textPrimary }]} numberOfLines={1}>{cat.name}</Text>
                    <Text style={[a.catCount, { color: colors.textMuted }]}>{cat.count} txn{cat.count !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={a.catRight}>
                    <View style={[a.catBarTrack, { backgroundColor: colors.bgCardAlt }]}>
                      <View style={[a.catBarFill, { width: `${(cat.total / maxCatExpense) * 100}%`, backgroundColor: colors.expense }]} />
                    </View>
                    <Text style={[a.catAmt, { color: colors.expense }]}>{fmt(cat.total)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const a = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingTop: 52 },
  pageTitle: { fontSize: 26, fontWeight: Fonts.bold, marginBottom: 20 },
  pickerContainer: { marginBottom: 20 },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpiCard: {
    flex: 1, borderRadius: Radii.md,
    padding: 12, alignItems: 'center', borderWidth: 1,
  },
  kpiEmoji: { fontSize: 18, marginBottom: 4 },
  kpiVal: { fontSize: 14, fontWeight: Fonts.bold },
  kpiLabel: { fontSize: 11, marginTop: 4, opacity: 0.8 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: Fonts.bold, marginBottom: 12 },
  card: { borderRadius: Radii.lg, padding: 18, borderWidth: 1 },

  rateBarTrack: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  rateBarFill: { height: '100%', borderRadius: 6 },
  rateValue: { fontSize: 13, fontWeight: Fonts.semiBold, textAlign: 'center' },

  chartWrap: { width: CARD_INNER_W, overflow: 'visible', alignSelf: 'center' },
  emptyBox: { borderRadius: 12, borderWidth: 1, padding: 24, alignItems: 'center', width: '100%' },
  emptyEmoji: { fontSize: 28, marginBottom: 6 },
  emptyLbl: { fontSize: 12, fontWeight: Fonts.medium },

  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  catLeft: { width: 96 },
  catRank: { fontSize: 11, fontWeight: Fonts.bold },
  catName: { fontSize: 13, fontWeight: Fonts.semiBold },
  catCount: { fontSize: 11 },
  catRight: { flex: 1, gap: 4 },
  catBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 4 },
  catAmt: { fontSize: 12, fontWeight: Fonts.bold, textAlign: 'right' },
});
