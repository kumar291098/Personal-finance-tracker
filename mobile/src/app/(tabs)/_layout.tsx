import { Tabs, usePathname, useRouter, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { getAccessPolicy } from '../../api/subscription';
import { Fonts, Radii, useTheme } from '../../theme';
import ChatScreen from './chat';

type IconName =
  | 'dashboard'
  | 'transactions'
  | 'analytics'
  | 'chat'
  | 'categories'
  | 'subscription'
  | 'profile'
  | 'access'
  | 'monitoring';

type DrawerItem = {
  label: string;
  href: Href;
  route: IconName;
};

const drawerItems: DrawerItem[] = [
  { label: 'Dashboard', href: '/(tabs)/dashboard', route: 'dashboard' },
  { label: 'Transactions', href: '/(tabs)/transactions', route: 'transactions' },
  { label: 'Analytics', href: '/(tabs)/analytics', route: 'analytics' },
  { label: 'Chatbot', href: '/(tabs)/chat', route: 'chat' },
  { label: 'Categories', href: '/(tabs)/categories', route: 'categories' },
  { label: 'Subscription', href: '/(tabs)/subscription', route: 'subscription' },
  { label: 'Profile', href: '/(tabs)/profile', route: 'profile' },
  { label: 'Access Control', href: '/(tabs)/access', route: 'access' },
  { label: 'Monitoring', href: '/(tabs)/monitoring', route: 'monitoring' },
];

const defaultAllowedPages = ['dashboard', 'transactions', 'analytics', 'categories', 'subscription', 'profile'];

function SidebarArrow({ color }: { color: string }) {
  return (
    <View style={styles.arrowWrap}>
      <Text style={[styles.arrowText, { color }]}>{'←'}</Text>
    </View>
  );
}

function MenuIcon({ name, active, color }: { name: IconName; active: boolean; color: string }) {
  const lineColor = active ? '#FFFFFF' : color;
  const muted = active ? '#FFFFFFAA' : `${color}88`;

  if (name === 'dashboard') {
    return (
      <View style={styles.gridIcon}>
        {[0, 1, 2, 3].map(index => (
          <View key={index} style={[styles.gridCell, { borderColor: lineColor }]} />
        ))}
      </View>
    );
  }

  if (name === 'transactions') {
    return (
      <View style={[styles.cardIcon, { borderColor: lineColor }]}>
        <View style={[styles.cardStripe, { backgroundColor: muted }]} />
        <View style={[styles.cardDot, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  if (name === 'analytics') {
    return (
      <View style={styles.chartIcon}>
        <View style={[styles.chartBar, { height: 10, backgroundColor: muted }]} />
        <View style={[styles.chartBar, { height: 16, backgroundColor: lineColor }]} />
        <View style={[styles.chartBar, { height: 22, backgroundColor: muted }]} />
      </View>
    );
  }

  if (name === 'chat') {
    return (
      <View style={[styles.chatIcon, { borderColor: lineColor }]}>
        <Text style={[styles.chatIconText, { color: lineColor }]}>AI</Text>
      </View>
    );
  }

  if (name === 'categories') {
    return (
      <View style={[styles.tagIcon, { borderColor: lineColor }]}>
        <View style={[styles.tagDot, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  if (name === 'subscription') {
    return <Text style={[styles.symbolIcon, { color: lineColor }]}>$</Text>;
  }

  if (name === 'access') {
    return (
      <View style={styles.lockIcon}>
        <View style={[styles.lockShackle, { borderColor: lineColor }]} />
        <View style={[styles.lockBody, { borderColor: lineColor }]} />
      </View>
    );
  }

  if (name === 'monitoring') {
    return (
      <View style={styles.monitorIcon}>
        <View style={[styles.monitorRingLarge, { borderColor: muted }]} />
        <View style={[styles.monitorRingSmall, { borderColor: lineColor }]} />
        <View style={[styles.monitorDot, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  return (
    <View style={styles.profileIcon}>
      <View style={[styles.profileHead, { borderColor: lineColor }]} />
      <View style={[styles.profileBody, { borderColor: lineColor }]} />
    </View>
  );
}

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, shadows } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [allowedPages, setAllowedPages] = useState<string[]>(defaultAllowedPages);
  const canUseChat = allowedPages.includes('chat');

  useEffect(() => {
    let mounted = true;

    getAccessPolicy()
      .then(policy => {
        if (mounted) setAllowedPages(policy.allowedPages?.length ? policy.allowedPages : defaultAllowedPages);
      })
      .catch(() => {
        if (mounted) setAllowedPages(defaultAllowedPages);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Drawer items excluding chat (chat is now a floating modal)
  const visibleDrawerItems = drawerItems
    .filter(item => item.route !== 'chat')
    .filter(item => allowedPages.includes(item.route));

  const openRoute = (href: Href) => {
    setDrawerOpen(false);
    router.push(href);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="transactions" />
        <Tabs.Screen name="analytics" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="categories" />
        <Tabs.Screen name="subscription" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="access" />
        <Tabs.Screen name="monitoring" />
      </Tabs>

      {/* ── Hamburger menu button (top-left) ── */}
      <Pressable
        onPress={() => setDrawerOpen(true)}
        style={({ pressed }) => [
          styles.menuButton,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
          shadows.card,
        ]}
      >
        <SidebarArrow color={colors.primary} />
      </Pressable>

      {/* ── Floating AI chat button (bottom-right) ── */}
      {canUseChat && !chatOpen && (
        <Pressable
          onPress={() => setChatOpen(true)}
          style={({ pressed }) => [
            styles.chatFab,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.86 : 1,
            },
            shadows.violet,
          ]}
        >
          <Text style={styles.chatFabEmoji}>🤖</Text>
          <Text style={styles.chatFabLabel}>AI</Text>
        </Pressable>
      )}

      <Modal
        visible={chatOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setChatOpen(false)}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.chatModalRoot}
        >
          {/* Tap outside to close */}
          <Pressable style={styles.chatModalBackdrop} onPress={() => setChatOpen(false)} />

          {/* Chat panel slides up from bottom */}
          <View style={[styles.chatPanel, { backgroundColor: colors.bg }]}>
            {/* Header with close button */}
            <View style={[styles.chatPanelHeader, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
              <View style={styles.chatPanelTitleRow}>
                <Text style={styles.chatPanelEmoji}>🤖</Text>
                <View>
                  <Text style={[styles.chatPanelTitle, { color: colors.textPrimary }]}>AI Finance Assistant</Text>
                  <Text style={[styles.chatPanelSub, { color: colors.textMuted }]}>Ask me anything about your finances</Text>
                </View>
              </View>
              <Pressable
                onPress={() => setChatOpen(false)}
                style={[styles.chatCloseBtn, { backgroundColor: `${colors.expense}18`, borderColor: `${colors.expense}44` }]}
              >
                <Text style={[styles.chatCloseTxt, { color: colors.expense }]}>✕</Text>
              </Pressable>
            </View>

            {/* Render full chat screen content */}
            <View style={{ flex: 1 }}>
              {chatOpen && <ChatScreen />}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Side Drawer ── */}
      <Modal visible={drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <View style={styles.drawerRoot}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setDrawerOpen(false)} />
          <View style={[styles.drawerPanel, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={[styles.drawerKicker, { color: colors.teal }]}>Menu</Text>
                <Text style={[styles.drawerTitle, { color: colors.textPrimary }]}>Finance Tracker</Text>
              </View>
              <Pressable
                onPress={() => setDrawerOpen(false)}
                style={[styles.closeButton, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
              >
                <Text style={[styles.closeText, { color: colors.textPrimary }]}>✕</Text>
              </Pressable>
            </View>

            <View style={styles.drawerItems}>
              {visibleDrawerItems.map(item => {
                const active = pathname.includes(item.route);
                return (
                  <Pressable
                    key={item.route}
                    onPress={() => openRoute(item.href)}
                    style={({ pressed }) => [
                      styles.drawerItem,
                      {
                        backgroundColor: active || pressed ? `${colors.primary}18` : colors.bgInput,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.drawerItemIcon,
                        { backgroundColor: active ? colors.primary : `${colors.primary}18` },
                      ]}
                    >
                      <MenuIcon name={item.route} active={active} color={colors.primary} />
                    </View>
                    <Text style={[styles.drawerItemText, { color: active ? colors.primary : colors.textPrimary }]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}

              {/* AI Chat item in drawer too */}
              {canUseChat && (
                <Pressable
                  onPress={() => { setDrawerOpen(false); setChatOpen(true); }}
                  style={({ pressed }) => [
                    styles.drawerItem,
                    {
                      backgroundColor: pressed ? `${colors.primary}18` : colors.bgInput,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.drawerItemIcon, { backgroundColor: `${colors.primary}18` }]}>
                    <MenuIcon name="chat" active={false} color={colors.primary} />
                  </View>
                  <Text style={[styles.drawerItemText, { color: colors.textPrimary }]}>AI Chatbot</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  menuButton: {
    position: 'absolute',
    top: 48,
    left: 18,
    width: 46,
    height: 46,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  hamburgerLines: { gap: 5 },
  hamburgerLine: { width: 20, height: 2.5, borderRadius: 2 },
  arrowWrap: { alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32, fontWeight: '300', lineHeight: 34, marginTop: -2 },
  chatFab: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  chatFabEmoji: { fontSize: 26 },
  chatFabLabel: { color: '#FFFFFFCC', fontSize: 10, fontWeight: Fonts.bold, marginTop: 2 },
  chatModalRoot: { flex: 1, justifyContent: 'flex-end' },
  chatModalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  chatPanel: {
    height: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  chatPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  chatPanelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatPanelEmoji: { fontSize: 28 },
  chatPanelTitle: { fontSize: 16, fontWeight: Fonts.bold },
  chatPanelSub: { fontSize: 11, marginTop: 2 },
  chatCloseBtn: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chatCloseTxt: { fontSize: 16, fontWeight: Fonts.bold },
  drawerRoot: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawerPanel: {
    width: 292,
    maxWidth: '82%',
    height: '100%',
    borderRightWidth: 1,
    paddingTop: 54,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  drawerKicker: { fontSize: 12, fontWeight: Fonts.bold, letterSpacing: 1, textTransform: 'uppercase' },
  drawerTitle: { fontSize: 23, fontWeight: Fonts.extraBold, marginTop: 3 },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { fontSize: 14, fontWeight: Fonts.extraBold },
  drawerItems: { gap: 10 },
  drawerItem: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drawerItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemText: { fontSize: 16, fontWeight: Fonts.bold },
  gridIcon: { width: 22, height: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridCell: { width: 9, height: 9, borderRadius: 3, borderWidth: 2 },
  cardIcon: { width: 24, height: 18, borderRadius: 5, borderWidth: 2, padding: 3 },
  cardStripe: { height: 3, borderRadius: 2, marginBottom: 4 },
  cardDot: { width: 5, height: 5, borderRadius: 3, alignSelf: 'flex-end' },
  chartIcon: { height: 24, width: 26, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  chartBar: { width: 5, borderRadius: 4 },
  chatIcon: { width: 28, height: 22, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  chatIconText: { fontSize: 10, fontWeight: Fonts.extraBold },
  tagIcon: { width: 24, height: 18, borderRadius: 6, borderWidth: 2, transform: [{ rotate: '-12deg' }] },
  tagDot: { width: 5, height: 5, borderRadius: 3, marginLeft: 4, marginTop: 4 },
  symbolIcon: { fontSize: 24, fontWeight: Fonts.extraBold },
  lockIcon: { alignItems: 'center' },
  lockShackle: {
    width: 12,
    height: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  lockBody: {
    width: 18,
    height: 12,
    borderWidth: 2,
    borderRadius: 4,
    marginTop: -1,
  },
  monitorIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monitorRingLarge: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  monitorRingSmall: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  monitorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  profileIcon: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  profileHead: { width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  profileBody: { width: 22, height: 11, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderWidth: 2, borderBottomWidth: 0 },
});
