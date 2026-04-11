import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";

const TRENDING_TAGS = ["Placement", "CGPA", "Hostel", "Events", "Notes", "Internship", "DSA", "Research"];
const DISCOVER_SECTIONS = [
  { id: "notes", icon: "book-open", label: "Notes", route: "/notes" },
  { id: "internships", icon: "briefcase", label: "Internships", route: "/internships" },
  { id: "events", icon: "calendar", label: "Events", route: "/events" },
  { id: "teams", icon: "users", label: "Teams", route: "/teams" },
  { id: "confessions", icon: "message-square", label: "Confessions", route: "/confessions" },
  { id: "invite", icon: "user-plus", label: "Invite Friends", route: "/invite" },
];

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { posts } = usePosts();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"posts" | "users">("posts");

  const filteredPosts = query
    ? posts.filter((p) => p.content.toLowerCase().includes(query.toLowerCase()) || p.tag.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search posts, users, tags..."
            placeholderTextColor={colors.placeholder}
            style={[styles.searchInput, { color: colors.foreground }]}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.length > 0 ? (
        <View style={{ flex: 1 }}>
          <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
            {["posts", "users"].map((t) => (
              <TouchableOpacity key={t} onPress={() => setActiveTab(t as any)} style={[styles.tab, activeTab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
                <Text style={[styles.tabText, { color: activeTab === t ? colors.primary : colors.mutedForeground }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <FlatList
            data={filteredPosts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PostCard post={item} currentUserId={user?.id || ""} />}
            contentContainerStyle={{ paddingBottom: 80 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Feather name="search" size={40} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No results for "{query}"</Text>
              </View>
            }
          />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 80 }}>
          {/* Trending tags */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending Topics</Text>
            <View style={styles.tagsWrap}>
              {TRENDING_TAGS.map((tag) => (
                <TouchableOpacity key={tag} onPress={() => setQuery(tag)} style={[styles.trendTag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.trendTagText, { color: colors.foreground }]}># {tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Discover */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Discover</Text>
            <View style={styles.discoverGrid}>
              {DISCOVER_SECTIONS.map((s) => (
                <TouchableOpacity key={s.id} onPress={() => router.push(s.route as any)} style={[styles.discoverCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.discoverIcon, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name={s.icon as any} size={22} color={colors.primary} />
                  </View>
                  <Text style={[styles.discoverLabel, { color: colors.foreground }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  trendTag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  trendTagText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  discoverGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  discoverCard: { width: "47%", borderRadius: 12, borderWidth: 1, padding: 16, alignItems: "flex-start", gap: 10 },
  discoverIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  discoverLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
