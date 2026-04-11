import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { formatRelativeTime } from "@/utils/time";

interface Confession {
  id: string;
  content: string;
  upvotes: number;
  commentCount: number;
  userVote: "up" | "down" | null;
  hasSensitiveContent: boolean;
  createdAt: string;
}

const CONFESSIONS: Confession[] = [
  { id: "c1", content: "I've been telling my parents I go to college every day but I haven't attended a single class in 2 months. The attendance just shows up somehow. I'm terrified they find out.", upvotes: 892, commentCount: 67, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
  { id: "c2", content: "I helped my best friend cheat on their final exam and now they got placed at a company I got rejected from. I don't know how to feel about this.", upvotes: 445, commentCount: 89, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() },
  { id: "c3", content: "I have a massive crush on my professor. I know it's wrong. I just needed to say this somewhere.", upvotes: 234, commentCount: 34, userVote: null, hasSensitiveContent: true, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { id: "c4", content: "I failed my first two semesters and almost dropped out. Now I'm in 4th year with a 9.1 CGPA. It's possible. Believe in yourself.", upvotes: 1203, commentCount: 145, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() },
  { id: "c5", content: "I pretend to be confident in class but I cry in the bathroom between lectures because imposter syndrome is crushing me.", upvotes: 678, commentCount: 92, userVote: null, hasSensitiveContent: false, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

export default function ConfessionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [confessions, setConfessions] = useState<Confession[]>(CONFESSIONS);
  const [revealedSensitive, setRevealedSensitive] = useState<Set<string>>(new Set());

  const vote = (id: string, v: "up" | "down") => {
    setConfessions((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const wasVoted = c.userVote === v;
      return { ...c, upvotes: v === "up" ? (wasVoted ? c.upvotes - 1 : c.upvotes + 1) : c.upvotes, userVote: wasVoted ? null : v };
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Confessions</Text>
        <TouchableOpacity onPress={() => router.push("/confessions/create")}>
          <Feather name="plus" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.banner, { backgroundColor: colors.primary + "10", borderBottomColor: colors.border }]}>
        <Feather name="shield" size={14} color={colors.primary} />
        <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>100% anonymous. No one can trace confessions back to you.</Text>
      </View>
      <FlatList
        data={confessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {item.hasSensitiveContent && !revealedSensitive.has(item.id) ? (
              <View style={styles.sensitiveWarning}>
                <Feather name="alert-triangle" size={20} color={colors.warning} />
                <Text style={[styles.sensitiveText, { color: colors.foreground }]}>Sensitive content</Text>
                <TouchableOpacity onPress={() => setRevealedSensitive((prev) => new Set([...prev, item.id]))} style={[styles.revealBtn, { borderColor: colors.border }]}>
                  <Text style={[styles.revealText, { color: colors.mutedForeground }]}>Show anyway</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.content, { color: colors.foreground }]}>{item.content}</Text>
            )}
            <View style={styles.cardFooter}>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => vote(item.id, "up")} style={styles.voteBtn}>
                  <Feather name="arrow-up" size={15} color={item.userVote === "up" ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.voteCount, { color: item.userVote === "up" ? colors.primary : colors.mutedForeground }]}>{item.upvotes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.voteBtn}>
                  <Feather name="message-circle" size={15} color={colors.mutedForeground} />
                  <Text style={[styles.voteCount, { color: colors.mutedForeground }]}>{item.commentCount}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  bannerText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sensitiveWarning: { alignItems: "center", gap: 10, paddingVertical: 12 },
  sensitiveText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  revealBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  revealText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  content: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 16 },
  voteBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  voteCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
