import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";

export default function BlockedUsersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { conversations, blockUser } = useChat();
  const toggleBlockUser = blockUser;
  const blocked = conversations.filter((c) => c.isBlocked);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Blocked Users</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={blocked}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const displayName = item.isAnonymous && !item.isRevealed ? "Anonymous" : item.participantUsername;
          return (
            <View style={[styles.row, { borderBottomColor: colors.separator }]}>
              {item.participantAvatar ? (
                <Image source={{ uri: item.participantAvatar }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                  <Feather name="user" size={16} color={colors.primary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
                <Text style={[styles.sub, { color: colors.mutedForeground }]}>Tap unblock to allow messages again</Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleBlockUser(item.id)}
                style={[styles.unblockBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.unblockText, { color: colors.primary }]}>Unblock</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="slash" size={38} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No blocked users</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>When you block someone, they’ll appear here.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 42, height: 42, borderRadius: 21 },
  name: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  unblockBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  unblockText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", gap: 10, paddingTop: 90, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
