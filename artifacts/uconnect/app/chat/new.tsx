import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useChat } from "@/context/ChatContext";

const SUGGESTED_USERS = [
  { id: "u10", username: "priya_cs23", college: "IIT Delhi" },
  { id: "u11", username: "arjun_mech22", college: "IIT Delhi" },
  { id: "u12", username: "shreya_ee24", college: "IIT Delhi" },
  { id: "u13", username: "rahul_civil21", college: "IIT Delhi" },
  { id: "u14", username: "ananya_ds23", college: "IIT Delhi" },
];

export default function NewChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { startConversation } = useChat();
  const [search, setSearch] = useState("");

  const filtered = SUGGESTED_USERS.filter((u) => u.username.includes(search.toLowerCase()));

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
          <TextInput value={search} onChangeText={setSearch} placeholder="Search users..." placeholderTextColor={colors.placeholder} style={[styles.searchInput, { color: colors.foreground }]} autoCapitalize="none" />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              const convId = startConversation(item.id, item.username, false);
              router.replace({ pathname: "/chat/[id]" as any, params: { id: convId } });
            }}
            style={[styles.userItem, { borderBottomColor: colors.separator }]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="user" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.username, { color: colors.foreground }]}>@{item.username}</Text>
              <Text style={[styles.college, { color: colors.mutedForeground }]}>{item.college}</Text>
            </View>
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
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  username: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  college: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
