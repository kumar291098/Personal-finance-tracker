import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, StatusBar
} from 'react-native';
import { getTransactions, Transaction } from '../../api/transactions';
import { Fonts, Radii, useTheme } from '../../theme';

type CategoryStat = { name: string; total: number; count: number; type: 'INCOME' | 'EXPENSE' };

// Simple bar segment component
function BarSegment({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={{ width: `${Math.max(pct * 100, 3)}%`, height: 10, backgroundColor: color, borderRadius: 5 }} />
  );
}

function MonthBar({ label, income, expense, maxVal, colors }: { label: string; income: number; expense: number; maxVal: number, colors: any }) {
  return (
    <View style={a.monthRow}>
      <Text style={[a.monthLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={a.barsCol}>
        <View style={[a.barTrack, { backgroundColor: colors.bgCardAlt }]}>
          <BarSegment pct={income / maxVal} color={colors.income} />
        </View>
        <View style={[a.barTrack, { marginTop: 4, backgroundColor: colors.bgCardAlt }]}>
          <BarSegment pct={expense / maxVal} color={colors.expense} />
        </View>
      </View>
      <View style={a.monthValues}>
        <Text style={[a.monthAmt, { color: colors.income }]}>${income.toFixed(0)}</Text>
        <Text style={[a.monthAmt, { color: colors.expense }]}>${expense.toFixed(0)}</Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const { colors, isDark } = useTheme();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactions().then(data => {
      setTransactions(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Category breakdown
  const categoryMap: Record<string, CategoryStat> = {};
  transactions.forEach(t => {
    const key = `${t.category}|${t.type}`;
    if (!categoryMap[key]) categoryMap[key] = { name: t.category, total: 0, count: 0, type: t.type as any };
    categoryMap[key].total += t.amount;
    categoryMap[key].count += 1;
  });
  const categoryStats = Object.values(categoryMap).sort((a, b) => b.total - a.total);
  const topExpenses = categoryStats.filter(c => c.type === 'EXPENSE').slice(0, 5);
  const maxCatExpense = topExpenses.length > 0 ? topExpenses[0].total : 1;

  // Monthly breakdown (last 6 months)
  const monthlyMap: Record<string, { income: number; expense: number }> = {};
  transactions.forEach(t => {
    const d = new Date(t.transactionDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap[key]) monthlyMap[key] = { income: 0, expense: 0 };
    if (t.type === 'INCOME') monthlyMap[key].income += t.amount;
    else monthlyMap[key].expense += t.amount;
  });
  const monthKeys = Object.keys(monthlyMap).sort().slice(-6);
  const monthlyData = monthKeys.map(k => ({ label: k.slice(5), ...monthlyMap[k] }));
  const maxMonthVal = Math.max(...monthlyData.map(m => Math.max(m.income, m.expense)), 1);

  if (loading) return (
    <View style={[a.root, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  return (
    <View style={[a.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={a.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[a.pageTitle, { color: colors.textPrimary }]}>Analytics</Text>

        {/* KPI Cards */}
        <View style={a.kpiRow}>
          <View style={[a.kpiCard, { backgroundColor: colors.bgCard, borderColor: `${colors.income}44` }]}>
            <Text style={a.kpiEmoji}>💰</Text>
            <Text style={[a.kpiVal, { color: colors.income }]}>${totalIncome.toFixed(0)}</Text>
            <Text style={[a.kpiLabel, { color: colors.textSecondary }]}>Total Income</Text>
          </View>
          <View style={[a.kpiCard, { backgroundColor: colors.bgCard, borderColor: `${colors.expense}44` }]}>
            <Text style={a.kpiEmoji}>💸</Text>
            <Text style={[a.kpiVal, { color: colors.expense }]}>${totalExpense.toFixed(0)}</Text>
            <Text style={[a.kpiLabel, { color: colors.textSecondary }]}>Total Spent</Text>
          </View>
          <View style={[a.kpiCard, { backgroundColor: colors.bgCard, borderColor: `${colors.primary}44` }]}>
            <Text style={a.kpiEmoji}>📦</Text>
            <Text style={[a.kpiVal, { color: colors.primary }]}>{savingsRate.toFixed(0)}%</Text>
            <Text style={[a.kpiLabel, { color: colors.textSecondary }]}>Saved</Text>
          </View>
        </View>

        {/* Savings Rate Bar */}
        <View style={a.section}>
          <Text style={[a.sectionTitle, { color: colors.textPrimary }]}>Savings Rate</Text>
          <View style={[a.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={[a.rateBarTrack, { backgroundColor: colors.bgCardAlt }]}>
              <View style={[a.rateBarFill, {
                width: `${Math.min(Math.max(savingsRate, 0), 100)}%`,
                backgroundColor: savingsRate >= 0 ? colors.income : colors.expense
              }]} />
            </View>
            <Text style={[a.rateValue, { color: savingsRate >= 0 ? colors.income : colors.expense }]}>
              {savingsRate >= 0 ? '✅' : '⚠️'} {Math.abs(savingsRate).toFixed(1)}% of income saved
            </Text>
          </View>
        </View>

        {/* Monthly Bars */}
        {monthlyData.length > 0 && (
          <View style={a.section}>
            <Text style={[a.sectionTitle, { color: colors.textPrimary }]}>Monthly Overview</Text>
            <View style={[a.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={a.legendRow}>
                <View style={a.legendItem}><View style={[a.legendDot, { backgroundColor: colors.income }]} /><Text style={[a.legendText, { color: colors.textSecondary }]}>Income</Text></View>
                <View style={a.legendItem}><View style={[a.legendDot, { backgroundColor: colors.expense }]} /><Text style={[a.legendText, { color: colors.textSecondary }]}>Expense</Text></View>
              </View>
              {monthlyData.map(m => (
                <MonthBar key={m.label} label={m.label} income={m.income} expense={m.expense} maxVal={maxMonthVal} colors={colors} />
              ))}
            </View>
          </View>
        )}

        {/* Top Expense Categories */}
        {topExpenses.length > 0 && (
          <View style={a.section}>
            <Text style={[a.sectionTitle, { color: colors.textPrimary }]}>Top Expense Categories</Text>
            <View style={[a.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {topExpenses.map((cat, i) => (
                <View key={cat.name} style={a.catRow}>
                  <View style={a.catLeft}>
                    <Text style={[a.catRank, { color: colors.primary }]}>#{i + 1}</Text>
                    <Text style={[a.catName, { color: colors.textPrimary }]}>{cat.name}</Text>
                    <Text style={[a.catCount, { color: colors.textMuted }]}>{cat.count} txn{cat.count !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={a.catRight}>
                    <View style={[a.catBarTrack, { backgroundColor: colors.bgCardAlt }]}>
                      <View style={[a.catBarFill, { width: `${(cat.total / maxCatExpense) * 100}%`, backgroundColor: colors.expense }]} />
                    </View>
                    <Text style={[a.catAmt, { color: colors.expense }]}>${cat.total.toFixed(0)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {transactions.length === 0 && (
          <View style={a.emptyState}>
            <Text style={a.emptyEmoji}>📊</Text>
            <Text style={[a.emptyText, { color: colors.textSecondary }]}>Add transactions to see analytics</Text>
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

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  kpiCard: {
    flex: 1, borderRadius: Radii.md,
    padding: 14, alignItems: 'center', borderWidth: 1,
  },
  kpiEmoji: { fontSize: 22, marginBottom: 6 },
  kpiVal: { fontSize: 16, fontWeight: Fonts.bold },
  kpiLabel: { fontSize: 11, marginTop: 4 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: Fonts.bold, marginBottom: 12 },
  card: { borderRadius: Radii.lg, padding: 18, borderWidth: 1 },

  rateBarTrack: { height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  rateBarFill: { height: '100%', borderRadius: 6 },
  rateValue: { fontSize: 14, fontWeight: Fonts.semiBold, textAlign: 'center' },

  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },

  monthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  monthLabel: { width: 28, fontSize: 12 },
  barsCol: { flex: 1, marginHorizontal: 10 },
  barTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  monthValues: { width: 56, alignItems: 'flex-end', gap: 4 },
  monthAmt: { fontSize: 11, fontWeight: Fonts.semiBold },

  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  catLeft: { width: 90 },
  catRank: { fontSize: 12, fontWeight: Fonts.bold },
  catName: { fontSize: 14, fontWeight: Fonts.semiBold },
  catCount: { fontSize: 11 },
  catRight: { flex: 1, gap: 4 },
  catBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 4 },
  catAmt: { fontSize: 13, fontWeight: Fonts.bold, textAlign: 'right' },

  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 14 },
  emptyText: { fontSize: 16 },
});
