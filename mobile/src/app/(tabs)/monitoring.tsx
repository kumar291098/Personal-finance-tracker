import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMetric, getHealth, HealthResponse, MetricResponse } from '../../api/monitoring';
import { getAccessPolicy } from '../../api/subscription';
import { Fonts, Radii, useTheme } from '../../theme';

type MetricKey =
  | 'requests'
  | 'loginRequests'
  | 'memory'
  | 'uptime'
  | 'dbActive'
  | 'dbPending'
  | 'aiCacheRequests'
  | 'aiCacheHits'
  | 'aiCacheMisses'
  | 'aiCacheDisabled'
  | 'aiCacheErrors'
  | 'aiCachePuts'
  | 'aiDbCalls'
  | 'aiDbLoads'
  | 'aiDbLastLoadMs'
  | 'aiDbLoadDuration'
  | 'aiCacheLookupDuration'
  | 'aiEstimatedSavedMs';

const metricConfigs: { key: MetricKey; name: string; tags?: string[] }[] = [
  { key: 'requests', name: 'http.server.requests' },
  { key: 'loginRequests', name: 'http.server.requests', tags: ['uri:/api/auth/login'] },
  { key: 'memory', name: 'jvm.memory.used' },
  { key: 'uptime', name: 'process.uptime' },
  { key: 'dbActive', name: 'hikaricp.connections.active' },
  { key: 'dbPending', name: 'hikaricp.connections.pending' },
  { key: 'aiCacheRequests', name: 'finance.ai.context.cache.requests' },
  { key: 'aiCacheHits', name: 'finance.ai.context.cache.hits' },
  { key: 'aiCacheMisses', name: 'finance.ai.context.cache.misses' },
  { key: 'aiCacheDisabled', name: 'finance.ai.context.cache.disabled' },
  { key: 'aiCacheErrors', name: 'finance.ai.context.cache.errors' },
  { key: 'aiCachePuts', name: 'finance.ai.context.cache.puts' },
  { key: 'aiDbCalls', name: 'finance.ai.context.database.calls' },
  { key: 'aiDbLoads', name: 'finance.ai.context.database.loads' },
  { key: 'aiDbLastLoadMs', name: 'finance.ai.context.database.last_load_ms' },
  { key: 'aiDbLoadDuration', name: 'finance.ai.context.database.load.duration' },
  { key: 'aiCacheLookupDuration', name: 'finance.ai.context.cache.lookup.duration' },
  { key: 'aiEstimatedSavedMs', name: 'finance.ai.context.cache.estimated_saved_ms' },
];

const getMeasurement = (
  metric: MetricResponse | null | undefined,
  statistic: string
) => {
  const measurement = metric?.measurements?.find(item => item.statistic === statistic);
  return Number(measurement?.value || 0);
};

const getAverageDuration = (metric: MetricResponse | null | undefined) => {
  const count = getMeasurement(metric, 'COUNT');
  if (!count) {
    return 0;
  }

  return getMeasurement(metric, 'TOTAL_TIME') / count;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value || 0);

const formatDuration = (seconds: number) => {
  if (!seconds) return '0 ms';
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 60) return `${seconds.toFixed(2)} s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 MB';
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes.toFixed(1)} MB`;
};

export default function MonitoringScreen() {
  const { colors, shadows } = useTheme();
  const [accessLevel, setAccessLevel] = useState('FREE');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [metrics, setMetrics] = useState<Partial<Record<MetricKey, MetricResponse | null>>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }

    try {
      setError('');
      const policy = await getAccessPolicy();
      setAccessLevel(policy.accessLevel);

      if (policy.accessLevel !== 'ADMIN') {
        setHealth(null);
        setMetrics({});
        return;
      }

      const [healthResult, metricResults] = await Promise.all([
        getHealth(),
        Promise.allSettled(
          metricConfigs.map(config => getMetric(config.name, config.tags || []))
        ),
      ]);

      const nextMetrics = metricResults.reduce<Partial<Record<MetricKey, MetricResponse | null>>>(
        (result, item, index) => {
          result[metricConfigs[index].key] = item.status === 'fulfilled' ? item.value : null;
          return result;
        },
        {}
      );

      setHealth(healthResult);
      setMetrics(nextMetrics);
      setLastUpdated(new Date());
    } catch (loadError: any) {
      setError(loadError?.message || 'Unable to load monitoring data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summaryCards = useMemo(() => {
    const avgApiTime =
      getMeasurement(metrics.requests, 'TOTAL_TIME') /
      Math.max(getMeasurement(metrics.requests, 'COUNT'), 1);
    const avgLoginTime =
      getMeasurement(metrics.loginRequests, 'TOTAL_TIME') /
      Math.max(getMeasurement(metrics.loginRequests, 'COUNT'), 1);
    const pendingDb = getMeasurement(metrics.dbPending, 'VALUE');

    return [
      {
        title: 'Backend Health',
        value: health?.status || 'Unknown',
        subtitle: health?.components?.db?.status
          ? `Database: ${health.components.db.status}`
          : 'Health endpoint',
        color: health?.status === 'UP' ? colors.income : colors.expense,
      },
      {
        title: 'Avg API Time',
        value: formatDuration(avgApiTime),
        subtitle: `${formatNumber(getMeasurement(metrics.requests, 'COUNT'))} requests`,
        color: colors.primary,
      },
      {
        title: 'Login Avg Time',
        value: formatDuration(avgLoginTime),
        subtitle: `${formatNumber(getMeasurement(metrics.loginRequests, 'COUNT'))} login calls`,
        color: colors.teal,
      },
      {
        title: 'DB Connections',
        value: `${formatNumber(getMeasurement(metrics.dbActive, 'VALUE'))} active`,
        subtitle: `${formatNumber(pendingDb)} pending`,
        color: pendingDb > 0 ? colors.expense : colors.income,
      },
      {
        title: 'Memory Used',
        value: formatBytes(getMeasurement(metrics.memory, 'VALUE')),
        subtitle: 'JVM heap + non-heap',
        color: colors.primary,
      },
      {
        title: 'Uptime',
        value: formatDuration(getMeasurement(metrics.uptime, 'VALUE')),
        subtitle: 'Since backend boot',
        color: colors.textPrimary,
      },
    ];
  }, [colors.expense, colors.income, colors.primary, colors.teal, colors.textPrimary, health, metrics]);

  const aiStats = useMemo(() => {
    const requests = getMeasurement(metrics.aiCacheRequests, 'COUNT');
    const hits = getMeasurement(metrics.aiCacheHits, 'COUNT');
    const misses = getMeasurement(metrics.aiCacheMisses, 'COUNT');
    const dbCalls = getMeasurement(metrics.aiDbCalls, 'COUNT');
    const savedMs = getMeasurement(metrics.aiEstimatedSavedMs, 'COUNT');

    return {
      requests,
      hits,
      misses,
      dbCalls,
      disabled: getMeasurement(metrics.aiCacheDisabled, 'COUNT'),
      errors: getMeasurement(metrics.aiCacheErrors, 'COUNT'),
      writes: getMeasurement(metrics.aiCachePuts, 'COUNT'),
      dbLoads: getMeasurement(metrics.aiDbLoads, 'COUNT'),
      lastDbLoadMs: getMeasurement(metrics.aiDbLastLoadMs, 'VALUE'),
      hitRate: requests > 0 ? (hits / requests) * 100 : 0,
      savedMs,
      dbLoadAvg: getAverageDuration(metrics.aiDbLoadDuration),
      cacheLookupAvg: getAverageDuration(metrics.aiCacheLookupDuration),
    };
  }, [metrics]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (accessLevel !== 'ADMIN') {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View
            style={[
              styles.lockedCard,
              { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card },
            ]}
          >
            <Text style={styles.lockedEmoji}>📡</Text>
            <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>Monitoring is admin-only</Text>
            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
              Sign in with an admin account to inspect backend health and metrics.
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
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Monitoring</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              Backend health, API speed, DB pressure, and AI cache behavior.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => loadData(true)}
          >
            <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={[styles.errorCard, { backgroundColor: `${colors.expense}10`, borderColor: `${colors.expense}44` }]}>
            <Text style={[styles.errorText, { color: colors.expense }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.cardGrid}>
          {summaryCards.map(card => (
            <View
              key={card.title}
              style={[
                styles.metricCard,
                { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card },
              ]}
            >
              <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{card.title}</Text>
              <Text style={[styles.metricValue, { color: card.color }]}>{card.value}</Text>
              <Text style={[styles.metricSub, { color: colors.textMuted }]}>{card.subtitle}</Text>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>AI Redis Cache</Text>
          <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
            Watch hit rate, fallbacks, and saved time for the finance chatbot.
          </Text>

          <View style={styles.aiStatsGrid}>
            {[
              { label: 'Hit Rate', value: `${aiStats.hitRate.toFixed(1)}%`, color: aiStats.hitRate > 0 ? colors.income : colors.textSecondary },
              { label: 'Cache Hits', value: formatNumber(aiStats.hits), color: colors.income },
              { label: 'Cache Misses', value: formatNumber(aiStats.misses), color: colors.expense },
              { label: 'DB Calls', value: formatNumber(aiStats.dbCalls), color: colors.primary },
            ].map(item => (
              <View
                key={item.label}
                style={[styles.aiStatCard, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
              >
                <Text style={[styles.aiStatLabel, { color: colors.textMuted }]}>{item.label}</Text>
                <Text style={[styles.aiStatValue, { color: item.color }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.detailList, { borderTopColor: colors.border }]}>
            {[
              ['Redis writes', formatNumber(aiStats.writes)],
              ['Cache disabled count', formatNumber(aiStats.disabled)],
              ['Cache errors', formatNumber(aiStats.errors)],
              ['Database load operations', formatNumber(aiStats.dbLoads)],
              ['Last DB load', `${formatNumber(aiStats.lastDbLoadMs)} ms`],
              ['Avg DB load', formatDuration(aiStats.dbLoadAvg)],
              ['Avg cache lookup', formatDuration(aiStats.cacheLookupAvg)],
              ['Estimated saved time', formatDuration(aiStats.savedMs / 1000)],
            ].map(([label, value]) => (
              <View key={label} style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.bgCard, borderColor: colors.border, ...shadows.card },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>What To Watch</Text>
          {[
            'Average API time should usually stay under half a second.',
            'Pending DB connections should normally remain at zero.',
            'A higher AI cache hit rate means fewer expensive database reloads.',
            'Frequent uptime resets usually mean the backend is restarting or sleeping.',
          ].map(item => (
            <View key={item} style={styles.tipRow}>
              <Text style={[styles.tipBullet, { color: colors.primary }]}>•</Text>
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>

        {lastUpdated ? (
          <Text style={[styles.updatedText, { color: colors.textMuted }]}>
            Last updated: {lastUpdated.toLocaleString()}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingTop: 52, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  pageTitle: { fontSize: 26, fontWeight: Fonts.bold, marginBottom: 6 },
  pageSubtitle: { fontSize: 14, lineHeight: 20 },
  refreshBtn: {
    borderRadius: Radii.full,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshBtnText: { fontSize: 12, fontWeight: Fonts.bold },
  errorCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { fontSize: 13, fontWeight: Fonts.medium },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricCard: {
    width: '48.5%',
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: 14,
  },
  metricTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 8 },
  metricValue: { fontSize: 20, fontWeight: Fonts.bold, marginBottom: 6 },
  metricSub: { fontSize: 12, lineHeight: 18 },
  sectionCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: Fonts.bold, marginBottom: 4 },
  sectionHint: { fontSize: 12, lineHeight: 18, marginBottom: 14 },
  aiStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  aiStatCard: {
    width: '48.5%',
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 12,
  },
  aiStatLabel: { fontSize: 11, marginBottom: 4 },
  aiStatValue: { fontSize: 18, fontWeight: Fonts.bold },
  detailList: { borderTopWidth: 1, paddingTop: 12, gap: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  detailLabel: { flex: 1, fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: Fonts.semiBold, textAlign: 'right' },
  tipRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tipBullet: { fontSize: 18, lineHeight: 18 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },
  updatedText: { textAlign: 'center', fontSize: 12, marginTop: 4 },
  lockedCard: {
    alignItems: 'center',
    borderRadius: Radii.xl,
    borderWidth: 1,
    padding: 28,
    marginTop: 90,
  },
  lockedEmoji: { fontSize: 46, marginBottom: 12 },
  lockedTitle: { fontSize: 20, fontWeight: Fonts.bold, marginBottom: 8 },
  lockedText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
