import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../theme';
import { requestOtp, verifyOtpAndReset } from '../api/auth';

type Step = 1 | 2 | 3;

// ─── Platform-safe alert ─────────────────────────────────────────────────────
function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    // Lazy import to avoid web bundle issues
    const { Alert } = require('react-native');
    Alert.alert(title, message);
  }
}

// ─── Step Indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current, colors }: { current: Step; colors: any }) {
  return (
    <View style={si.row}>
      {([1, 2, 3] as Step[]).map((n) => (
        <React.Fragment key={n}>
          <View
            style={[
              si.dot,
              {
                backgroundColor:
                  n < current
                    ? colors.teal
                    : n === current
                    ? colors.primary
                    : colors.border,
                width: n === current ? 28 : 10,
              },
            ]}
          />
          {n < 3 && (
            <View
              style={[
                si.line,
                { backgroundColor: n < current ? colors.teal : colors.border },
              ]}
            />
          )}
        </React.Fragment>
      ))}
      <Text style={[si.label, { color: colors.textMuted }]}>
        Step {current} of 3
      </Text>
    </View>
  );
}

const si = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 4,
    flexWrap: 'wrap',
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  line: {
    width: 24,
    height: 2,
    borderRadius: 1,
  },
  label: {
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '500',
  },
});

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ForgotPasswordScreen() {
  const { colors, shadows, isDark } = useTheme();

  // Flow state
  const [step, setStep] = useState<Step>(1);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateCard = useCallback(() => {
    cardFade.setValue(0);
    cardSlide.setValue(24);
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [cardFade, cardSlide]);

  useEffect(() => {
    animateCard();
  }, [step]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!identifier.trim()) {
      showAlert('Missing Info', 'Please enter your username, email, or phone.');
      return;
    }
    setLoading(true);
    try {
      await requestOtp(identifier.trim());
      setStep(2);
    } catch (err: any) {
      showAlert('Error', err.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      await requestOtp(identifier.trim());
      showAlert('OTP Resent', 'A new OTP has been sent to your account.');
    } catch (err: any) {
      showAlert('Error', err.message || 'Could not resend OTP.');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp.trim() || otp.length < 6) {
      showAlert('Invalid OTP', 'Please enter the 6-digit OTP.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Mismatch', 'Passwords do not match. Please try again.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtpAndReset(identifier.trim(), otp.trim(), newPassword);
      setStep(3);
    } catch (err: any) {
      showAlert('Error', err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Dynamic styles (theme-aware) ────────────────────────────────────────────
  const s = makeStyles(colors, shadows);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Decorative Orbs */}
        <View style={[s.orb, s.orbTopRight, { backgroundColor: colors.primary }]} />
        <View style={[s.orb, s.orbBottomLeft, { backgroundColor: colors.teal }]} />
        <View style={[s.orb, s.orbMidRight, { backgroundColor: colors.primaryLight }]} />

        <Animated.View
          style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          {/* Back Button (steps 1 & 2) */}
          {step < 3 && (
            <TouchableOpacity
              style={[s.backBtn, { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card }]}
              onPress={() => {
                if (step === 1) router.back();
                else setStep(1);
              }}
              activeOpacity={0.75}
            >
              <Text style={[s.backBtnText, { color: colors.textSecondary }]}>← Back</Text>
            </TouchableOpacity>
          )}

          {/* Card */}
          <Animated.View
            style={[
              s.card,
              {
                backgroundColor: colors.bgCard,
                borderColor: colors.border,
                opacity: cardFade,
                transform: [{ translateY: cardSlide }],
                ...shadows.card,
              },
            ]}
          >
            {/* Step Indicator */}
            <StepIndicator current={step} colors={colors} />

            {/* ── STEP 1: Request OTP ── */}
            {step === 1 && (
              <>
                <View style={s.iconContainer}>
                  <View style={[s.iconBox, { backgroundColor: colors.bgCardAlt, borderColor: colors.primary, ...shadows.violet }]}>
                    <Text style={s.iconEmoji}>🔐</Text>
                  </View>
                </View>

                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Forgot Password</Text>
                <Text style={[s.cardSubtitle, { color: colors.textSecondary }]}>
                  Enter your username, email, or phone to receive an OTP
                </Text>

                <View style={s.inputWrapper}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>IDENTIFIER</Text>
                  <View style={[s.inputRow, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                    <Text style={s.inputIcon}>👤</Text>
                    <TextInput
                      style={[s.input, { color: colors.textPrimary }]}
                      placeholder="Username, email, or phone"
                      placeholderTextColor={colors.textMuted}
                      value={identifier}
                      onChangeText={setIdentifier}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSendOtp}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: colors.primary, ...shadows.violet }, loading && s.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.primaryBtnText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 2: Enter OTP & New Password ── */}
            {step === 2 && (
              <>
                <View style={s.iconContainer}>
                  <View style={[s.iconBox, { backgroundColor: colors.bgCardAlt, borderColor: colors.teal, ...shadows.teal }]}>
                    <Text style={s.iconEmoji}>📩</Text>
                  </View>
                </View>

                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Enter OTP</Text>
                <Text style={[s.cardSubtitle, { color: colors.textSecondary }]}>
                  We sent a 6-digit code to your account
                </Text>

                {/* OTP Input */}
                <View style={s.inputWrapper}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>OTP CODE</Text>
                  <View style={[s.inputRow, s.otpRow, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                    <Text style={s.inputIcon}>🔢</Text>
                    <TextInput
                      style={[s.input, s.otpInput, { color: colors.primary }]}
                      placeholder="••••••"
                      placeholderTextColor={colors.textMuted}
                      value={otp}
                      onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, ''))}
                      keyboardType="decimal-pad"
                      maxLength={6}
                      textAlign="center"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* New Password */}
                <View style={s.inputWrapper}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>NEW PASSWORD</Text>
                  <View style={[s.inputRow, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                    <Text style={s.inputIcon}>🔒</Text>
                    <TextInput
                      style={[s.input, { color: colors.textPrimary }]}
                      placeholder="Enter new password"
                      placeholderTextColor={colors.textMuted}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNew}
                      autoCapitalize="none"
                      returnKeyType="next"
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.eyeIcon}>{showNew ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Confirm Password */}
                <View style={s.inputWrapper}>
                  <Text style={[s.inputLabel, { color: colors.textSecondary }]}>CONFIRM PASSWORD</Text>
                  <View style={[s.inputRow, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                    <Text style={s.inputIcon}>🔏</Text>
                    <TextInput
                      style={[s.input, { color: colors.textPrimary }]}
                      placeholder="Confirm new password"
                      placeholderTextColor={colors.textMuted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                      returnKeyType="done"
                      onSubmitEditing={handleResetPassword}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Password match hint */}
                {confirmPassword.length > 0 && (
                  <Text
                    style={[
                      s.matchHint,
                      {
                        color:
                          newPassword === confirmPassword
                            ? colors.income
                            : colors.expense,
                      },
                    ]}
                  >
                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </Text>
                )}

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: colors.primary, ...shadows.violet }, loading && s.btnDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.primaryBtnText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                {/* Resend OTP */}
                <TouchableOpacity
                  style={s.resendBtn}
                  onPress={handleResendOtp}
                  disabled={resending}
                  activeOpacity={0.7}
                >
                  {resending ? (
                    <ActivityIndicator color={colors.teal} size="small" />
                  ) : (
                    <Text style={[s.resendText, { color: colors.teal }]}>
                      Didn't receive it? Resend OTP
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* ── STEP 3: Success ── */}
            {step === 3 && (
              <>
                <View style={s.iconContainer}>
                  <View style={[s.iconBox, s.iconBoxLg, { backgroundColor: colors.incomeLight, borderColor: colors.income }]}>
                    <Text style={[s.iconEmoji, s.iconEmojiLg]}>✅</Text>
                  </View>
                </View>

                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Password Reset!</Text>
                <Text style={[s.cardSubtitle, { color: colors.textSecondary }]}>
                  Your password has been changed successfully.{'\n'}
                  You can now sign in with your new password.
                </Text>

                <View style={[s.successBadge, { backgroundColor: colors.bgCardAlt, borderColor: colors.income }]}>
                  <Text style={[s.successBadgeText, { color: colors.income }]}>
                    🎉 Account secured successfully
                  </Text>
                </View>

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: colors.income, ...shadows.card }, { marginTop: 8 }]}
                  onPress={() => router.replace('/')}
                  activeOpacity={0.85}
                >
                  <Text style={s.primaryBtnText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* Footer hint */}
          {step < 3 && (
            <Text style={[s.footerHint, { color: colors.textMuted }]}>
              Remembered your password?{' '}
              <Text
                style={{ color: colors.primary, fontWeight: '600' }}
                onPress={() => router.replace('/')}
              >
                Sign in
              </Text>
            </Text>
          )}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles factory (theme-aware) ─────────────────────────────────────────────
function makeStyles(colors: any, shadows: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 40,
    },

    // Decorative orbs
    orb: {
      position: 'absolute',
      width: 260,
      height: 260,
      borderRadius: 130,
      opacity: 0.12,
    },
    orbTopRight: {
      top: -80,
      right: -80,
    },
    orbBottomLeft: {
      bottom: -80,
      left: -80,
    },
    orbMidRight: {
      top: '40%',
      right: -120,
      width: 200,
      height: 200,
      borderRadius: 100,
      opacity: 0.07,
    },

    // Layout
    content: {
      alignItems: 'center',
      width: '100%',
    },

    // Back button
    backBtn: {
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 20,
    },
    backBtnText: {
      fontSize: 14,
      fontWeight: '500',
    },

    // Card
    card: {
      width: '100%',
      borderRadius: 24,
      padding: 28,
      borderWidth: 1,
    },

    // Icon
    iconContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    iconBox: {
      width: 76,
      height: 76,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1.5,
    },
    iconBoxLg: {
      width: 90,
      height: 90,
      borderRadius: 24,
    },
    iconEmoji: {
      fontSize: 34,
    },
    iconEmojiLg: {
      fontSize: 42,
    },

    // Title / subtitle
    cardTitle: {
      fontSize: 24,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 6,
      letterSpacing: 0.3,
    },
    cardSubtitle: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 21,
      marginBottom: 24,
    },

    // Inputs
    inputWrapper: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 8,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 14,
      height: 52,
    },
    otpRow: {
      justifyContent: 'center',
    },
    inputIcon: {
      fontSize: 16,
      marginRight: 10,
    },
    input: {
      flex: 1,
      fontSize: 16,
      fontWeight: '400',
    },
    otpInput: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 10,
      textAlign: 'center',
    },
    eyeIcon: {
      fontSize: 18,
      paddingLeft: 8,
    },

    // Password match hint
    matchHint: {
      fontSize: 12,
      fontWeight: '500',
      marginTop: -8,
      marginBottom: 12,
      textAlign: 'right',
    },

    // Primary button
    primaryBtn: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    btnDisabled: {
      opacity: 0.6,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
      letterSpacing: 0.4,
    },

    // Resend OTP
    resendBtn: {
      alignItems: 'center',
      paddingVertical: 14,
      marginTop: 4,
      minHeight: 44,
      justifyContent: 'center',
    },
    resendText: {
      fontSize: 14,
      fontWeight: '500',
      textDecorationLine: 'underline',
    },

    // Step 3 success badge
    successBadge: {
      borderRadius: 10,
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      marginBottom: 24,
      marginTop: 8,
    },
    successBadgeText: {
      fontSize: 14,
      fontWeight: '600',
    },

    // Footer
    footerHint: {
      marginTop: 24,
      fontSize: 13,
      textAlign: 'center',
    },
  });
}
