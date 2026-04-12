import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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
  fileSize: string;
  downloads: number;
  createdAt: string;
}

const SUBJECTS = ["All", "Mathematics", "Physics", "Chemistry", "CS", "Electrical", "Mechanical", "Economics"];

const SAMPLE_NOTES: Note[] = [
  { id: "n1", subject: "Mathematics", title: "Laplace Transform Complete Notes", uploader: "priya_cs23", college: "IIT Delhi", year: "3rd Year", fileSize: "2.4 MB", downloads: 234, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "n2", subject: "CS", title: "Data Structures and Algorithms - Full Course", uploader: "arjun_mech22", college: "IIT Delhi", year: "2nd Year", fileSize: "8.1 MB", downloads: 891, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "n3", subject: "Physics", title: "Quantum Mechanics Chapter 1-5 Notes", uploader: "anonymous", college: "IIT Delhi", year: "3rd Year", fileSize: "1.8 MB", downloads: 156, createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "n4", subject: "Electrical", title: "Circuit Analysis Problem Sets with Solutions", uploader: "shreya_ee24", college: "IIT Delhi", year: "2nd Year", fileSize: "3.2 MB", downloads: 432, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "n5", subject: "Economics", title: "Microeconomics Exam Notes 2024", uploader: "anonymous", college: "IIT Delhi", year: "1st Year", fileSize: "1.1 MB", downloads: 78, createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
];

function NoteCard({ item, index, savedIds, onSave, colors }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  const saved = savedIds.has(item.id);

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 280, delay: index * 60, useNativeDriver: true }).start();
  }, []);

  const SUBJECT_COLORS: Record<string, string> = {
    CS: "#3B82F6", Mathematics: "#8B5CF6", Physics: "#06B6D4",
    Chemistry: "#EF4444", Electrical: "#F59E0B", Mechanical: "#F97316",
    Economics: "#00A86B",
  };
  const subjectColor = SUBJECT_COLORS[item.subject] || "#6B7280";

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
              <Text style={[styles.noteSize, { color: colors.mutedForeground }]}>{item.fileSize}</Text>
            </View>
            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); onSave(item.id); }} style={[styles.saveBtn, { backgroundColor: saved ? colors.primary + "20" : colors.secondary, borderColor: saved ? colors.primary + "40" : colors.border, borderWidth: 1 }]}>
              <Feather name={saved ? "bookmark" : "bookmark"} size={14} color={saved ? colors.primary : colors.mutedForeground} />
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
  const [activeSubject, setActiveSubject] = useState("All");
  const [search, setSearch] = useState("");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.spring(headerSlide, { toValue: 0, friction: 9, tension: 100, useNativeDriver: false }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!user || user.id === "demo_user_001") return;
    (async () => {
      try {
        const { data } = await supabase
          .from("note_saves")
          .select("note_id")
          .eq("user_id", user.id);
        if (data) setSavedIds(new Set(data.map((r: any) => r.note_id)));
      } catch {}
    })();
  }, [user?.id]);

  const handleSave = async (id: string) => {
    const already = savedIds.has(id);
    const updated = new Set(savedIds);
    if (already) { updated.delete(id); } else { updated.add(id); }
    setSavedIds(updated);
    if (user && user.id !== "demo_user_001") {
      if (already) {
        await supabase.from("note_saves").delete().eq("user_id", user.id).eq("note_id", id);
      } else {
        await supabase.from("note_saves").insert({ user_id: user.id, note_id: id });
      }
    }
    const note = SAMPLE_NOTES.find((n) => n.id === id);
    if (!already) showSuccess("Note saved!", note?.title);
  };

  const filtered = SAMPLE_NOTES.filter((n) => {
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
          <TypewriterText
            text="Notes"
            style={[styles.title, { color: colors.foreground }]}
            delay={300}
            speed={70}
          />
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
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No notes found</Text>
          </View>
        }
      />
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
  noteSize: { fontSize: 12, fontFamily: "Inter_400Regular" },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  saveBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
