import { Tabs, usePathname, useRouter, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';
import { getAccessPolicy } from '../../api/subscription';
import { Fonts, Radii, useTheme } from '../../theme';

type IconName = 'dashboard' | 'transactions' | 'analytics' | 'chat' | 'categories' | 'subscription' | 'profile';

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
];

const defaultAllowedPages = ['dashboard', 'transactions', 'analytics', 'categories', 'subscription', 'profile'];

function HamburgerIcon({ color }: { color: string }) {
  return (
    <View style={styles.hamburgerLines}>
      <View style={[styles.hamburgerLine, { backgroundColor: color }]} />
      <View style={[styles.hamburgerLine, { backgroundColor: color }]} />
      <View style={[styles.hamburgerLine, { backgroundColor: color }]} />
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
  const [allowedPages, setAllowedPages] = useState<string[]>(defaultAllowedPages);
  const isChatRoute = pathname.includes('/chat');
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

  useEffect(() => {
    if (isChatRoute && !canUseChat) {
      router.replace('/(tabs)/subscription');
    }
  }, [canUseChat, isChatRoute, router]);

  const visibleDrawerItems = drawerItems.filter(item => allowedPages.includes(item.route));

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
      </Tabs>

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
        <HamburgerIcon color={colors.primary} />
      </Pressable>

      {canUseChat && !isChatRoute && (
        <Pressable
          onPress={() => router.push('/(tabs)/chat')}
          style={({ pressed }) => [
            styles.chatButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.86 : 1,
            },
            shadows.violet,
          ]}
        >
          <MenuIcon name="chat" active color="#FFFFFF" />
          <Text style={styles.chatButtonSub}>Chatbot</Text>
        </Pressable>
      )}

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
                <Text style={[styles.closeText, { color: colors.textPrimary }]}>X</Text>
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
  chatButton: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 76,
    height: 76,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  chatButtonSub: { color: '#FFFFFFCC', fontSize: 11, fontWeight: Fonts.bold, marginTop: 3 },
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
  profileIcon: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  profileHead: { width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  profileBody: { width: 22, height: 11, borderTopLeftRadius: 11, borderTopRightRadius: 11, borderWidth: 2, borderBottomWidth: 0 },
});
