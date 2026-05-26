import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AccessLevel,
  AccessPolicy,
  AdminUser,
  SubscriptionRequest,
  getAccessPolicies,
  getAdminUsers,
  getSubscriptionRequests,
  reviewSubscriptionRequest,
  updateAccessPolicy,
  updateUserAccess,
} from '../../api/admin';
import { getAccessPolicy } from '../../api/subscription';
import { Fonts, Radii, useTheme } from '../../theme';

const LEVELS: AccessLevel[] = ['ADMIN', 'SUBSCRIBER', 'FREE'];

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

export default function AccessScreen() {
  const { colors, shadows } = useTheme();
  const [currentLevel, setCurrentLevel] = useState<AccessLevel | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [policies, setPolicies] = useState<AccessPolicy[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [requests, setRequests] = useState<SubscriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }

    try {
      const [me, usersData, policiesData, requestsData] = await Promise.all([
        getAccessPolicy(),
        getAdminUsers(),
        getAccessPolicies(),
        getSubscriptionRequests(),
      ]);

      setCurrentLevel(me.accessLevel as AccessLevel);
      setUsers(usersData);
      setPolicies(policiesData.policies);
      setPages(policiesData.pages);
      setRequests(requestsData);
    } catch (error: any) {
      showAlert('Access Error', error?.message || 'Could not load admin access data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(
    () => ({
      admins: users.filter(user => user.accessLevel === 'ADMIN').length,
      subscribers: users.filter(user => user.accessLevel === 'SUBSCRIBER').length,
      free: users.filter(user => user.accessLevel === 'FREE').length,
    }),
    [users]
  );

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        const levelRank = LEVELS.indexOf(a.accessLevel) - LEVELS.indexOf(b.accessLevel);
        if (levelRank !== 0) {
          return levelRank;
        }
        return a.username.localeCompare(b.username);
      }),
    [users]
  );

  const handleChangeAccess = async (user: AdminUser, nextLevel: AccessLevel) => {
    const key = `user-${user.id}`;
    setBusyKey(key);
    try {
      const updated = await updateUserAccess(user.id, nextLevel);
      setUsers(current => current.map(item => (item.id === updated.id ? updated : item)));
    } catch (error: any) {
      showAlert('Access Update Failed', error?.message || 'Could not update this user.');
    } finally {
      setBusyKey('');
    }
  };

  const handleTogglePage = async (policy: AccessPolicy, page: string) => {
    const key = `policy-${policy.accessLevel}-${page}`;
    setBusyKey(key);
    try {
      const allowedPages = policy.allowedPages.includes(page)
        ? policy.allowedPages.filter(value => value !== page)
        : [...policy.allowedPages, page];

      const updated = await updateAccessPolicy(
        policy.accessLevel as 'SUBSCRIBER' | 'FREE',
        allowedPages
      );
      setPolicies(current =>
        current.map(item => (item.accessLevel === updated.accessLevel ? updated : item))
      );
    } catch (error: any) {
      showAlert('Policy Update Failed', error?.message || 'Could not update page access.');
    } finally {
      setBusyKey('');
    }
  };

  const handleReviewRequest = async (
    requestId: number,
    action: 'approve' | 'reject'
  ) => {
    const key = `request-${requestId}`;
    setBusyKey(key);
    try {
      await reviewSubscriptionRequest(requestId, action);
      await loadData(true);
    } catch (error: any) {
      showAlert('Review Failed', error?.message || 'Could not review this request.');
    } finally {
      setBusyKey('');
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (currentLevel !== 'ADMIN') {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View
            style={[
              styles.lockedCard,
              { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card },
            ]}
          >
            <Text style={styles.lockedEmoji}>🔐</Text>
            <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>Admin access required</Text>
            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              This screen is available only for admin accounts.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData(true);
            }}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Access Control</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Manage roles, page permissions, and pending subscription requests.
        </Text>

        <View style={styles.statsRow}>
          {[
            { label: 'Admins', value: stats.admins, color: colors.teal },
            { label: 'Subscribers', value: stats.subscribers, color: colors.primary },
            { label: 'Free Users', value: stats.free, color: colors.textSecondary },
          ].map(card => (
            <View
              key={card.label}
              style={[
                styles.statCard,
                { backgroundColor: colors.bgCard, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pending UPI Requests</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Review manual payment submissions waiting for approval.
          </Text>

          {requests.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No pending subscription requests.
            </Text>
          ) : (
            requests.map(request => {
              const requestBusy = busyKey === `request-${request.id}`;
              return (
                <View
                  key={request.id}
                  style={[styles.requestCard, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                >
                  <Text style={[styles.requestUser, { color: colors.textPrimary }]}>{request.username}</Text>
                  <Text style={[styles.requestMeta, { color: colors.textSecondary }]}>
                    Ref: {request.reference || 'N/A'}
                  </Text>
                  <Text style={[styles.requestMeta, { color: colors.textSecondary }]}>
                    Amount: ₹{Math.round(request.amountPaise / 100)}
                  </Text>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[
                        styles.reviewBtn,
                        { backgroundColor: `${colors.expense}18`, borderColor: `${colors.expense}44` },
                      ]}
                      disabled={requestBusy}
                      onPress={() => handleReviewRequest(request.id, 'reject')}
                    >
                      <Text style={[styles.reviewBtnText, { color: colors.expense }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.reviewBtn,
                        { backgroundColor: `${colors.income}18`, borderColor: `${colors.income}44` },
                      ]}
                      disabled={requestBusy}
                      onPress={() => handleReviewRequest(request.id, 'approve')}
                    >
                      <Text style={[styles.reviewBtnText, { color: colors.income }]}>
                        {requestBusy ? '...' : 'Approve'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Page Access Policies</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Choose which screens appear for each non-admin access level.
          </Text>

          {policies
            .filter(policy => policy.accessLevel !== 'ADMIN')
            .map(policy => (
              <View key={policy.accessLevel} style={[styles.policyBlock, { borderColor: colors.border }]}>
                <View style={styles.policyHeader}>
                  <Text style={[styles.policyTitle, { color: colors.textPrimary }]}>
                    {policy.accessLevel}
                  </Text>
                  <Text style={[styles.policyCount, { color: colors.textMuted }]}>
                    {policy.allowedPages.length} enabled
                  </Text>
                </View>
                <View style={styles.policyGrid}>
                  {pages.map(page => {
                    const enabled = policy.allowedPages.includes(page);
                    const pageBusy = busyKey === `policy-${policy.accessLevel}-${page}`;
                    return (
                      <TouchableOpacity
                        key={`${policy.accessLevel}-${page}`}
                        style={[
                          styles.policyChip,
                          {
                            backgroundColor: enabled ? `${colors.primary}18` : colors.bgInput,
                            borderColor: enabled ? colors.primary : colors.border,
                            opacity: pageBusy ? 0.6 : 1,
                          },
                        ]}
                        disabled={pageBusy}
                        onPress={() => handleTogglePage(policy, page)}
                      >
                        <Text
                          style={[
                            styles.policyChipText,
                            { color: enabled ? colors.primary : colors.textSecondary },
                          ]}
                        >
                          {enabled ? '✓ ' : ''}
                          {page}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>User Roles</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Promote, demote, or restore account access levels.
          </Text>

          {sortedUsers.map(user => {
            const userBusy = busyKey === `user-${user.id}`;
            return (
              <View key={user.id} style={[styles.userCard, { borderColor: colors.border }]}>
                <View style={styles.userHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: colors.textPrimary }]}>{user.username}</Text>
                    <Text style={[styles.userMeta, { color: colors.textMuted }]}>
                      {user.email || user.phone || 'No contact info'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.levelBadge,
                      {
                        backgroundColor:
                          user.accessLevel === 'ADMIN'
                            ? `${colors.teal}18`
                            : user.accessLevel === 'SUBSCRIBER'
                            ? `${colors.primary}18`
                            : colors.bgInput,
                        borderColor:
                          user.accessLevel === 'ADMIN'
                            ? `${colors.teal}44`
                            : user.accessLevel === 'SUBSCRIBER'
                            ? `${colors.primary}44`
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.levelBadgeText,
                        {
                          color:
                            user.accessLevel === 'ADMIN'
                              ? colors.teal
                              : user.accessLevel === 'SUBSCRIBER'
                              ? colors.primary
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {user.accessLevel}
                    </Text>
                  </View>
                </View>
                <View style={styles.levelRow}>
                  {LEVELS.map(level => {
                    const active = user.accessLevel === level;
                    return (
                      <TouchableOpacity
                        key={`${user.id}-${level}`}
                        style={[
                          styles.levelButton,
                          {
                            backgroundColor: active ? colors.primary : colors.bgInput,
                            borderColor: active ? colors.primary : colors.border,
                            opacity: userBusy ? 0.6 : 1,
                          },
                        ]}
                        disabled={userBusy}
                        onPress={() => handleChangeAccess(user, level)}
                      >
                        <Text
                          style={[
                            styles.levelButtonText,
                            { color: active ? '#FFFFFF' : colors.textSecondary },
                          ]}
                        >
                          {level === 'SUBSCRIBER' ? 'SUB' : level}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingTop: 52, paddingBottom: 32 },
  pageTitle: { fontSize: 26, fontWeight: Fonts.bold, marginBottom: 6, marginLeft: 54 },
  pageSubtitle: { fontSize: 14, lineHeight: 20, marginBottom: 18, marginLeft: 54 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statValue: { fontSize: 22, fontWeight: Fonts.bold },
  statLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  sectionCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: Fonts.bold, marginBottom: 4 },
  sectionHint: { fontSize: 12, lineHeight: 18, marginBottom: 14 },
  emptyText: { fontSize: 13 },
  requestCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  requestUser: { fontSize: 14, fontWeight: Fonts.bold, marginBottom: 4 },
  requestMeta: { fontSize: 12, marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  reviewBtn: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: 10,
  },
  reviewBtnText: { fontSize: 13, fontWeight: Fonts.bold },
  policyBlock: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  policyTitle: { fontSize: 14, fontWeight: Fonts.bold },
  policyCount: { fontSize: 12 },
  policyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  policyChip: {
    borderRadius: Radii.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  policyChipText: { fontSize: 12, fontWeight: Fonts.semiBold },
  userCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  userName: { fontSize: 14, fontWeight: Fonts.bold },
  userMeta: { fontSize: 12, marginTop: 3 },
  levelBadge: {
    borderRadius: Radii.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  levelBadgeText: { fontSize: 11, fontWeight: Fonts.bold },
  levelRow: { flexDirection: 'row', gap: 8 },
  levelButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radii.full,
    borderWidth: 1,
    paddingVertical: 9,
  },
  levelButtonText: { fontSize: 11, fontWeight: Fonts.bold },
  lockedCard: {
    alignItems: 'center',
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: 28,
    marginTop: 90,
  },
  lockedEmoji: { fontSize: 46, marginBottom: 12 },
  lockedTitle: { fontSize: 20, fontWeight: Fonts.bold, marginBottom: 8 },
  lockedText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
