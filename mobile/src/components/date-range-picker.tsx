import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export type Preset = {
  label: string;
  days: number;
};

export type DateRangePickerProps = {
  presets: Preset[];
  preset: Preset;
  onPresetSelect: (preset: Preset) => void;
  startDate: Date;
  onStartDateChange: (date: Date) => void;
  endDate: Date;
  onEndDateChange: (date: Date) => void;
  colors: any;
  shadows?: any;
  fonts?: any;
};

function formatDateString(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateRangePicker({
  presets,
  preset,
  onPresetSelect,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  colors,
  shadows = {},
  fonts = {},
}: DateRangePickerProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  return (
    <View style={s.root}>
      {/* Preset Chips Row */}
      <View style={s.presetsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsRow}>
          {presets.map(p => {
            const active = preset.label === p.label;
            return (
              <TouchableOpacity
                key={p.label}
                style={[
                  s.chip,
                  {
                    backgroundColor: active ? colors.primary : colors.bgCard,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => onPresetSelect(p)}
              >
                <Text style={[s.chipTxt, { color: active ? '#fff' : colors.textSecondary }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Custom Picker Fields */}
      {preset.label === 'Custom' && (
        <View style={[s.card, s.customDatesCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
          <View style={s.customDatesRow}>
            <View style={s.dateFieldContainer}>
              <Text style={[s.dateFieldLabel, { color: colors.textSecondary }]}>Start Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={formatDateString(startDate)}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) onStartDateChange(d);
                  }}
                  style={{
                    backgroundColor: colors.bgInput,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 14,
                    outline: 'none',
                    width: '90%',
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={[s.dateButton, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: fonts.medium || '500' }}>
                      {formatDateString(startDate)}
                    </Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      maximumDate={endDate}
                      onChange={(e: any, selectedDate?: Date) => {
                        setShowStartPicker(false);
                        if (selectedDate) onStartDateChange(selectedDate);
                      }}
                    />
                  )}
                </>
              )}
            </View>

            <View style={s.dateFieldContainer}>
              <Text style={[s.dateFieldLabel, { color: colors.textSecondary }]}>End Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={formatDateString(endDate)}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) onEndDateChange(d);
                  }}
                  style={{
                    backgroundColor: colors.bgInput,
                    color: colors.textPrimary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 14,
                    outline: 'none',
                    width: '90%',
                  }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={[s.dateButton, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: fonts.medium || '500' }}>
                      {formatDateString(endDate)}
                    </Text>
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      minimumDate={startDate}
                      maximumDate={new Date()}
                      onChange={(e: any, selectedDate?: Date) => {
                        setShowEndPicker(false);
                        if (selectedDate) onEndDateChange(selectedDate);
                      }}
                    />
                  )}
                </>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { width: '100%' },
  presetsContainer: { marginBottom: 14 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipTxt: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 16, padding: 18, borderWidth: 1 },
  customDatesCard: { marginBottom: 14, padding: 14 },
  customDatesRow: { flexDirection: 'row', gap: 12 },
  dateFieldContainer: { flex: 1 },
  dateFieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  dateButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
});
