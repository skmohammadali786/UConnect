import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "@/hooks/useColors";

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

export default function NotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [notes] = useState<Note[]>(SAMPLE_NOTES);
  const [activeSubject, setActiveSubject] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = notes.filter((n) => {
    const matchSubject = activeSubject === "All" || n.subject === activeSubject;
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Notes</Text>
        <TouchableOpacity onPress={() => router.push("/notes/upload")}>
          <Feather name="upload" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={[styles.searchWrap, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search notes..." placeholderTextColor={colors.placeholder} style={[styles.searchInput, { color: colors.foreground }]} />
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
              <TouchableOpacity
                onPress={() => setActiveSubject(item)}
                style={[styles.subjectChip, { backgroundColor: activeSubject === item ? colors.primary : colors.card, borderColor: activeSubject === item ? colors.primary : colors.border }]}
              >
                <Text style={[styles.subjectText, { color: activeSubject === item ? "#FFF" : colors.foreground }]}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => router.push({ pathname: "/notes/[id]" as any, params: { id: item.id } })} style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.noteHeader}>
              <View style={[styles.fileIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="file-text" size={20} color={colors.primary} />
              </View>
              <View style={styles.noteInfo}>
                <Text style={[styles.noteTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.noteMeta, { color: colors.mutedForeground }]}>{item.subject} · {item.year}</Text>
              </View>
            </View>
            <View style={styles.noteFooter}>
              <Text style={[styles.noteUploader, { color: colors.mutedForeground }]}>by {item.uploader}</Text>
              <View style={styles.noteStats}>
                <Feather name="download" size={12} color={colors.mutedForeground} />
                <Text style={[styles.noteStatText, { color: colors.mutedForeground }]}>{item.downloads}</Text>
                <Text style={[styles.noteSize, { color: colors.mutedForeground }]}>{item.fileSize}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
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
  subjectChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  subjectText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  noteCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  noteHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  fileIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  noteInfo: { flex: 1 },
  noteTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  noteMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3 },
  noteFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noteUploader: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noteStats: { flexDirection: "row", alignItems: "center", gap: 6 },
  noteStatText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  noteSize: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
