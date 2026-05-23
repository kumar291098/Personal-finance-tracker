import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, TextInput, Alert, Platform, Animated, Linking, Image,
} from 'react-native';
import { getSubscriptionPlan, submitManualUpiRequest, getAccessPolicy, SubscriptionPlan } from '../../api/subscription';
import {
  AccessLevel,
  AccessPolicy,
  AdminUser,
  SubscriptionRequest,
  SubscriptionSettings,
  getAccessPolicies,
  getAdminUsers,
  getSubscriptionRequests,
  getSubscriptionSettings,
  reviewSubscriptionRequest,
  updateAccessPolicy,
  updateSubscriptionSettings,
  updateUserAccess,
} from '../../api/admin';
import { Fonts, Radii, useTheme } from '../../theme';

const ACCESS_FEATURES: Record<string, { label: string; icon: string; free: boolean; subscriber: boolean }[]> = {
  features: [
    { label: 'Track Transactions', icon: '💳', free: true, subscriber: true },
    { label: 'Categories Management', icon: '🏷️', free: true, subscriber: true },
    { label: 'Basic Analytics', icon: '📊', free: true, subscriber: true },
    { label: 'Advanced Charts', icon: '📈', free: false, subscriber: true },
    { label: 'AI Finance Assistant', icon: '🤖', free: false, subscriber: true },
    { label: 'Unlimited History', icon: '🗂️', free: false, subscriber: true },
    { label: 'Data Export (CSV)', icon: '📤', free: false, subscriber: true },
    { label: 'Priority Support', icon: '⚡', free: false, subscriber: true },
  ],
};

function PlanBadge({ level }: { level: string }) {
  const { colors } = useTheme();
  const isAdmin = level === 'ADMIN';
  const isSub = level === 'SUBSCRIBER';
  const color = isAdmin ? colors.teal : isSub ? colors.primary : colors.textMuted;
  const label = isAdmin ? '👑 Admin' : isSub ? '⭐ Subscriber' : '🔓 Free';
  return (
    <View style={[sb.badge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <Text style={[sb.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function SubscriptionScreen() {
  const { colors, shadows, isDark } = useTheme();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [accessLevel, setAccessLevel] = useState('FREE');
  const [allowedPages, setAllowedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [utrInput, setUtrInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [subscriptionSettings, setSubscriptionSettings] = useState<SubscriptionSettings | null>(null);
  const [subscriptionRequests, setSubscriptionRequests] = useState<SubscriptionRequest[]>([]);
  const [accessPages, setAccessPages] = useState<string[]>([]);
  const [accessPolicies, setAccessPolicies] = useState<AccessPolicy[]>([]);
  const [feeRupees, setFeeRupees] = useState('99');
  const [upiId, setUpiId] = useState('');
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [planData, policyData] = await Promise.all([
          getSubscriptionPlan(),
          getAccessPolicy(),
        ]);
        setPlan(planData);
        setAccessLevel(policyData.accessLevel);
        setAllowedPages(policyData.allowedPages);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Pulse animation for the CTA button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadAdminData = async () => {
    setAdminLoading(true);
    try {
      const [usersData, settingsData, requestsData, policiesData] = await Promise.all([
        getAdminUsers(),
        getSubscriptionSettings(),
        getSubscriptionRequests(),
        getAccessPolicies(),
      ]);
      setAdminUsers(usersData);
      setSubscriptionSettings(settingsData);
      setSubscriptionRequests(requestsData);
      setAccessPages(policiesData.pages);
      setAccessPolicies(policiesData.policies);
      setFeeRupees(String(Math.round(settingsData.amountPaise / 100)));
      setUpiId(settingsData.upiId || '');
    } catch (e: any) {
      Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Admin Error', e.message);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (accessLevel === 'ADMIN') {
      loadAdminData();
    }
  }, [accessLevel]);

  const handleSaveSubscriptionSettings = async () => {
    const amount = Number(feeRupees);
    if (!Number.isFinite(amount) || amount <= 0) {
      const msg = 'Enter a valid subscription fee in rupees.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }

    setAdminSaving(true);
    try {
      const updated = await updateSubscriptionSettings({
        amountPaise: Math.round(amount * 100),
        upiId: upiId.trim(),
        upiQrImageUrl: '',
      });
      setSubscriptionSettings(updated);
      const planData = await getSubscriptionPlan();
      setPlan(planData);
      const msg = 'Subscription settings saved.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Saved', msg);
    } catch (e: any) {
      Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Error', e.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const handleUpdateUserAccess = async (userId: number, nextLevel: AccessLevel) => {
    try {
      const updated = await updateUserAccess(userId, nextLevel);
      setAdminUsers(current => current.map(user => user.id === updated.id ? updated : user));
    } catch (e: any) {
      Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Error', e.message);
    }
  };

  const handleTogglePolicyPage = async (policy: AccessPolicy, page: string) => {
    if (policy.accessLevel === 'ADMIN') return;

    const allowedPages = policy.allowedPages.includes(page)
      ? policy.allowedPages.filter(value => value !== page)
      : [...policy.allowedPages, page];

    try {
      const updated = await updateAccessPolicy(policy.accessLevel, allowedPages);
      setAccessPolicies(current => current.map(item => item.accessLevel === updated.accessLevel ? updated : item));
    } catch (e: any) {
      Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Error', e.message);
    }
  };

  const handleReviewRequest = async (requestId: number, action: 'approve' | 'reject') => {
    try {
      await reviewSubscriptionRequest(requestId, action);
      await loadAdminData();
    } catch (e: any) {
      Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Error', e.message);
    }
  };

  const handleSubmitUtr = async () => {
    if (!utrInput || utrInput.trim().length < 6) {
      const msg = 'Enter a valid UTR / transaction ID (min 6 characters)';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      return;
    }
    setSubmitting(true);
    setSuccessMsg('');
    try {
      const result = await submitManualUpiRequest(utrInput.trim());
      setSuccessMsg(result.message || 'Subscription activated!');
      setAccessLevel(result.accessLevel || 'SUBSCRIBER');
      setUtrInput('');
      // Reload plan info
      const [planData, policyData] = await Promise.all([getSubscriptionPlan(), getAccessPolicy()]);
      setPlan(planData);
      setAllowedPages(policyData.allowedPages);
    } catch (e: any) {
      Platform.OS === 'web' ? window.alert(e.message) : Alert.alert('Payment Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const alreadySubscribed = accessLevel === 'SUBSCRIBER' || accessLevel === 'ADMIN';
  const amountRupees = plan ? (plan.amountPaise / 100).toFixed(0) : '99';
  const userCounts = {
    ADMIN: adminUsers.filter(user => user.accessLevel === 'ADMIN').length,
    SUBSCRIBER: adminUsers.filter(user => user.accessLevel === 'SUBSCRIBER').length,
    FREE: adminUsers.filter(user => user.accessLevel === 'FREE').length,
  };

  if (loading) {
    return (
      <View style={[sb.root, { backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[sb.root, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={[sb.orbTR, { backgroundColor: colors.primary }]} />
      <View style={[sb.orbBL, { backgroundColor: colors.teal }]} />

      <ScrollView contentContainerStyle={sb.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Text style={[sb.pageTitle, { color: colors.textPrimary }]}>Access & Subscription</Text>

        {/* Current Plan Card */}
        <View style={[sb.currentPlanCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={sb.planCardTop}>
            <View>
              <Text style={[sb.planCardLabel, { color: colors.textSecondary }]}>Current Plan</Text>
              <PlanBadge level={accessLevel} />
            </View>
            <Text style={sb.planEmoji}>
              {accessLevel === 'ADMIN' ? '👑' : accessLevel === 'SUBSCRIBER' ? '⭐' : '🔓'}
            </Text>
          </View>
          {alreadySubscribed && (
            <View style={sb.activeRow}>
              <View style={[sb.activeDot, { backgroundColor: colors.income }]} />
              <Text style={[sb.activeText, { color: colors.income }]}>Full access enabled — enjoy all features!</Text>
            </View>
          )}
        </View>

        {accessLevel === 'ADMIN' && (
          <View style={sb.section}>
            <View style={sb.adminHeader}>
              <View>
                <Text style={[sb.sectionTitle, { color: colors.textPrimary, marginBottom: 4 }]}>Admin Control</Text>
                <Text style={[sb.adminSubtitle, { color: colors.textSecondary }]}>
                  Manage subscriber settings, page access, and user roles.
                </Text>
              </View>
              <TouchableOpacity
                style={[sb.refreshBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={loadAdminData}
                disabled={adminLoading}
              >
                <Text style={[sb.refreshBtnText, { color: colors.primary }]}>
                  {adminLoading ? '...' : 'Refresh'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={sb.adminStatsRow}>
              {(['ADMIN', 'SUBSCRIBER', 'FREE'] as const).map(level => (
                <View key={level} style={[sb.adminStat, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <Text style={[sb.adminStatNumber, { color: colors.primary }]}>{userCounts[level]}</Text>
                  <Text style={[sb.adminStatLabel, { color: colors.textSecondary }]}>
                    {level === 'ADMIN' ? 'Admins' : level === 'SUBSCRIBER' ? 'Subscribers' : 'Free users'}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[sb.adminCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[sb.adminCardTitle, { color: colors.textPrimary }]}>Subscription Settings</Text>
              <Text style={[sb.adminCardHint, { color: colors.textSecondary }]}>
                Set the fee and QR/UPI details shown to users.
              </Text>

              <Text style={[sb.adminInputLabel, { color: colors.textSecondary }]}>Fee in rupees</Text>
              <TextInput
                style={[sb.adminInput, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                value={feeRupees}
                onChangeText={setFeeRupees}
                keyboardType="numeric"
                placeholder="99"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[sb.adminInputLabel, { color: colors.textSecondary }]}>UPI ID</Text>
              <TextInput
                style={[sb.adminInput, { backgroundColor: colors.bgInput, borderColor: colors.border, color: colors.textPrimary }]}
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
                placeholder="name@upi"
                placeholderTextColor={colors.textMuted}
              />



              {subscriptionSettings?.updatedAt ? (
                <Text style={[sb.adminUpdatedAt, { color: colors.textMuted }]}>
                  Last updated {new Date(subscriptionSettings.updatedAt).toLocaleString()}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[sb.saveAdminBtn, { backgroundColor: colors.primary }, adminSaving && { opacity: 0.6 }]}
                onPress={handleSaveSubscriptionSettings}
                disabled={adminSaving}
              >
                <Text style={sb.saveAdminBtnText}>
                  {adminSaving ? 'Saving...' : 'Save Subscription Settings'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[sb.adminCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[sb.adminCardTitle, { color: colors.textPrimary }]}>Page Access</Text>
              <Text style={[sb.adminCardHint, { color: colors.textSecondary }]}>
                Choose pages visible to each account level.
              </Text>

              {accessPolicies
                .filter(policy => policy.accessLevel !== 'ADMIN')
                .map(policy => (
                  <View key={policy.accessLevel} style={[sb.policyBlock, { borderColor: colors.border }]}>
                    <View style={sb.policyTopRow}>
                      <Text style={[sb.policyTitle, { color: colors.textPrimary }]}>{policy.accessLevel}</Text>
                      <Text style={[sb.policyCount, { color: colors.textMuted }]}>
                        {policy.allowedPages.length} pages enabled
                      </Text>
                    </View>
                    <View style={sb.policyPageGrid}>
                      {accessPages.map(page => {
                        const enabled = policy.allowedPages.includes(page);
                        return (
                          <TouchableOpacity
                            key={`${policy.accessLevel}-${page}`}
                            style={[
                              sb.policyPageChip,
                              {
                                backgroundColor: enabled ? `${colors.primary}22` : colors.bgInput,
                                borderColor: enabled ? colors.primary : colors.border,
                              },
                            ]}
                            onPress={() => handleTogglePolicyPage(policy, page)}
                          >
                            <Text style={[sb.policyPageText, { color: enabled ? colors.primary : colors.textSecondary }]}>
                              {enabled ? '✓ ' : ''}{page}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
            </View>

            <View style={[sb.adminCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={sb.policyTopRow}>
                <Text style={[sb.adminCardTitle, { color: colors.textPrimary }]}>UPI Subscription Requests</Text>
                <Text style={[sb.policyCount, { color: colors.textMuted }]}>{subscriptionRequests.length} pending</Text>
              </View>
              {subscriptionRequests.length === 0 ? (
                <Text style={[sb.adminEmptyText, { color: colors.textMuted }]}>No pending UPI subscription requests.</Text>
              ) : (
                subscriptionRequests.map(request => (
                  <View key={request.id} style={[sb.requestCard, { borderColor: colors.border, backgroundColor: colors.bgInput }]}>
                    <Text style={[sb.requestUser, { color: colors.textPrimary }]}>{request.username}</Text>
                    <Text style={[sb.requestMeta, { color: colors.textSecondary }]}>Ref: {request.reference}</Text>
                    <Text style={[sb.requestMeta, { color: colors.textSecondary }]}>
                      Amount: ₹{Math.round(request.amountPaise / 100)}
                    </Text>
                    <View style={sb.requestActions}>
                      <TouchableOpacity
                        style={[sb.reviewBtn, { backgroundColor: `${colors.expense}18`, borderColor: `${colors.expense}55` }]}
                        onPress={() => handleReviewRequest(request.id, 'reject')}
                      >
                        <Text style={[sb.reviewBtnText, { color: colors.expense }]}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[sb.reviewBtn, { backgroundColor: `${colors.income}18`, borderColor: `${colors.income}55` }]}
                        onPress={() => handleReviewRequest(request.id, 'approve')}
                      >
                        <Text style={[sb.reviewBtnText, { color: colors.income }]}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={[sb.adminCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[sb.adminCardTitle, { color: colors.textPrimary }]}>Accounts</Text>
              <Text style={[sb.adminCardHint, { color: colors.textSecondary }]}>{adminUsers.length} total</Text>
              {adminUsers.map(user => (
                <View key={user.id} style={[sb.userAccessRow, { borderColor: colors.border }]}>
                  <View style={sb.userInfo}>
                    <Text style={[sb.userName, { color: colors.textPrimary }]}>{user.username}</Text>
                    <Text style={[sb.userEmail, { color: colors.textMuted }]}>{user.email || user.phone || 'No contact'}</Text>
                  </View>
                  <View style={sb.accessButtons}>
                    {(['ADMIN', 'SUBSCRIBER', 'FREE'] as const).map(level => {
                      const selected = user.accessLevel === level;
                      return (
                        <TouchableOpacity
                          key={`${user.id}-${level}`}
                          style={[
                            sb.accessLevelBtn,
                            {
                              backgroundColor: selected ? colors.primary : colors.bgInput,
                              borderColor: selected ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => handleUpdateUserAccess(user.id, level)}
                        >
                          <Text style={[sb.accessLevelText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>
                            {level === 'SUBSCRIBER' ? 'SUB' : level}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Access Level Pages */}
        <View style={sb.section}>
          <Text style={[sb.sectionTitle, { color: colors.textPrimary }]}>Your Accessible Pages</Text>
          <View style={sb.pagesGrid}>
            {allowedPages.map(page => (
              <View
                key={page}
                style={[
                  sb.pageChip,
                  { backgroundColor: `${colors.primary}22`, borderColor: `${colors.primary}44` },
                ]}
              >
                <Text style={[sb.pageChipText, { color: colors.primaryLight }]}>✓ {page}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Feature Comparison */}
        <View style={sb.section}>
          <Text style={[sb.sectionTitle, { color: colors.textPrimary }]}>Plan Comparison</Text>
          <View style={[sb.compTable, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            {/* Header */}
            <View style={[sb.compRow, sb.compHeader, { borderBottomColor: colors.border }]}>
              <Text style={[sb.compCell, sb.compFeatureCell, sb.compHeaderText, { color: colors.textPrimary }]}>Feature</Text>
              <Text style={[sb.compCell, sb.compHeaderText, { color: colors.textSecondary }]}>Free</Text>
              <Text style={[sb.compCell, sb.compHeaderText, { color: colors.primary }]}>Subscriber</Text>
            </View>
            {ACCESS_FEATURES.features.map((f, i) => (
              <View
                key={f.label}
                style={[
                  sb.compRow,
                  i % 2 === 1 && { backgroundColor: colors.bgCardAlt },
                ]}
              >
                <View style={[sb.compCell, sb.compFeatureCell]}>
                  <Text style={sb.featureIcon}>{f.icon}</Text>
                  <Text style={[sb.featureLabel, { color: colors.textSecondary }]}>{f.label}</Text>
                </View>
                <Text style={sb.compCell}>{f.free ? '✅' : '❌'}</Text>
                <Text style={sb.compCell}>{f.subscriber ? '✅' : '❌'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Subscribe Section */}
        {!alreadySubscribed && (
          <View style={sb.section}>
            <Text style={[sb.sectionTitle, { color: colors.textPrimary }]}>Upgrade to Subscriber</Text>

            {/* Price Card */}
            <Animated.View
              style={[
                sb.priceCard,
                { backgroundColor: colors.primary, transform: [{ scale: pulseAnim }] },
                shadows.violet,
              ]}
            >
              <View style={sb.priceTop}>
                <Text style={sb.priceAmount}>₹{amountRupees}</Text>
                <Text style={sb.pricePer}>/month</Text>
              </View>
              <Text style={sb.priceTagline}>Unlock all features instantly</Text>
            </Animated.View>

            {/* UPI Payment Section */}
            {plan?.manualUpiEnabled && (
              <View style={[sb.upiCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[sb.upiTitle, { color: colors.textPrimary }]}>💳 Pay via UPI</Text>
                <Text style={[sb.upiSubtitle, { color: colors.textSecondary }]}>
                  Send ₹{amountRupees} to the UPI below, then enter your UTR to activate.
                </Text>

                {plan.upiId !== '' && (
                  <TouchableOpacity
                    style={[sb.upiIdBox, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                    onPress={() => { if (Platform.OS === 'web') { navigator.clipboard?.writeText(plan.upiId); window.alert('UPI ID copied!'); } }}
                  >
                    <Text style={[sb.upiIdLabel, { color: colors.textMuted }]}>UPI ID</Text>
                    <Text style={[sb.upiIdValue, { color: colors.teal }]}>{plan.upiId}</Text>
                    <Text style={[sb.upiCopy, { color: colors.primary }]}>📋 Copy</Text>
                  </TouchableOpacity>
                )}

                <View style={sb.utrSection}>
                  <Text style={[sb.utrLabel, { color: colors.textSecondary }]}>Enter UTR / Transaction ID after payment</Text>
                  <View style={sb.utrRow}>
                    <TextInput
                      style={[
                        sb.utrInput,
                        {
                          backgroundColor: colors.bgInput,
                          color: colors.textPrimary,
                          borderColor: colors.border,
                        },
                      ]}
                      placeholder="e.g. 426789012345"
                      placeholderTextColor={colors.textMuted}
                      value={utrInput}
                      onChangeText={setUtrInput}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[
                        sb.utrBtn,
                        { backgroundColor: colors.primary },
                        shadows.violet,
                        submitting && { opacity: 0.6 },
                      ]}
                      onPress={handleSubmitUtr}
                      disabled={submitting}
                    >
                      <Text style={sb.utrBtnText}>{submitting ? '...' : 'Submit'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Razorpay Gateway (if configured) */}
            {plan?.paymentConfigured && (
              <TouchableOpacity style={[sb.razorpayBtn, { backgroundColor: colors.teal }, shadows.teal]}>
                <Text style={sb.razorpayBtnText}>⚡ Pay with Razorpay</Text>
              </TouchableOpacity>
            )}

            {/* Neither configured */}
            {!plan?.manualUpiEnabled && !plan?.paymentConfigured && (
              <View style={[sb.notConfiguredCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={sb.notConfiguredEmoji}>⚙️</Text>
                <Text style={[sb.notConfiguredText, { color: colors.textSecondary }]}>Payment gateway not configured by admin yet.</Text>
                <Text style={[sb.notConfiguredSub, { color: colors.textMuted }]}>Contact support to upgrade your account.</Text>
              </View>
            )}
          </View>
        )}

        {/* Already subscribed message */}
        {alreadySubscribed && (
          <View style={[sb.successCard, { backgroundColor: `${colors.income}11`, borderColor: `${colors.income}44` }]}>
            <Text style={sb.successEmoji}>🎉</Text>
            <Text style={[sb.successTitle, { color: colors.income }]}>You have full access!</Text>
            <Text style={[sb.successSubtitle, { color: colors.textSecondary }]}>
              {accessLevel === 'ADMIN' ? 'Admin accounts have unrestricted access to everything.' : 'Your subscriber plan is active. Enjoy all premium features!'}
            </Text>
          </View>
        )}

        {/* Success message after UTR submission */}
        {successMsg !== '' && (
          <View style={[sb.successCard, { backgroundColor: `${colors.income}11`, borderColor: `${colors.income}44`, marginTop: 0 }]}>
            <Text style={sb.successEmoji}>✅</Text>
            <Text style={[sb.successTitle, { color: colors.income }]}>Subscription Activated!</Text>
            <Text style={[sb.successSubtitle, { color: colors.textSecondary }]}>{successMsg}</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const sb = StyleSheet.create({
  root: { flex: 1 },
  orbTR: { position: 'absolute', width: 220, height: 220, borderRadius: 110, top: -60, right: -60, opacity: 0.1 },
  orbBL: { position: 'absolute', width: 180, height: 180, borderRadius: 90, bottom: 80, left: -50, opacity: 0.08 },
  scroll: { padding: 20, paddingTop: 52 },
  pageTitle: { fontSize: 26, fontWeight: Fonts.bold, marginBottom: 20 },

  currentPlanCard: {
    borderRadius: Radii.lg,
    padding: 20, marginBottom: 20, borderWidth: 1,
  },
  planCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planCardLabel: { fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  planEmoji: { fontSize: 40 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radii.full, borderWidth: 1 },
  badgeText: { fontWeight: Fonts.bold, fontSize: 14 },
  activeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  activeText: { fontSize: 13 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: Fonts.bold, marginBottom: 12 },
  adminHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  adminSubtitle: { fontSize: 13, lineHeight: 18, maxWidth: 230 },
  refreshBtn: {
    borderRadius: Radii.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  refreshBtnText: { fontSize: 12, fontWeight: Fonts.bold },
  adminStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  adminStat: {
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  adminStatNumber: { fontSize: 22, fontWeight: Fonts.bold },
  adminStatLabel: { fontSize: 11, marginTop: 3, textAlign: 'center' },
  adminCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  adminCardTitle: { fontSize: 17, fontWeight: Fonts.bold, marginBottom: 4 },
  adminCardHint: { fontSize: 12, lineHeight: 17, marginBottom: 14 },
  adminInputLabel: { fontSize: 12, fontWeight: Fonts.semiBold, marginBottom: 7 },
  adminInput: {
    borderRadius: Radii.md,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 14,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  adminQrInput: {
    minHeight: 86,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  qrPreviewBox: {
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
  },
  qrPreview: { height: 150, width: 150 },
  qrPreviewLabel: { fontSize: 12, marginTop: 8 },
  adminUpdatedAt: { fontSize: 11, marginBottom: 12 },
  saveAdminBtn: {
    alignItems: 'center',
    borderRadius: Radii.md,
    justifyContent: 'center',
    minHeight: 48,
  },
  saveAdminBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: Fonts.bold },
  policyBlock: {
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  policyTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  policyTitle: { fontSize: 14, fontWeight: Fonts.bold },
  policyCount: { fontSize: 12 },
  policyPageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  policyPageChip: {
    borderRadius: Radii.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  policyPageText: { fontSize: 12, fontWeight: Fonts.semiBold },
  adminEmptyText: { fontSize: 13, marginTop: 10 },
  requestCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  requestUser: { fontSize: 14, fontWeight: Fonts.bold, marginBottom: 4 },
  requestMeta: { fontSize: 12, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  reviewBtn: {
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 10,
  },
  reviewBtnText: { fontSize: 13, fontWeight: Fonts.bold },
  userAccessRow: {
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: 12,
    marginTop: 10,
    padding: 12,
  },
  userInfo: { gap: 3 },
  userName: { fontSize: 14, fontWeight: Fonts.bold },
  userEmail: { fontSize: 12 },
  accessButtons: { flexDirection: 'row', gap: 7 },
  accessLevelBtn: {
    alignItems: 'center',
    borderRadius: Radii.full,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  accessLevelText: { fontSize: 10, fontWeight: Fonts.bold },

  pagesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pageChip: {
    borderRadius: Radii.full,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1,
  },
  pageChipText: { fontSize: 13, fontWeight: Fonts.medium },

  compTable: { borderRadius: Radii.lg, overflow: 'hidden', borderWidth: 1 },
  compRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14 },
  compHeader: { borderBottomWidth: 1, paddingBottom: 12 },
  compHeaderText: { fontWeight: Fonts.bold, fontSize: 13 },
  compCell: { flex: 1, textAlign: 'center', fontSize: 15 },
  compFeatureCell: { flex: 2.5, flexDirection: 'row', alignItems: 'center', gap: 8, textAlign: 'left' },
  featureIcon: { fontSize: 16 },
  featureLabel: { fontSize: 13 },

  priceCard: {
    borderRadius: Radii.xl,
    padding: 28, alignItems: 'center', marginBottom: 20,
  },
  priceTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 8 },
  priceAmount: { fontSize: 52, fontWeight: Fonts.extraBold, color: '#fff', letterSpacing: -2 },
  pricePer: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 10 },
  priceTagline: { fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: Fonts.medium },

  upiCard: {
    borderRadius: Radii.lg,
    padding: 20, borderWidth: 1, marginBottom: 14,
  },
  upiTitle: { fontSize: 17, fontWeight: Fonts.bold, marginBottom: 6 },
  upiSubtitle: { fontSize: 13, marginBottom: 16, lineHeight: 20 },
  upiIdBox: {
    borderRadius: Radii.md, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
    borderWidth: 1,
  },
  upiIdLabel: { fontSize: 11, marginRight: 8 },
  upiIdValue: { flex: 1, fontSize: 15, fontWeight: Fonts.bold },
  upiCopy: { fontSize: 13 },
  utrSection: {},
  utrLabel: { fontSize: 13, marginBottom: 8 },
  utrRow: { flexDirection: 'row', gap: 10 },
  utrInput: {
    flex: 1, borderRadius: Radii.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    borderWidth: 1,
  },
  utrBtn: {
    borderRadius: Radii.md,
    paddingHorizontal: 18, justifyContent: 'center',
  },
  utrBtnText: { color: '#fff', fontWeight: Fonts.bold, fontSize: 14 },

  razorpayBtn: {
    borderRadius: Radii.md,
    paddingVertical: 16, alignItems: 'center', marginBottom: 14,
  },
  razorpayBtnText: { color: '#fff', fontWeight: Fonts.bold, fontSize: 16 },

  notConfiguredCard: {
    borderRadius: Radii.lg,
    padding: 24, alignItems: 'center', borderWidth: 1,
  },
  notConfiguredEmoji: { fontSize: 40, marginBottom: 12 },
  notConfiguredText: { fontSize: 16, fontWeight: Fonts.semiBold, textAlign: 'center' },
  notConfiguredSub: { fontSize: 13, marginTop: 8, textAlign: 'center' },

  successCard: {
    borderRadius: Radii.lg,
    padding: 24, alignItems: 'center', borderWidth: 1,
    marginBottom: 16,
  },
  successEmoji: { fontSize: 44, marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: Fonts.bold },
  successSubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
