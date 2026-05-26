import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar, Platform, Alert, ActivityIndicator, Switch, Modal,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useTheme } from '../../theme';
import { changePassword, deleteAccount, getProfile, updateProfile, UserProfile } from '../../api/profile';
import DateTimePicker from '@react-native-community/datetimepicker';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>{title}</Text>
  );
}

function FieldRow({
  label, value, onChangeText, placeholder, keyboardType, secureTextEntry, colors,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; secureTextEntry?: boolean; colors: any;
}) {
  return (
    <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || `Enter ${label.toLowerCase()}`}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { colors, shadows, isDark, mode, setMode } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Editable fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
      setFirstName(data.firstName || '');
      setLastName(data.lastName || '');
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setUsername(data.username || '');
      setGender(data.gender || '');
      setDateOfBirth(data.dateOfBirth || '');
      setCurrency(data.currency || 'INR');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({
        username,
        email,
        phone,
        firstName,
        lastName,
        gender,
        dateOfBirth,
        currency: currency.trim().toUpperCase() || 'INR',
      });
      // Update stored token if returned
      if (updated.token) {
        if (Platform.OS === 'web') localStorage.setItem('userToken', updated.token);
        else await SecureStore.setItemAsync('userToken', updated.token);
      }
      if (Platform.OS === 'web') localStorage.setItem('username', updated.username);
      else await SecureStore.setItemAsync('username', updated.username);

      setProfile(updated as UserProfile);
      setEditMode(false);
      const msg = updated.message || 'Profile updated successfully!';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('✅ Success', msg);
    } catch (e: any) {
      Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const clearSession = async () => {
    if (Platform.OS === 'web') {
      localStorage.clear();
      return;
    }

    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('username');
    await SecureStore.deleteItemAsync('accessLevel');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Platform.OS === 'web'
        ? window.alert('Fill all password fields.')
        : Alert.alert('Error', 'Fill all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Platform.OS === 'web'
        ? window.alert('New password and confirmation do not match.')
        : Alert.alert('Error', 'New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const result = await changePassword({ currentPassword, newPassword, confirmPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      const message = result.message || 'Password changed successfully.';
      Platform.OS === 'web' ? window.alert(message) : Alert.alert('Success', message);
    } catch (e: any) {
      Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Error', e.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      Platform.OS === 'web'
        ? window.alert('Enter your password to delete your account.')
        : Alert.alert('Error', 'Enter your password to delete your account.');
      return;
    }

    const doDelete = async () => {
      setDeleting(true);
      try {
        await deleteAccount(deletePassword);
        await clearSession();
        router.replace('/');
      } catch (e: any) {
        Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Error', e.message);
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete your account permanently? This cannot be undone.')) doDelete();
      return;
    }

    Alert.alert('Delete Account', 'Delete your account permanently? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await clearSession();
      router.replace('/');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Logout from your account?')) doLogout();
    } else {
      Alert.alert('Logout', 'Logout from your account?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const accessColor = profile?.accessLevel === 'ADMIN' ? colors.teal
    : profile?.accessLevel === 'SUBSCRIBER' ? colors.primary : colors.textMuted;

  const accessLabel = profile?.accessLevel === 'ADMIN' ? '👑 Admin'
    : profile?.accessLevel === 'SUBSCRIBER' ? '⭐ Subscriber' : '🔓 Free';

  const initials = (profile?.firstName || profile?.username || 'U').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary, ...shadows.violet }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={[styles.displayName, { color: colors.textPrimary }]}>
            {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : profile?.username}
          </Text>
          <Text style={[styles.displayUsername, { color: colors.textSecondary }]}>@{profile?.username}</Text>
          <View style={[styles.accessBadge, { backgroundColor: `${accessColor}22`, borderColor: `${accessColor}44` }]}>
            <Text style={[styles.accessBadgeText, { color: accessColor }]}>{accessLabel}</Text>
          </View>
        </View>

        {/* ── Edit / Save button ── */}
        <View style={styles.actionRow}>
          {editMode ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${colors.expense}22`, borderColor: `${colors.expense}44` }]}
                onPress={() => setEditMode(false)}
              >
                <Text style={[styles.actionBtnText, { color: colors.expense }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary, ...shadows.violet }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>{saving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, { flex: 1, backgroundColor: colors.bgCard, borderColor: colors.border, borderWidth: 1 }]}
              onPress={() => setEditMode(true)}
            >
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>✏️  Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Personal Info ── */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
          <SectionHeader title="PERSONAL INFORMATION" colors={colors} />
          <FieldRow label="First Name" value={firstName} onChangeText={setFirstName} colors={colors} />
          <FieldRow label="Last Name" value={lastName} onChangeText={setLastName} colors={colors} />
          <FieldRow label="Username" value={username} onChangeText={setUsername} colors={colors} />
          <FieldRow label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" colors={colors} />
          <FieldRow label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" colors={colors} />
          <View style={[styles.dobRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DOB</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                style={{
                  flex: 1,
                  backgroundColor: colors.bgInput,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 15,
                  outline: 'none',
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.calendarField, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.82}
                >
                  <Text style={[styles.calendarFieldText, { color: dateOfBirth ? colors.textPrimary : colors.textMuted }]}>
                    {dateOfBirth || 'Select date'}
                  </Text>
                  <Text style={[styles.calendarIcon, { color: colors.primary }]}>📅</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={dateOfBirth ? new Date(dateOfBirth) : new Date(new Date().getFullYear() - 20, 0, 1)}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(event: any, selectedDate?: Date) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                      if (selectedDate) {
                        const year = selectedDate.getFullYear();
                        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                        const day = String(selectedDate.getDate()).padStart(2, '0');
                        setDateOfBirth(`${year}-${month}-${day}`);
                      }
                    }}
                  />
                )}
                {Platform.OS === 'ios' && showDatePicker && (
                  <View style={{ position: 'absolute', right: 0, top: -40, backgroundColor: colors.bgCard, zIndex: 10, borderRadius: 8, padding: 4 }}>
                     <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                       <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Done</Text>
                     </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* ── Gender Picker ── */}
        {editMode && (
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            <SectionHeader title="GENDER" colors={colors} />
            <View style={styles.chipRow}>
              {GENDER_OPTIONS.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, gender === g ? { backgroundColor: colors.primary } : { backgroundColor: colors.bgCardAlt, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => setGender(g)}
                >
                  <Text style={[styles.chipText, { color: gender === g ? '#fff' : colors.textSecondary }]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Currency Picker ── */}
        {editMode && (
          <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            <SectionHeader title="PREFERRED CURRENCY" colors={colors} />
            <FieldRow
              label="Currency"
              value={currency}
              onChangeText={value => setCurrency(value.toUpperCase())}
              placeholder="INR, USD, EUR..."
              colors={colors}
            />
            <View style={styles.chipRow}>
              {CURRENCY_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, currency === c ? { backgroundColor: colors.primary } : { backgroundColor: colors.bgCardAlt, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.chipText, { color: currency === c ? '#fff' : colors.textSecondary }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
          <SectionHeader title="CHANGE PASSWORD" colors={colors} />
          <FieldRow label="Current" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Current password" secureTextEntry colors={colors} />
          <FieldRow label="New" value={newPassword} onChangeText={setNewPassword} placeholder="New password" secureTextEntry colors={colors} />
          <FieldRow label="Confirm" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirm password" secureTextEntry colors={colors} />
          <TouchableOpacity
            style={[styles.passwordBtn, { backgroundColor: colors.primary }, passwordSaving && styles.disabledBtn]}
            onPress={handleChangePassword}
            disabled={passwordSaving}
          >
            <Text style={styles.passwordBtnText}>{passwordSaving ? 'Changing...' : 'Change Password'}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Appearance ── */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
          <SectionHeader title="APPEARANCE" colors={colors} />
          <View style={styles.themeRow}>
            <View>
              <Text style={[styles.themeName, { color: colors.textPrimary }]}>
                {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
              </Text>
              <Text style={[styles.themeHint, { color: colors.textMuted }]}>
                {mode === 'system' ? 'Following system setting' : `Manually set to ${mode}`}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme => setMode(isDark ? 'light' : 'dark')}
              trackColor={{ false: colors.border, true: `${colors.primary}88` }}
              thumbColor={isDark ? colors.primary : colors.textMuted}
            />
          </View>
          {/* System option */}
          <TouchableOpacity
            style={[styles.systemThemeBtn, { backgroundColor: mode === 'system' ? `${colors.primary}22` : colors.bgCardAlt, borderColor: mode === 'system' ? colors.primary : colors.border }]}
            onPress={() => setMode('system')}
          >
            <Text style={[styles.systemThemeBtnText, { color: mode === 'system' ? colors.primary : colors.textSecondary }]}>
              📱 Use System Default {mode === 'system' ? '(Active)' : ''}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Account Info ── */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
          <SectionHeader title="ACCOUNT" colors={colors} />
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Access Level</Text>
            <Text style={[styles.infoValue, { color: accessColor, fontWeight: '700' }]}>{accessLabel}</Text>
          </View>
          {profile?.subscriberUntil && (
            <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Subscriber Until</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {new Date(profile.subscriberUntil).toLocaleDateString()}
              </Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Currency</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{profile?.currency || 'INR'}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Gender</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{profile?.gender || 'Not set'}</Text>
          </View>
          <View style={[styles.infoRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>DOB</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{profile?.dateOfBirth || 'Not set'}</Text>
          </View>
        </View>

        {/* ── Quick Links ── */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
          <SectionHeader title="QUICK LINKS" colors={colors} />
          {[
            { icon: '⭐', label: 'Subscription & Access', onPress: () => router.push('/(tabs)/subscription') },
            { icon: '🔑', label: 'Change Password (via Forgot Password)', onPress: () => router.push('/forgot-password') },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}
              onPress={item.onPress}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.menuArrow, { color: colors.textMuted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: `${colors.expense}44`, ...shadows.card }]}>
          <SectionHeader title="DELETE ACCOUNT" colors={colors} />
          <Text style={[styles.dangerText, { color: colors.textSecondary }]}>
            This permanently removes your account, categories, and transactions.
          </Text>
          <FieldRow label="Password" value={deletePassword} onChangeText={setDeletePassword} placeholder="Confirm password" secureTextEntry colors={colors} />
          <TouchableOpacity
            style={[styles.deleteAccountBtn, { backgroundColor: `${colors.expense}18`, borderColor: `${colors.expense}55` }, deleting && styles.disabledBtn]}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <Text style={[styles.deleteAccountText, { color: colors.expense }]}>
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: `${colors.expense}15`, borderColor: `${colors.expense}44` }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutBtnText, { color: colors.expense }]}>🚪  Logout</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMuted }]}>Finance Tracker v1.1.0</Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { padding: 20, paddingTop: 52 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(108,99,255,0.4)', marginBottom: 14,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  displayName: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  displayUsername: { fontSize: 14, marginBottom: 10 },
  accessBadge: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 9999, borderWidth: 1,
  },
  accessBadgeText: { fontSize: 13, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: { fontWeight: '700', fontSize: 14 },

  card: {
    borderRadius: 16, marginBottom: 16, borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  fieldLabel: { width: 90, fontSize: 13, fontWeight: '500' },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  calendarField: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  calendarFieldText: { flex: 1, fontSize: 15, fontWeight: '600' },
  calendarIcon: { fontSize: 18 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9999 },
  chipText: { fontSize: 13, fontWeight: '500' },

  themeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  themeName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  themeHint: { fontSize: 12 },
  systemThemeBtn: {
    marginHorizontal: 16, marginBottom: 14, paddingVertical: 10,
    borderRadius: 8, alignItems: 'center', borderWidth: 1,
  },
  systemThemeBtnText: { fontSize: 13, fontWeight: '600' },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14 },

  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuIcon: { fontSize: 18, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  menuArrow: { fontSize: 22 },

  passwordBtn: {
    alignItems: 'center',
    borderRadius: 12,
    margin: 16,
    marginTop: 12,
    paddingVertical: 13,
  },
  passwordBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  dangerText: { fontSize: 13, lineHeight: 19, paddingHorizontal: 16, paddingTop: 8 },
  deleteAccountBtn: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    marginTop: 12,
    paddingVertical: 13,
  },
  deleteAccountText: { fontSize: 14, fontWeight: '700' },
  disabledBtn: { opacity: 0.65 },

  logoutBtn: {
    borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1, marginBottom: 16,
  },
  logoutBtnText: { fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', fontSize: 12, marginBottom: 8 },
});
