import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../theme';
import { login } from '../api/auth';

export default function LoginScreen() {
  const { colors, shadows, isDark } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSignIn = async () => {
    if (!username.trim()) {
      showAlert('Validation Error', 'Please enter your username.');
      return;
    }
    if (!password) {
      showAlert('Validation Error', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong. Please try again.';
      showAlert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
        translucent={false}
      />

      {/* Decorative orbs */}
      <View style={[s.orbTopRight, { backgroundColor: colors.primary }]} />
      <View style={[s.orbTopLeft, { backgroundColor: colors.teal }]} />
      <View style={[s.orbBottomLeft, { backgroundColor: colors.primary }]} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={s.logoWrapper}>
            <Image 
              source={require('../../assets/images/logo.png')} 
              style={{ width: 80, height: 80, borderRadius: 24, marginBottom: 14 }} 
              resizeMode="cover" 
            />
            <Text style={[s.appName, { color: colors.primary }]}>Finance Tracker</Text>
            <Text style={[s.appTagline, { color: colors.textMuted }]}>Your money, your way</Text>
          </View>

          {/* Headings */}
          <Text style={[s.heading, { color: colors.textPrimary }]}>Welcome back 👋</Text>
          <Text style={[s.subheading, { color: colors.textSecondary }]}>Sign in to continue</Text>

          {/* Card */}
          <View style={[s.card, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}>
            {/* Username field */}
            <View style={s.inputGroup}>
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Username</Text>
              <View style={[
                s.inputRow,
                { backgroundColor: colors.bg, borderColor: focusedField === 'username' ? colors.primary : colors.border }
              ]}>
                <Text style={s.inputIcon}>👤</Text>
                <TextInput
                  style={[s.textInput, { color: colors.textPrimary }]}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.textMuted}
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password field */}
            <View style={[s.inputGroup, { marginBottom: 0 }]}>
              <Text style={[s.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              <View style={[
                s.inputRow,
                { backgroundColor: colors.bg, borderColor: focusedField === 'password' ? colors.primary : colors.border }
              ]}>
                <Text style={s.inputIcon}>🔒</Text>
                <TextInput
                  style={[s.textInput, { flex: 1, color: colors.textPrimary }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={s.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              onPress={() => router.push('/forgot-password')}
              style={s.forgotWrapper}
              disabled={loading}
            >
              <Text style={[s.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In button */}
            <TouchableOpacity
              style={[s.signInBtn, { backgroundColor: colors.primary, ...shadows.violet }, loading && s.signInBtnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading ? (
                <View style={s.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={[s.signInBtnText, { marginLeft: 10 }]}>
                    Signing in...
                  </Text>
                </View>
              ) : (
                <Text style={s.signInBtnText}>Sign In →</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={s.registerRow}>
            <Text style={[s.registerPrompt, { color: colors.textSecondary }]}>Don't have an account? </Text>
            <TouchableOpacity
              onPress={() => router.push('/register')}
              disabled={loading}
            >
              <Text style={[s.registerLink, { color: colors.primary }]}>Register</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  /* Decorative orbs */
  orbTopRight: {
    position: 'absolute', top: -90, right: -90,
    width: 260, height: 260, borderRadius: 130, opacity: 0.15,
  },
  orbTopLeft: {
    position: 'absolute', top: 60, left: -60,
    width: 160, height: 160, borderRadius: 80, opacity: 0.08,
  },
  orbBottomLeft: {
    position: 'absolute', bottom: -100, left: -100,
    width: 300, height: 300, borderRadius: 150, opacity: 0.07,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  /* Logo */
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoEmoji: { fontSize: 40 },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 13,
    fontWeight: '400',
  },

  /* Headings */
  heading: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  subheading: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },

  /* Card */
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    marginBottom: 28,
  },

  /* Input */
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    borderWidth: 1.5,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  textInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  eyeIcon: { fontSize: 18, paddingLeft: 8 },

  /* Forgot */
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginTop: 14,
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
  },

  /* Sign In button */
  signInBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnDisabled: { opacity: 0.65 },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },

  /* Register link */
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerPrompt: { fontSize: 14 },
  registerLink: { fontSize: 14, fontWeight: '700' },
});
