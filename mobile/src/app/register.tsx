import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../theme';
import { register } from '../api/auth';

export default function RegisterScreen() {
  const { colors, shadows, isDark } = useTheme();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!username.trim()) newErrors.username = 'Username is required.';
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setSuccessMsg('');
    try {
      await register({
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setSuccessMsg('Account created successfully! Redirecting…');
      setTimeout(() => { router.replace('/'); }, 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Registration failed. Please try again.';
      showAlert('Registration Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const styles = makeStyles(colors, shadows, isDark);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Decorative top orb blob */}
      <View style={styles.orbContainer} pointerEvents="none">
        <View style={[styles.orb, styles.orbPrimary, { backgroundColor: colors.primary }]} />
        <View style={[styles.orb, styles.orbAccent, { backgroundColor: colors.teal }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join FinanceTracker today</Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Username *</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg, borderColor: errors.username ? colors.expense : colors.border }]}>
              <Text style={styles.icon}>👤</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Enter your username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={(t) => { setUsername(t); if (errors.username) setErrors(e => ({ ...e, username: '' })); }}
                autoCapitalize="none" autoCorrect={false} returnKeyType="next"
              />
            </View>
            {errors.username ? <Text style={[styles.errorText, { color: colors.expense }]}>{errors.username}</Text> : null}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email (optional)</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={styles.icon}>📧</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Enter your email"
                placeholderTextColor={colors.textMuted}
                value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Phone (optional)</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Text style={styles.icon}>📞</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textMuted}
                value={phone} onChangeText={setPhone}
                keyboardType="phone-pad" returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password *</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg, borderColor: errors.password ? colors.expense : colors.border }]}>
              <Text style={styles.icon}>🔒</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors(e => ({ ...e, password: '' })); }}
                secureTextEntry={!showPassword} autoCapitalize="none" returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.toggleText, { color: colors.primary }]}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? <Text style={[styles.errorText, { color: colors.expense }]}>{errors.password}</Text> : null}
          </View>

          {/* Confirm Password */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm Password *</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.bg, borderColor: errors.confirmPassword ? colors.expense : colors.border }]}>
              <Text style={styles.icon}>🔑</Text>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors(e => ({ ...e, confirmPassword: '' })); }}
                secureTextEntry={!showConfirmPassword} autoCapitalize="none"
                returnKeyType="done" onSubmitEditing={handleRegister}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.toggleText, { color: colors.primary }]}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <Text style={[styles.errorText, { color: colors.expense }]}>{errors.confirmPassword}</Text> : null}
          </View>

          {/* Success Banner */}
          {successMsg ? (
            <View style={[styles.successBanner, { backgroundColor: `${colors.income}20` }]}>
              <Text style={[styles.successText, { color: colors.income }]}>✅ {successMsg}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && styles.submitBtnDisabled]}
            onPress={handleRegister} activeOpacity={0.82} disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitBtnText}>  Creating…</Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sign In link */}
        <TouchableOpacity style={styles.signInLink} onPress={() => router.replace('/')} activeOpacity={0.7}>
          <Text style={[styles.signInText, { color: colors.textSecondary }]}>
            Already have an account?{' '}
            <Text style={[styles.signInBold, { color: colors.primary }]}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: any, shadows: any, isDark: boolean) {
  return StyleSheet.create({
    flex: { flex: 1 },
    orbContainer: { position: 'absolute', top: -80, left: 0, right: 0, height: 260, overflow: 'hidden', zIndex: 0 },
    orb: { position: 'absolute', borderRadius: 999, opacity: isDark ? 0.18 : 0.12 },
    orbPrimary: { width: 260, height: 260, top: 20, left: -60 },
    orbAccent: { width: 200, height: 200, top: -10, right: -40 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 80, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 28, zIndex: 1 },
    title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
    subtitle: { fontSize: 15, fontWeight: '400', opacity: 0.85 },
    card: { borderRadius: 20, borderWidth: 1, padding: 24, zIndex: 1, marginBottom: 20 },
    fieldGroup: { marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, height: 50 },
    icon: { fontSize: 18, marginRight: 10 },
    input: { flex: 1, fontSize: 15, fontWeight: '400' },
    toggleText: { fontSize: 13, fontWeight: '600', paddingLeft: 8 },
    errorText: { fontSize: 12, marginTop: 4, marginLeft: 2 },
    successBanner: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 14 },
    successText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
    submitBtn: { borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
    loadingRow: { flexDirection: 'row', alignItems: 'center' },
    signInLink: { alignItems: 'center', paddingVertical: 8 },
    signInText: { fontSize: 14, fontWeight: '400' },
    signInBold: { fontWeight: '700' },
  });
}
