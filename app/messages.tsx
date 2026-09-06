import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { COLORS } from '@/constants/theme';
import BottomNav from '@/components/BottomNav';
import NotificationBell from '@/components/NotificationBell';
import OnlineDot from '@/components/OnlineDot';
import { listConversations } from '@/lib/messages';
import { listFavorites } from '@/lib/social';
import { searchUsersByUsername } from '@/lib/search';
import type { CityUser, ConversationSummary, FavoriteUser } from '@/types/message';

type Tab = 'chats' | 'favorites' | 'search';

export default function MessagesScreen() {
  const [tab, setTab] = useState<Tab>('chats');
  const [convos, setConvos] = useState<ConversationSummary[]>([]);
  const [favs, setFavs] = useState<FavoriteUser[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CityUser[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    if (tab === 'chats') {
      const { data } = await listConversations();
      setConvos(data);
    } else if (tab === 'favorites') {
      const { data } = await listFavorites();
      setFavs(data);
    } else if (tab === 'search') {
      if (query.trim()) {
        const { data } = await searchUsersByUsername(query.trim());
        setSearchResults(data);
      } else {
        setSearchResults([]);
      }
    }
    setLoading(false);
  }, [tab, query]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  // Debounce the username search so we don't hammer the RPC on every keystroke.
  useEffect(() => {
    if (tab !== 'search') return;
    const handle = setTimeout(() => {
      refresh();
    }, 300);
    return () => clearTimeout(handle);
  }, [query, tab, refresh]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <NotificationBell />
      </View>

      <View style={styles.tabs}>
        {(['chats', 'favorites', 'search'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'chats' ? 'Chats' : t === 'favorites' ? 'Favorited' : 'Search'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'search' && (
        <View style={styles.filterBox}>
          <TextInput
            style={styles.input}
            placeholder="Search by username (e.g. bharath)"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
        </View>
      )}

      {tab === 'chats' && (
        <FlatList
          data={convos}
          keyExtractor={(c) => c.other_user_id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#833AB4" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/chat/${item.other_user_id}`)}>
              <Avatar uri={item.other_avatar_url} letter={item.other_username?.[0]} online={item.other_is_online} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>@{item.other_username ?? 'user'}</Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.preview,
                    (item.unread_count ?? 0) > 0 && styles.previewUnread,
                  ]}
                >
                  {item.last_is_mine ? 'You: ' : ''}{item.last_body}
                </Text>
              </View>
              {(item.unread_count ?? 0) > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {item.unread_count! > 9 ? '9+' : item.unread_count}
                  </Text>
                </View>
              ) : item.last_is_mine ? (
                <Text style={styles.rowReceipt}>
                  {item.last_read_at ? 'Seen' : '\u2713'}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyMsg text="No chats yet. Say hi from a Radar profile." />}
        />
      )}

      {tab === 'favorites' && (
        <FlatList
          data={favs}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#833AB4" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
              <Avatar uri={item.avatar_url} letter={item.instagram_username[0]} online={item.is_online} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>@{item.instagram_username}</Text>
                <Text style={styles.preview}>
                  {[item.gender, item.age ? `${item.age}y` : null, item.city].filter(Boolean).join('  ')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyMsg text="Favorite people from Radar to save them here." />}
        />
      )}

      {tab === 'search' && (
        <FlatList
          data={searchResults}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#833AB4" />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => router.push(`/chat/${item.id}`)}>
              <Avatar uri={item.avatar_url} letter={item.instagram_username[0]} online={item.is_online} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>@{item.instagram_username}</Text>
                <Text style={styles.preview}>
                  {[item.gender, item.age ? `${item.age}y` : null, item.city].filter(Boolean).join('  ')}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <EmptyMsg text={query.trim() ? 'No users match that username.' : 'Type a username to search.'} />
          }
        />
      )}

      <BottomNav />
    </View>
  );
}

function Avatar({ uri, letter, online }: { uri: string | null; letter?: string; online?: boolean }) {
  return (
    <View style={styles.avatarWrap}>
      {uri ? (
        <Image source={{ uri }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarLetter}>{(letter ?? '?').toUpperCase()}</Text>
        </View>
      )}
      <OnlineDot online={online} size={12} />
    </View>
  );
}

function EmptyMsg({ text }: { text: string }) {
  return (
    <View style={{ alignItems: 'center', marginTop: 48 }}>
      <Text style={{ color: COLORS.textSecondary }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8,
  },
  title: { color: COLORS.text, fontWeight: '800', fontSize: 20 },
  tabs: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 4, marginBottom: 8,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  tabActive: { backgroundColor: '#833AB4', borderColor: '#833AB4' },
  tabText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: COLORS.white },
  filterBox: {
    marginHorizontal: 16, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 12, marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 14,
  },
  searchBtn: {
    marginTop: 8, backgroundColor: '#833AB4', borderRadius: 999,
    paddingVertical: 8, alignItems: 'center',
  },
  searchBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  filterLabel: {
    color: COLORS.textSecondary, fontSize: 11, fontWeight: '700',
    marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
    backgroundColor: COLORS.card,
  },
  avatarWrap: { width: 44, height: 44, position: 'relative' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#833AB4', fontWeight: '800' },
  name: { color: COLORS.text, fontWeight: '700' },
  preview: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  previewUnread: { color: COLORS.text, fontWeight: '700' },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: '#833AB4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: { color: COLORS.white, fontSize: 11, fontWeight: '800' },
  rowReceipt: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', marginLeft: 4 },
});

