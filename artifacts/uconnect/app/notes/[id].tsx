import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const SAMPLE_NOTES_DATA: Record<string, any> = {
  n1: { id: "n1", subject: "Mathematics", title: "Laplace Transform Complete Notes", uploader: "priya_cs23", college: "IIT Delhi", year: "3rd Year", fileSize: "2.4 MB", downloads: 234, description: "Complete chapter-wise notes covering Laplace Transform, Z-Transform, and applications in engineering problems. Includes solved examples and PYQ solutions.", pages: 48 },
  n2: { id: "n2", subject: "CS", title: "Data Structures and Algorithms - Full Course", uploader: "arjun_mech22", college: "IIT Delhi", year: "2nd Year", fileSize: "8.1 MB", downloads: 891, description: "Comprehensive DSA notes covering arrays, linked lists, trees, graphs, sorting, and dynamic programming. Each topic has complexity analysis and coding examples.", pages: 124 },
};

export default function NoteDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const note = SAMPLE_NOTES_DATA[id] || SAMPLE_NOTES_DATA["n1"];

  const handleDownload = () => {
    Alert.alert("Download", "Notes would download in the full version with Supabase storage integration.");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Note Details</Text>
        <TouchableOpacity onPress={handleDownload}>
          <Feather name="download" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.fileIconLarge, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="file-text" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.noteTitle, { color: colors.foreground }]}>{note.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>{note.subject}</Text>
            </View>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{note.year}</Text>
          </View>
        </View>
        <View style={[styles.stats, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "Pages", value: note.pages?.toString() || "N/A", icon: "book" },
            { label: "Size", value: note.fileSize, icon: "hard-drive" },
            { label: "Downloads", value: note.downloads.toString(), icon: "download" },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Feather name={s.icon as any} size={18} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Description</Text>
        <Text style={[styles.description, { color: colors.foreground }]}>{note.description}</Text>
        <Text style={[styles.uploaderText, { color: colors.mutedForeground }]}>Uploaded by <Text style={{ color: colors.primary }}>@{note.uploader}</Text> · {note.college}</Text>
        <TouchableOpacity onPress={handleDownload} style={[styles.downloadBtn, { backgroundColor: colors.primary }]}>
          <Feather name="download" size={20} color="#FFFFFF" />
          <Text style={styles.downloadText}>Download Notes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 20, alignItems: "center", gap: 12, marginBottom: 16 },
  fileIconLarge: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  noteTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 24 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  stats: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  description: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 16 },
  uploaderText: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 24 },
  downloadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 12, height: 52 },
  downloadText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
