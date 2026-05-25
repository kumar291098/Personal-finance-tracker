import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { sendAiChatMessage } from '../../api/ai';
import { getProfile } from '../../api/profile';
import { Fonts, Radii, useTheme } from '../../theme';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

const quickPrompts = [
  'Summarize my spending',
  'How can I save more?',
  'Find my top expenses',
  'Create a monthly budget',
];

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
    return;
  }

  Alert.alert(title, message);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getStoredUsername = async () => {
  if (Platform.OS === 'web') return localStorage.getItem('username') || '';
  return (await SecureStore.getItemAsync('username')) || '';
};

export default function ChatScreen() {
  const router = useRouter();
  const { colors, shadows, isDark } = useTheme();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadGreeting = async () => {
      let displayName = '';

      try {
        const profile = await getProfile();
        displayName = (profile.firstName || profile.username || '').trim();
      } catch {
        displayName = (await getStoredUsername()).trim();
      }

      if (!mounted) return;

      const namePart = displayName ? ` ${displayName}` : '';
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: `${getGreeting()}${namePart}. I am your finance assistant. Ask me about spending, savings, budgets, or your recent transactions.`,
        },
      ]);
    };

    loadGreeting();

    return () => {
      mounted = false;
    };
  }, []);

  const minimizeChat = () => {
    router.replace('/(tabs)/dashboard');
  };

  const scrollToEnd = () => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || sending) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      const response = await sendAiChatMessage(text);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.reply || 'I could not create a reply right now.',
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const message = error?.message || 'Could not reach the AI assistant.';
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          text: message,
        },
      ]);
      showAlert('Chatbot Error', message);
    } finally {
      setSending(false);
      scrollToEnd();
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.bgBase }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
        ListHeaderComponent={
          <View style={[styles.promptCard, { backgroundColor: colors.bgCard, borderColor: colors.border, marginBottom: 12 }, shadows.card]}>
            <Text style={[styles.promptTitle, { color: colors.textPrimary }]}>Ask about your money</Text>
            <Text style={[styles.promptSub, { color: colors.textSecondary }]}>
              The assistant uses your saved profile and transactions from the backend.
            </Text>
            <View style={styles.quickGrid}>
              {quickPrompts.map(prompt => (
                <Pressable
                  key={prompt}
                  disabled={sending}
                  onPress={() => sendMessage(prompt)}
                  style={({ pressed }) => [
                    styles.quickChip,
                    {
                      backgroundColor: pressed ? `${colors.primary}22` : colors.bgInput,
                      borderColor: colors.border,
                      opacity: sending ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.quickText, { color: colors.textPrimary }]}>{prompt}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
              <View
                style={[
                  styles.bubble,
                  {
                    backgroundColor: isUser ? colors.primary : colors.bgCard,
                    borderColor: isUser ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.bubbleRole, { color: isUser ? '#FFFFFFCC' : colors.textMuted }]}>
                  {isUser ? 'You' : 'Assistant'}
                </Text>
                <Text style={[styles.bubbleText, { color: isUser ? '#FFFFFF' : colors.textPrimary }]}>
                  {item.text}
                </Text>
              </View>
            </View>
          );
        }}
        ListFooterComponent={
          sending ? (
            <View style={styles.typingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.typingText, { color: colors.textSecondary }]}>Assistant is thinking...</Text>
            </View>
          ) : null
        }
      />

      <View style={[styles.composer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask: where is my money going?"
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!sending}
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.bgInput }]}
          onSubmitEditing={() => {
            if (Platform.OS !== 'web') sendMessage();
          }}
        />
        <Pressable
          disabled={sending || !input.trim()}
          onPress={() => sendMessage()}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: colors.primary,
              opacity: sending || !input.trim() ? 0.55 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendText}>Send</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: { fontSize: 12, fontWeight: Fonts.bold, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 34, fontWeight: Fonts.extraBold, marginTop: 2 },
  minimizeButton: {
    minWidth: 92,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  minimizeIcon: { fontSize: 20, lineHeight: 14, fontWeight: Fonts.extraBold, marginTop: -6 },
  minimizeText: { fontSize: 11, fontWeight: Fonts.bold, marginTop: 2 },
  promptCard: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: Radii.xl,
    borderWidth: 1,
  },
  promptTitle: { fontSize: 18, fontWeight: Fonts.bold },
  promptSub: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  quickChip: {
    borderWidth: 1,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  quickText: { fontSize: 12, fontWeight: Fonts.semiBold },
  messages: { padding: 20, paddingBottom: 14, gap: 12 },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '84%',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  bubbleRole: { fontSize: 11, fontWeight: Fonts.bold, marginBottom: 4, textTransform: 'uppercase' },
  bubbleText: { fontSize: 15, lineHeight: 22, fontWeight: Fonts.medium },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  typingText: { fontSize: 13, fontWeight: Fonts.medium },
  composer: {
    margin: 14,
    marginTop: 0,
    borderWidth: 1,
    borderRadius: 24,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: Fonts.medium,
  },
  sendButton: {
    minWidth: 66,
    height: 44,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  sendText: { color: '#FFFFFF', fontSize: 14, fontWeight: Fonts.bold },
});
