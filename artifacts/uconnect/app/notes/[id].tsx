import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";

const ND = Platform.OS !== "web";

const SUBJECT_COLORS: Record<string, string> = {
  CS: "#3B82F6", Mathematics: "#8B5CF6", Physics: "#06B6D4",
  Chemistry: "#EF4444", Electrical: "#F59E0B", Mechanical: "#F97316",
  Economics: "#00A86B",
};

export default function NoteDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showSuccess, showInfo } = useToast();
  const [downloadModal, setDownloadModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [note, setNote] = useState<any>(null);
  const [noteLoading, setNoteLoading] = useState(true);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) { setNoteLoading(false); return; }
    supabase.from("notes").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) setNote({ ...data, uploader: data.uploader_username, image_urls: data.image_urls ?? [] });
      setNoteLoading(false);
    });
  }, [id]);

  const subjectColor = SUBJECT_COLORS[note?.subject] || "#6B7280";

  const openDownloadModal = () => {
    setDownloadModal(true);
    setProgress(0);
    progressAnim.setValue(0);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: ND }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, useNativeDriver: ND }),
    ]).start();
  };

  const closeDownloadModal = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: ND }),
      Animated.timing(slideAnim, { toValue: 300, duration: 220, useNativeDriver: ND }),
    ]).start(() => { setDownloadModal(false); setDownloading(false); setProgress(0); });
  };

  const handleStartDownload = async () => {
    const downloadUrls = Array.from(
      new Set([note?.file_url, ...(note?.image_urls ?? [])].filter((url): url is string => Boolean(url))),
    );
    if (downloadUrls.length === 0) {
      showInfo("No downloadable file", "This note doesn't have a downloadable file yet.");
      return;
    }

    setDownloading(true);
    setProgress(0.3);
    Animated.timing(progressAnim, { toValue: 0.7, duration: 350, useNativeDriver: false }).start();

    try {
      let openedCount = 0;
      for (const url of downloadUrls) {
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) continue;
        await Linking.openURL(url);
        openedCount += 1;
      }
      if (openedCount === 0) throw new Error("Cannot open file URL");

      const { error: rpcError } = await supabase.rpc("increment_note_downloads", { p_note_id: note.id });
      const nextDownloads = (note.downloads ?? 0) + 1;
      if (rpcError) {
        await supabase.from("notes").update({ downloads: nextDownloads }).eq("id", note.id);
      }
      setNote((prev: any) => prev ? { ...prev, downloads: nextDownloads } : prev);

      setProgress(1);
      progressAnim.setValue(1);
      setTimeout(() => {
        closeDownloadModal();
        showSuccess("Download complete!", `${openedCount} attachment${openedCount === 1 ? "" : "s"} opened for ${note.title}`);
      }, 250);
    } catch {
      setDownloading(false);
      showInfo("Download failed", "Could not open this note file.");
    }
  };

  if (noteLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={subjectColor} />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 24 }]}>
        <Feather name="file" size={40} color={colors.mutedForeground} />
        <Text style={[{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", marginTop: 12, textAlign: "center" }]}>Note not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 10 }}>
          <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Note Details</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.fileIconLarge, { backgroundColor: subjectColor + "18" }]}>
            <Feather name="file-text" size={40} color={subjectColor} />
          </View>
          <Text style={[styles.noteTitle, { color: colors.foreground }]}>{note.title}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: subjectColor + "20" }]}>
              <Text style={[styles.badgeText, { color: subjectColor }]}>{note.subject}</Text>
            </View>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{note.year}</Text>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { label: "Type", value: (note.file_type || "pdf").toUpperCase(), icon: "file" },
            { label: "Saves", value: (note.saves ?? 0).toString(), icon: "bookmark" },
            { label: "Downloads", value: (note.downloads ?? 0).toString(), icon: "download" },
          ].map((s, i, arr) => (
            <React.Fragment key={s.label}>
              <View style={styles.statItem}>
                <Feather name={s.icon as any} size={18} color={subjectColor} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
        <Text style={[styles.description, { color: colors.foreground }]}>{note.description}</Text>

        {note.image_urls?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Note Images</Text>
            <View style={styles.imagesWrap}>
              {note.image_urls.map((uri: string, i: number) => (
                <TouchableOpacity key={`${uri}_${i}`} onPress={() => Linking.openURL(uri)} activeOpacity={0.9}>
                  <Image source={{ uri }} style={styles.noteImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {note.topics?.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Topics Covered</Text>
            <View style={styles.topicsWrap}>
              {note.topics.map((topic: string, i: number) => (
                <View key={i} style={[styles.topicChip, { backgroundColor: subjectColor + "15", borderColor: subjectColor + "30" }]}>
                  <Feather name="check" size={11} color={subjectColor} />
                  <Text style={[styles.topicText, { color: subjectColor }]}>{topic}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={[styles.uploaderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.uploaderAvatar, { backgroundColor: subjectColor + "20" }]}>
            <Text style={[styles.uploaderAvatarText, { color: subjectColor }]}>
              {note.uploader === "anonymous" ? "?" : note.uploader.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.uploaderName, { color: colors.foreground }]}>@{note.uploader}</Text>
            <Text style={[styles.uploaderCollege, { color: colors.mutedForeground }]}>{note.college}</Text>
          </View>
          <View style={[styles.verifiedPill, { backgroundColor: "#00A86B15", borderColor: "#00A86B30" }]}>
            <Feather name="check-circle" size={12} color="#00A86B" />
            <Text style={[styles.verifiedText, { color: "#00A86B" }]}>Verified</Text>
          </View>
        </View>

        <TouchableOpacity onPress={openDownloadModal} style={[styles.downloadBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.downloadBtnText}>Download Notes</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={downloadModal} transparent animationType="none" onRequestClose={closeDownloadModal}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={!downloading ? closeDownloadModal : undefined} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          <View style={[styles.sheetFileIcon, { backgroundColor: subjectColor + "18" }]}>
            <Feather name="file-text" size={32} color={subjectColor} />
          </View>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{note.title}</Text>
          <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>{note.fileSize} · {note.pages} pages · {note.subject}</Text>

          {!downloading ? (
            <>
              <View style={[styles.sheetInfoRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Feather name="shield" size={14} color={colors.primary} />
                <Text style={[styles.sheetInfoText, { color: colors.mutedForeground }]}>
                  Verified content · {note.downloads} students downloaded
                </Text>
              </View>

              <TouchableOpacity onPress={handleStartDownload} style={[styles.sheetDownloadBtn, { backgroundColor: colors.primary }]}>
                <Feather name="download" size={18} color="#FFF" />
                <Text style={styles.sheetDownloadBtnText}>Start Download</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={closeDownloadModal} style={[styles.sheetCancelBtn, { borderColor: colors.border }]}>
                <Text style={[styles.sheetCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.progressSection}>
              <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.primary }]}>
                Downloading... {Math.round(progress * 100)}%
              </Text>
              <Text style={[styles.progressSub, { color: colors.mutedForeground }]}>
                Preparing your file...
              </Text>
            </View>
          )}
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 24, alignItems: "center", gap: 12, marginBottom: 16 },
  fileIconLarge: { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  noteTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 25 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statsCard: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20, alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 36 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  description: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23, marginBottom: 20 },
  topicsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  topicChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  topicText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  imagesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  noteImage: { width: 108, height: 108, borderRadius: 10 },
  uploaderCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 20 },
  uploaderAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  uploaderAvatarText: { fontSize: 18, fontFamily: "Inter_700Bold" },
  uploaderName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  uploaderCollege: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  verifiedPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  downloadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, height: 56 },
  downloadBtnText: { color: "#FFFFFF", fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  backdrop: { backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 24, paddingBottom: 36, alignItems: "center", gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  sheetFileIcon: { width: 68, height: 68, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center" },
  sheetSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sheetInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, width: "100%" },
  sheetInfoText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  sheetDownloadBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, borderRadius: 14, width: "100%" },
  sheetDownloadBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
  sheetCancelBtn: { height: 48, borderRadius: 12, borderWidth: 1, width: "100%", alignItems: "center", justifyContent: "center" },
  sheetCancelText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  progressSection: { width: "100%", alignItems: "center", gap: 12, paddingVertical: 8 },
  progressTrack: { width: "100%", height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 4 },
  progressText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  progressSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
