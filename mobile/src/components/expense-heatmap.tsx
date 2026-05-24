import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

export type ExpenseHeatmapProps = {
  transactions: { transactionDate: string; amount: number; type: string }[];
  startDate: Date;
  endDate: Date;
  colors: any;
  isDark: boolean;
  shadows?: any;
  fonts?: any;
};

function fmt(n: number) {
  return `₹${Math.round(Math.abs(n)).toLocaleString('en-IN')}`;
}

const getCellColor = (amount: number, isDark: boolean, colors: any) => {
  if (amount === 0) return colors.bgCardAlt;
  if (amount <= 500) return `${colors.primary}33`; // 20% opacity
  if (amount <= 2000) return `${colors.primary}66`; // 40% opacity
  if (amount <= 5000) return `${colors.primary}bb`; // 73% opacity
  return colors.primary; // 100% opacity
};

export function ExpenseHeatmap({
  transactions,
  startDate,
  endDate,
  colors,
  isDark,
  shadows = {},
  fonts = {},
}: ExpenseHeatmapProps) {
  const [selectedCell, setSelectedCell] = useState<{ dateStr: string; amount: number } | null>(null);

  // Heatmap calculation based on selected date range
  const heatmapData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startDay = start.getDay();
    start.setDate(start.getDate() - startDay); // Align to Sunday

    const expenseMap: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
        const key = t.transactionDate.slice(0, 10);
        expenseMap[key] = (expenseMap[key] || 0) + t.amount;
      }
    });

    const weeks: { date: Date; dateStr: string; amount: number }[][] = [];
    let currentWeek: { date: Date; dateStr: string; amount: number }[] = [];

    const temp = new Date(start);
    while (temp <= end || currentWeek.length > 0) {
      const dateStr = temp.toISOString().slice(0, 10);
      const amount = expenseMap[dateStr] || 0;

      currentWeek.push({
        date: new Date(temp),
        dateStr,
        amount,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      temp.setDate(temp.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        const dateStr = temp.toISOString().slice(0, 10);
        currentWeek.push({
          date: new Date(temp),
          dateStr,
          amount: 0,
        });
        temp.setDate(temp.getDate() + 1);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [transactions, startDate, endDate]);

  return (
    <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
      <View style={s.heatmapWrapper}>
        {/* Day Labels Column */}
        <View style={s.dayLabelsColumn}>
          <Text style={[s.dayLabel, { color: colors.textMuted }]}>Su</Text>
          <Text style={[s.dayLabel, { color: colors.textMuted }]} />
          <Text style={[s.dayLabel, { color: colors.textMuted }]}>Tu</Text>
          <Text style={[s.dayLabel, { color: colors.textMuted }]} />
          <Text style={[s.dayLabel, { color: colors.textMuted }]}>Th</Text>
          <Text style={[s.dayLabel, { color: colors.textMuted }]} />
          <Text style={[s.dayLabel, { color: colors.textMuted }]}>Sa</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.heatmapScroll}>
          <View style={s.heatmapGrid}>
            {heatmapData.map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={s.heatmapColumn}>
                {week.map(day => {
                  const cellColor = getCellColor(day.amount, isDark, colors);
                  const isSelected = selectedCell?.dateStr === day.dateStr;
                  return (
                    <TouchableOpacity
                      key={day.dateStr}
                      style={[
                        s.heatmapCell,
                        {
                          backgroundColor: cellColor,
                          borderColor: isSelected ? colors.teal : 'transparent',
                          borderWidth: isSelected ? 1.5 : 0,
                        }
                      ]}
                      onPress={() => setSelectedCell({ dateStr: day.dateStr, amount: day.amount })}
                      activeOpacity={0.8}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={s.heatmapLegendRow}>
        <Text style={[s.heatmapLegendLabel, { color: colors.textMuted }]}>Less</Text>
        <View style={[s.heatmapLegendCell, { backgroundColor: colors.bgCardAlt }]} />
        <View style={[s.heatmapLegendCell, { backgroundColor: `${colors.primary}33` }]} />
        <View style={[s.heatmapLegendCell, { backgroundColor: `${colors.primary}66` }]} />
        <View style={[s.heatmapLegendCell, { backgroundColor: `${colors.primary}bb` }]} />
        <View style={[s.heatmapLegendCell, { backgroundColor: colors.primary }]} />
        <Text style={[s.heatmapLegendLabel, { color: colors.textMuted }]}>More</Text>
      </View>

      {/* Tapped Detail Card */}
      <View style={s.selectedCellContainer}>
        {selectedCell ? (
          <View style={[s.selectedCard, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
            <Text style={[s.selectedDate, { color: colors.textSecondary }]}>
              {new Date(selectedCell.dateStr).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
            <Text style={[s.selectedAmount, { color: selectedCell.amount > 0 ? colors.expense : colors.textMuted }]}>
              {selectedCell.amount > 0 ? fmt(selectedCell.amount) : 'No expenses'}
            </Text>
          </View>
        ) : (
          <Text style={[s.heatmapHint, { color: colors.textMuted }]}>Tap a grid cell above to inspect daily expenses</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 18, borderWidth: 1 },
  heatmapWrapper: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dayLabelsColumn: { marginRight: 6, gap: 3, justifyContent: 'space-between', height: 102 },
  dayLabel: { fontSize: 9, height: 12, lineHeight: 12, textAlign: 'right', width: 14 },
  heatmapScroll: { paddingVertical: 4 },
  heatmapGrid: { flexDirection: 'row', gap: 3 },
  heatmapColumn: { flexDirection: 'column', gap: 3 },
  heatmapCell: { width: 12, height: 12, borderRadius: 2 },
  heatmapLegendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 12 },
  heatmapLegendLabel: { fontSize: 10, marginHorizontal: 2 },
  heatmapLegendCell: { width: 10, height: 10, borderRadius: 2 },
  selectedCellContainer: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F033', paddingTop: 12, alignItems: 'center', width: '100%' },
  selectedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedDate: { fontSize: 13, fontWeight: '500' },
  selectedAmount: { fontSize: 14, fontWeight: '700' },
  heatmapHint: { fontSize: 11, fontStyle: 'italic', textAlign: 'center' },
});
