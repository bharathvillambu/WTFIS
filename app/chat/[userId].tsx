import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { MESSAGE_TTL_BANNER } from '@/constants/config';
import { supabase } from '@/lib/supabase';
import { getConversation, sendMessage, markMessagesRead } from '@/lib/messages';
import { blockUser } from '@/lib/moderation';
import ReportUserModal from '@/components/ReportUserModal';
import type { DirectMessage } from '@/types/message';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const other = String(userId ?? '');
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const listRef = useRef<FlatList<DirectMessage>>(null);

  const handleBlock = () => {
    Alert.alert(
      'Block user',
      "Block this user? You won't see each other on Radar or in chats.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const { error } = await blockUser(other);
            if (error) {
              Alert.alert('Could not block', error);
              return;
            }
            router.back();
          },
        },
      ]
    );
  };

  const refresh = useCallback(async () => {
    const { data } = await getConversation(other);
    setMessages(data);
    // If the thread contains any unread messages from the other user,
    // mark them read now that we're viewing the screen. Silent on error.
    if (data.some((m) => m.recipient_id !== other && m.sender_id === other && !m.read_at)) {
      await markMessagesRead(other);
    }
  }, [other]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    refresh();
  }, [refresh]);

  // Local tick every second so per-bubble countdown updates and expired
  // messages disappear without waiting for a server poll.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const now = Date.now() + tick * 0; // referenced so eslint keeps `tick`
  const visible = messages.filter((m) => new Date(m.expires_at).getTime() > Date.now());
  // Index of my most recent (still-visible) outgoing message — the only one
  // that gets the "Seen"/"Delivered" receipt underneath it.
  const lastMineIdx = (() => {
    for (let i = visible.length - 1; i >= 0; i--) {
      if (visible[i].sender_id === me) return i;
    }
    return -1;
  })();

  // Poll for new messages every 5s (cheap; realtime can replace this later).
  useEffect(() => {
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [refresh]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const { error } = await sendMessage(other, text.trim());
    setSending(false);
    if (!error) {
      setText('');
      refresh();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <>
    <KeyboardAvoidingView
      style={styles.screen}
      // On iOS `padding` lifts the composer above the keyboard. On Android
      // the OS uses `adjustResize` by default, so `height` cooperates best.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // Offset any status/notch area so the composer doesn't sit under the keyboard.
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>{'\u2039'} Back</Text></TouchableOpacity>
        <Text style={styles.title}>Chat</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setReportOpen(true)}>
            <Text style={styles.headerAction}>Report</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleBlock}>
            <Text style={styles.headerActionDanger}>Block</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>{MESSAGE_TTL_BANNER}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={visible}
        keyExtractor={(m) => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item, index }) => (
          <MessageBubble
            m={item}
            isMine={item.sender_id === me}
            showReceipt={index === lastMineIdx}
          />
        )}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={<Text style={styles.empty}>Send the first message.</Text>}
      />

      <View style={[styles.composer, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message"
          placeholderTextColor={COLORS.textMuted}
          maxLength={500}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    <ReportUserModal
      visible={reportOpen}
      onClose={() => setReportOpen(false)}
      targetUserId={other}
      context="chat"
    />
    </>
  );
}

function MessageBubble({
  m,
  isMine,
  showReceipt,
}: {
  m: DirectMessage;
  isMine: boolean;
  showReceipt?: boolean;
}) {
  const remaining = Math.max(0, Math.floor((new Date(m.expires_at).getTime() - Date.now()) / 1000));
  return (
    <View style={[styles.bubbleRow, isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
      <View style={[styles.bubbleCol, isMine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>{m.body}</Text>
          <Text style={[styles.countdown, { color: isMine ? '#F5D0E0' : COLORS.textSecondary }]}>
            disappears in {formatCountdown(remaining)}
          </Text>
        </View>
        {isMine && showReceipt && (
          <Text style={styles.receipt}>
            {m.read_at
              ? `Seen ${formatSeenAt(m.read_at)}`
              : `\u2713 Delivered`}
          </Text>
        )}
      </View>
    </View>
  );
}

function formatCountdown(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSeenAt(iso: string) {
  const d = new Date(iso);
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8,
  },
  back: { color: '#833AB4', fontWeight: '700', width: 60 },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 18 },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
    width: 100,
    justifyContent: 'flex-end',
  },
  headerAction: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  headerActionDanger: { color: COLORS.danger, fontSize: 12, fontWeight: '700' },
  banner: {
    backgroundColor: '#FEF3F8', borderColor: '#F7C6DA', borderWidth: 1,
    marginHorizontal: 12, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12,
  },
  bannerText: { color: '#833AB4', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  bubbleRow: { flexDirection: 'row', marginVertical: 4 },
  bubbleCol: { maxWidth: '78%' },
  bubble: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 },
  bubbleMine: { backgroundColor: '#833AB4', borderBottomRightRadius: 4 },
  bubbleTheirs: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4,
  },
  bubbleTextMine: { color: COLORS.white, fontSize: 14 },
  bubbleTextTheirs: { color: COLORS.text, fontSize: 14 },
  countdown: { fontSize: 10, marginTop: 4, textAlign: 'right' },
  receipt: {
    marginTop: 2,
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 24 },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10,
    color: COLORS.text,
    maxHeight: 120,
    minHeight: 40,
  },
  sendBtn: { backgroundColor: '#833AB4', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999 },
  sendText: { color: COLORS.white, fontWeight: '700' },
});

