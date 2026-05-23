/**
 * Reusable interactive chart components.
 * Uses react-native-gifted-charts for tap-to-tooltip support on mobile.
 * All charts accept theme colors as props so they work in dark/light mode.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';

const SCREEN_W = Dimensions.get('window').width;

// ─── Types ───────────────────────────────────────────────────────────────────

export type BarDataItem = {
  value: number;
  label?: string;
  frontColor?: string;
  topLabelComponent?: () => React.ReactElement;
};

export type LineDataItem = {
  value: number;
  label?: string;
  dataPointText?: string;
};

export type PieDataItem = {
  value: number;
  color: string;
  text?: string;
  label?: string;
};

// ─── Tooltip helper ──────────────────────────────────────────────────────────

function Tooltip({ label, value, color, colors }: {
  label?: string; value: number; color?: string; colors: any;
}) {
  return (
    <View style={[tt.box, { backgroundColor: colors.bgCard, borderColor: color || colors.primary }]}>
      {label ? <Text style={[tt.label, { color: colors.textMuted }]}>{label}</Text> : null}
      <Text style={[tt.value, { color: color || colors.primary }]}>₹{value.toLocaleString('en-IN')}</Text>
    </View>
  );
}

const tt = StyleSheet.create({
  box: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.18,
    shadowRadius: 6, elevation: 4,
  },
  label: { fontSize: 10, marginBottom: 2 },
  value: { fontSize: 13, fontWeight: '700' },
});

// ─── Interactive Bar Chart ────────────────────────────────────────────────────

export function InteractiveBarChart({ data, colors, width, barColor, title }: {
  data: BarDataItem[];
  colors: any;
  width?: number;
  barColor?: string;
  title?: string;
}) {
  const [tooltip, setTooltip] = useState<{ index: number; value: number; label?: string } | null>(null);
  const chartWidth = width ?? SCREEN_W - 80;

  const chartData = data.map((item, i) => ({
    ...item,
    frontColor: tooltip?.index === i ? (barColor || colors.teal) : (item.frontColor || barColor || colors.primary),
    topLabelComponent: tooltip?.index === i
      ? () => <Tooltip value={item.value} label={item.label} color={barColor || colors.primary} colors={colors} />
      : undefined,
  }));

  return (
    <View>
      {title ? <Text style={[s.chartTitle, { color: colors.textPrimary }]}>{title}</Text> : null}
      <BarChart
        data={chartData}
        width={chartWidth}
        height={180}
        barWidth={Math.max(18, Math.floor(chartWidth / (data.length * 2.2)))}
        spacing={Math.max(10, Math.floor(chartWidth / (data.length * 3)))}
        roundedTop
        hideRules={false}
        rulesColor={colors.border}
        rulesType="solid"
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
        noOfSections={4}
        isAnimated
        animationDuration={600}
        onPress={(item: any, index: number) => {
          setTooltip(prev => prev?.index === index ? null : { index, value: item.value, label: item.label });
        }}
      />
    </View>
  );
}

// ─── Interactive Line Chart ────────────────────────────────────────────────────

export function InteractiveLineChart({ data, colors, width, lineColor, areaColor, title }: {
  data: LineDataItem[];
  colors: any;
  width?: number;
  lineColor?: string;
  areaColor?: string;
  title?: string;
}) {
  const [tooltip, setTooltip] = useState<{ index: number; value: number; label?: string } | null>(null);
  const chartWidth = width ?? SCREEN_W - 80;

  const chartData = data.map((item, i) => ({
    value: item.value,
    label: item.label,
    customDataPoint: tooltip?.index === i
      ? () => (
        <View style={{ alignItems: 'center' }}>
          <View style={[s.activeDot, { borderColor: lineColor || colors.primary, backgroundColor: colors.bgCard }]} />
          <View style={s.tooltipAbove}>
            <Tooltip value={item.value} label={item.label} color={lineColor || colors.primary} colors={colors} />
          </View>
        </View>
      )
      : undefined,
    dataPointColor: tooltip?.index === i ? lineColor || colors.primary : colors.textMuted,
    dataPointRadius: tooltip?.index === i ? 6 : 4,
  }));

  return (
    <View>
      {title ? <Text style={[s.chartTitle, { color: colors.textPrimary }]}>{title}</Text> : null}
      <LineChart
        data={chartData}
        width={chartWidth}
        height={160}
        color={lineColor || colors.primary}
        thickness={2.5}
        startFillColor={areaColor || colors.primary}
        endFillColor={colors.bgCard}
        startOpacity={0.25}
        endOpacity={0}
        areaChart
        curved
        hideRules={false}
        rulesColor={colors.border}
        rulesType="solid"
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
        noOfSections={4}
        isAnimated
        animationDuration={700}
        dataPointsColor={lineColor || colors.primary}
        dataPointsRadius={4}
        onPress={(item: any, index: number) => {
          setTooltip(prev => prev?.index === index ? null : { index, value: item.value, label: item.label });
        }}
      />
    </View>
  );
}

// ─── Interactive Pie Chart ────────────────────────────────────────────────────

export function InteractivePieChart({ data, colors, size, title, centerLabel }: {
  data: PieDataItem[];
  colors: any;
  size?: number;
  title?: string;
  centerLabel?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const radius = (size ?? 100);

  const chartData = data.map((item, i) => ({
    value: item.value,
    color: item.color,
    text: selected === i ? `${((item.value / data.reduce((s, d) => s + d.value, 0)) * 100).toFixed(0)}%` : '',
    focused: selected === i,
    shiftX: selected === i ? 6 : 0,
    shiftY: selected === i ? -6 : 0,
  }));

  const total = data.reduce((s, d) => s + d.value, 0);
  const sel = selected !== null ? data[selected] : null;

  return (
    <View style={s.pieWrap}>
      {title ? <Text style={[s.chartTitle, { color: colors.textPrimary }]}>{title}</Text> : null}
      <View style={s.pieRow}>
        <PieChart
          data={chartData}
          radius={radius}
          innerRadius={radius * 0.55}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
              {sel ? (
                <>
                  <Text style={{ color: sel.color, fontSize: 13, fontWeight: '700' }}>
                    {((sel.value / total) * 100).toFixed(0)}%
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', maxWidth: radius }}>
                    {sel.label}
                  </Text>
                </>
              ) : (
                <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', paddingHorizontal: 4 }}>
                  {centerLabel || 'Tap slice'}
                </Text>
              )}
            </View>
          )}
          onPress={(_item: any, index: number) => {
            setSelected(prev => prev === index ? null : index);
          }}
          isAnimated
          animationDuration={500}
          showText
          textSize={12}
          textColor="#FFFFFF"
        />

        {/* Legend */}
        <View style={s.pieLegend}>
          {data.map((item, i) => (
            <View key={i} style={s.pieLegendRow}>
              <View style={[s.pieDot, { backgroundColor: item.color, opacity: selected === null || selected === i ? 1 : 0.4 }]} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[s.pieLegendLabel, { color: selected === i ? item.color : colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                <Text style={[s.pieLegendAmt, { color: colors.textMuted }]}>
                  ₹{item.value.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Dual Bar Chart (Income vs Expense) ──────────────────────────────────────

export function DualBarChart({ data, colors, width, title }: {
  data: { label: string; income: number; expense: number }[];
  colors: any;
  width?: number;
  title?: string;
}) {
  const [tooltip, setTooltip] = useState<{ index: number; type: 'income' | 'expense'; value: number } | null>(null);
  const chartWidth = width ?? SCREEN_W - 80;

  const barData: any[] = [];
  data.forEach((item, i) => {
    barData.push({
      value: item.income,
      label: item.label,
      frontColor: tooltip?.index === i && tooltip.type === 'income' ? colors.teal : colors.income,
      spacing: 4,
      topLabelComponent: tooltip?.index === i && tooltip.type === 'income'
        ? () => <Tooltip value={item.income} label="Income" color={colors.income} colors={colors} />
        : undefined,
      onPress: () => setTooltip(prev =>
        prev?.index === i && prev.type === 'income' ? null : { index: i, type: 'income', value: item.income }
      ),
    });
    barData.push({
      value: item.expense,
      frontColor: tooltip?.index === i && tooltip.type === 'expense' ? '#FF8A8A' : colors.expense,
      spacing: i < data.length - 1 ? 16 : 0,
      topLabelComponent: tooltip?.index === i && tooltip.type === 'expense'
        ? () => <Tooltip value={item.expense} label="Expense" color={colors.expense} colors={colors} />
        : undefined,
      onPress: () => setTooltip(prev =>
        prev?.index === i && prev.type === 'expense' ? null : { index: i, type: 'expense', value: item.expense }
      ),
    });
  });

  return (
    <View>
      {title ? <Text style={[s.chartTitle, { color: colors.textPrimary }]}>{title}</Text> : null}
      <View style={[s.dualLegendRow]}>
        <View style={s.dualLegendItem}>
          <View style={[s.dualDot, { backgroundColor: colors.income }]} />
          <Text style={[s.dualLegendTxt, { color: colors.textSecondary }]}>Income</Text>
        </View>
        <View style={s.dualLegendItem}>
          <View style={[s.dualDot, { backgroundColor: colors.expense }]} />
          <Text style={[s.dualLegendTxt, { color: colors.textSecondary }]}>Expense</Text>
        </View>
      </View>
      <BarChart
        data={barData}
        width={chartWidth}
        height={180}
        barWidth={Math.max(14, Math.floor(chartWidth / (data.length * 5)))}
        spacing={Math.max(6, Math.floor(chartWidth / (data.length * 8)))}
        roundedTop
        hideRules={false}
        rulesColor={colors.border}
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
        noOfSections={4}
        isAnimated
        animationDuration={600}
        onPress={(item: any, index: number) => {
          item.onPress?.();
        }}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  chartTitle: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  activeDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  tooltipAbove: { position: 'absolute', bottom: 20 },
  pieWrap: {},
  pieRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pieLegend: { flex: 1, gap: 8 },
  pieLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pieDot: { width: 10, height: 10, borderRadius: 5 },
  pieLegendLabel: { fontSize: 12, fontWeight: '600' },
  pieLegendAmt: { fontSize: 11, marginTop: 1 },
  dualLegendRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  dualLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dualDot: { width: 10, height: 10, borderRadius: 5 },
  dualLegendTxt: { fontSize: 12, fontWeight: '600' },
});
