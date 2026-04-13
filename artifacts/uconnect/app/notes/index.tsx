import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, FlatList, Platform, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface Note {
  id: string;
  subject: string;
  title: string;
  uploader: string;
  college: string;
  year: string;
  downloads: number;
  description: string;
  createdAt: string;
}

function rowToNote(r: any): Note {
  return {
    id: r.id,
    subject: r.subject,
    title: r.title,
    uploader: r.uploader_username,
    college: r.college,
    year: r.year,
    downloads: r.downloads ?? 0,
    description: r.description ?? "",
    createdAt: r.created_at,
  };
}

const SUBJECTS = ["All", "Mathematics", "Physics", "Chemistry", "Computer Science", "Electrical", "Mechanical", "Civil", "Economics", "MBA", "Biology", "Statistics", "Law", "Other"];
const SUBJECT_COLORS: Record<string, string> = {
  CS: "#3B82F6", Mathematics: "#8B5CF6", Physics: "#06B6D4",
  Chemistry: "#EF4444", Electrical: "#F59E0B", Mechanical: "#F97316",
  Economics: "#00A86B",
};

function NoteCard({ item, index, savedIds, onSave, colors }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  const saved = savedIds.has(item.id);
  const subjectColor = SUBJECT_COLORS[item.subject] || "#6B7280";

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 280, delay: index * 60, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
      <TouchableOpacity onPress={() => router.push({ pathname: "/notes/[id]" as any, params: { id: item.id } })} style={[styles.noteCard, { backgroundColor: colors.card, borderColor: saved ? colors.primary + "40" : colors.border }]}>
        <View style={styles.noteHeader}>
          <View style={[styles.fileIcon, { backgroundColor: subjectColor + "18" }]}>
            <Feather name="file-text" size={20} color={subjectColor} />
          </View>
          <View style={styles.noteInfo}>
            <Text style={[styles.noteTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.subjectBadge, { backgroundColor: subjectColor + "18" }]}>
                <Text style={[styles.subjectText, { color: subjectColor }]}>{item.subject}</Text>
              </View>
              <Text style={[styles.noteMeta, { color: colors.mutedForeground }]}>{item.year}</Text>
            </View>
          </View>
        </View>
        <View style={styles.noteFooter}>
          <Text style={[styles.noteUploader, { color: colors.mutedForeground }]}>by {item.uploader}</Text>
          <View style={styles.noteActions}>
            <View style={styles.noteStats}>
              <Feather name="download" size={12} color={colors.mutedForeground} />
              <Text style={[styles.noteStatText, { color: colors.mutedForeground }]}>{item.downloads}</Text>
            </View>
            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onSave(item.id); }} style={[styles.saveBtn, { backgroundColor: saved ? colors.primary + "20" : colors.secondary, borderColor: saved ? colors.primary + "40" : colors.border, borderWidth: 1 }]}>
              <Feather name="bookmark" size={14} color={saved ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.saveBtnText, { color: saved ? colors.primary : colors.mutedForeground }]}>{saved ? "Saved" : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showSuccess } = useToast();
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeSubject, setActiveSubject] = useState("All");
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(headerSlide, { toValue: 0, friction: 9, tension: 100, useNativeDriver: false }),
    ]).start();
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (data) setNotes(data.map(rowToNote));
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadSaved = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("note_saves")
        .select("note_id")
        .eq("user_id", user.id);
      if (data) setSavedIds(new Set(data.map((r: any) => r.note_id)));
    } catch {}
  }, [user?.id]);

  useEffect(() => { loadNotes(); }, []);
  useEffect(() => { loadSaved(); }, [user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotes();
    loadSaved();
  };

  const handleSave = async (id: string) => {
    if (!user) return;
    const already = savedIds.has(id);
    const updated = new Set(savedIds);
    if (already) { updated.delete(id); } else { updated.add(id); }
    setSavedIds(updated);

    if (already) {
      await supabase.from("note_saves").delete().eq("user_id", user.id).eq("note_id", id);
    } else {
      await supabase.from("note_saves").insert({ user_id: user.id, note_id: id });
      const note = notes.find((n) => n.id === id);
      showSuccess("Note saved!", note?.title);
    }
  };

  const filtered = notes.filter((n) => {
    const matchSubject = activeSubject === "All" || n.subject === activeSubject;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border, opacity: headerAnim, transform: [{ translateY: headerSlide }] }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View>
          <TypewriterText text="Notes" style={[styles.title, { color: colors.foreground }]} delay={300} speed={70} />
          {savedIds.size > 0 && <Text style={[styles.subtitle, { color: colors.primary }]}>{savedIds.size} saved</Text>}
        </View>
        <TouchableOpacity onPress={() => router.push("/notes/upload" as any)}>
          <Feather name="upload" size={20} color={colors.primary} />
        </TouchableOpacity>
      </Animated.View>
      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search notes..." placeholderTextColor={colors.placeholder} style={[styles.searchInput, { color: colors.foreground }]} />
          {search ? <TouchableOpacity onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></TouchableOpacity> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <FlatList
              data={SUBJECTS}
              keyExtractor={(s) => s}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => setActiveSubject(item)} style={[styles.subjectChip, { backgroundColor: activeSubject === item ? colors.primary : colors.card, borderColor: activeSubject === item ? colors.primary : colors.border }]}>
                  <Text style={[styles.subjectText2, { color: activeSubject === item ? "#FFF" : colors.foreground }]}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          }
          renderItem={({ item, index }) => (
            <NoteCard item={item} index={index} savedIds={savedIds} onSave={handleSave} colors={colors} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="file-text" size={40} color={colors.mutedForeground} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notes yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Be the first to share notes with your college!</Text>
              <TouchableOpacity onPress={() => router.push("/notes/upload" as any)} style={[styles.emptyBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.emptyBtnText}>Share Notes</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11, fontFamily: "Inter_500Medium" },
  searchWrap: { padding: 12, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  subjectText2: { fontSize: 13, fontFamily: "Inter_500Medium" },
  noteCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  noteHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  fileIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  noteInfo: { flex: 1 },
  noteTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  subjectBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  subjectText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  noteMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noteFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noteUploader: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noteActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  noteStats: { flexDirection: "row", alignItems: "center", gap: 6 },
  noteStatText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 24 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFF" },
});
