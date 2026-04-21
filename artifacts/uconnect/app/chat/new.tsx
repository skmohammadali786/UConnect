import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: string;
  username: string;
  college: string;
  displayName: string;
  avatar: string | null;
}

export default function NewChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { startConversation } = useChat();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        let query = supabase
          .from("profiles")
          .select("id, username, display_name, college, avatar")
          .neq("id", user?.id ?? "")
          .limit(25);
        if (q) {
          query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
        } else {
          query = query.order("followers", { ascending: false });
        }
        const { data } = await query;
        setProfiles((data ?? []).map((r: any) => ({
          id: r.id,
          username: r.username,
          displayName: r.display_name,
          college: r.college,
          avatar: r.avatar ?? null,
        })));
      } catch { setProfiles([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>New Message</Text>
        <View style={{ width: 30 }} />
      </View>
      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by username or name..."
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCapitalize="none"
            autoFocus
          />
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={profiles.length === 0 && !loading ? { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 } : undefined}
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", gap: 8, paddingTop: 40 }}>
              <Feather name="users" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {search ? "No users found" : "Search for people to message"}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={async () => {
              try {
                const convId = await startConversation(item.id, item.username, false);
                router.replace({ pathname: "/chat/[id]" as any, params: { id: convId } });
              } catch {}
            }}
            style={[styles.userItem, { borderBottomColor: colors.separator }]}
          >
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(item.displayName ?? item.username).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.username, { color: colors.foreground }]} numberOfLines={1}>
                {item.displayName || item.username}
              </Text>
              <Text style={[styles.college, { color: colors.mutedForeground }]} numberOfLines={1}>
                @{item.username} · {item.college}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  searchWrap: { padding: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  userItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  username: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  college: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
});
