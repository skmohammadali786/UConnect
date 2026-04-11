import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/Toast";
import type { PostTag, Draft } from "@/context/PostsContext";

const ND = Platform.OS !== "web";
const TAGS: PostTag[] = ["General", "Academic", "Campus Life", "Rant", "Advice", "Meme", "Question", "Achievement", "Event", "Confession"];
const TAG_COLORS: Record<string, string> = { General: "#6B7280", Academic: "#3B82F6", "Campus Life": "#8B5CF6", Rant: "#EF4444", Advice: "#F59E0B", Meme: "#EC4899", Question: "#06B6D4", Achievement: "#00A86B", Event: "#F97316", Confession: "#A855F7" };

function formatDraftAge(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h ago`;
  return `${Math.floor(ms / 86400_000)}d ago`;
}

export default function CreatePostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createPost, drafts, saveDraft, deleteDraft } = usePosts();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { showSuccess, showInfo } = useToast();
  const [content, setContent] = useState("");
  const [tag, setTag] = useState<PostTag>("General");
  const [isAnonymous, setIsAnonymous] = useState(settings.defaultAnonymous);
  const [loading, setLoading] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const draftsAnim = useRef(new Animated.Value(0)).current;
  const publishAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(draftsAnim, { toValue: showDrafts ? 1 : 0, duration: 220, useNativeDriver: ND }).start();
  }, [showDrafts]);

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    setLoading(true);
    Animated.sequence([
      Animated.spring(publishAnim, { toValue: 0.95, tension: 200, friction: 8, useNativeDriver: ND }),
      Animated.spring(publishAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: ND }),
    ]).start();
    await createPost({ authorId: user.id, authorUsername: user.username, college: user.college, isAnonymous, tag, content: content.trim(), mediaUrl: null });
    setLoading(false);
    showSuccess("Post published! 🎉", isAnonymous ? "Posted anonymously" : `Posted as @${user.username}`);
    router.back();
  };

  const handleSaveDraft = async () => {
    if (!content.trim()) return;
    await saveDraft({ content: content.trim(), tag, isAnonymous });
    showInfo("Draft saved", "You can come back to finish it anytime.");
    setContent("");
  };

  const handleLoadDraft = (draft: Draft) => {
    setContent(draft.content);
    setTag(draft.tag);
    setIsAnonymous(draft.isAnonymous);
    setShowDrafts(false);
    showInfo("Draft loaded", "Edit and post when you're ready.");
  };

  const handleDeleteDraft = async (id: string) => {
    await deleteDraft(id);
    showInfo("Draft deleted");
    if (drafts.length <= 1) setShowDrafts(false);
  };

  const tagColor = TAG_COLORS[tag] || colors.mutedForeground;
  const charsLeft = 500 - content.length;
  const charColor = charsLeft < 50 ? "#EF4444" : charsLeft < 100 ? "#F59E0B" : colors.mutedForeground;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, paddingTop: Platform.OS === "web" ? 67 : insets.top + 8 }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>New Post</Text>
          <Animated.View style={{ transform: [{ scale: publishAnim }] }}>
            <AppButton title="Post" onPress={handlePost} loading={loading} disabled={!content.trim()} size="sm" />
          </Animated.View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
          <View style={[styles.authorRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.anonIcon, { backgroundColor: isAnonymous ? colors.primary + "20" : colors.secondary }]}>
              <Feather name={isAnonymous ? "user-x" : "user"} size={16} color={isAnonymous ? colors.primary : colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.foreground }]}>
                {isAnonymous ? "Posting as Anonymous" : `@${user?.username}`}
              </Text>
              <Text style={[styles.authorSub, { color: colors.mutedForeground }]}>
                {isAnonymous ? "Your identity is hidden from everyone" : user?.college}
              </Text>
            </View>
            <View style={styles.toggleRow}>
              <Text style={[styles.anonLabel, { color: colors.mutedForeground }]}>Anon</Text>
              <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" ios_backgroundColor={colors.border} />
            </View>
          </View>

          <View style={styles.tagSection}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Tag</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {TAGS.map((t) => {
                const tc = TAG_COLORS[t];
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTag(t)}
                    style={[styles.tagChip, { backgroundColor: tag === t ? tc + "20" : colors.card, borderColor: tag === t ? tc : colors.border }]}
                  >
                    <Text style={[styles.tagChipText, { color: tag === t ? tc : colors.mutedForeground }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={[styles.activeTag, { backgroundColor: tagColor + "10", borderColor: tagColor + "30" }]}>
            <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
            <Text style={[styles.activeTagText, { color: tagColor }]}>#{tag}</Text>
          </View>

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind? Share with your campus..."
            placeholderTextColor={colors.placeholder}
            multiline
            style={[styles.textInput, { color: colors.foreground }]}
            autoFocus
            maxLength={500}
          />

          <View style={styles.metaRow}>
            <Text style={[styles.charCount, { color: charColor }]}>{charsLeft} left</Text>
            <View style={styles.metaActions}>
              {content.trim().length > 0 && (
                <TouchableOpacity onPress={handleSaveDraft} style={[styles.metaBtn, { borderColor: colors.border }]}>
                  <Feather name="save" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.metaBtnText, { color: colors.mutedForeground }]}>Save draft</Text>
                </TouchableOpacity>
              )}
              {drafts.length > 0 && (
                <TouchableOpacity onPress={() => setShowDrafts(!showDrafts)} style={[styles.metaBtn, { borderColor: showDrafts ? colors.primary + "60" : colors.border, backgroundColor: showDrafts ? colors.primary + "10" : undefined }]}>
                  <Feather name="file-text" size={14} color={showDrafts ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.metaBtnText, { color: showDrafts ? colors.primary : colors.mutedForeground }]}>Drafts ({drafts.length})</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {showDrafts && (
            <Animated.View style={{ opacity: draftsAnim, transform: [{ translateY: draftsAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
              <View style={[styles.draftsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.draftsPanelTitle, { color: colors.foreground }]}>Saved Drafts</Text>
                {drafts.map((d) => (
                  <View key={d.id} style={[styles.draftItem, { borderTopColor: colors.border }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => handleLoadDraft(d)}>
                      <View style={styles.draftMeta}>
                        <View style={[styles.draftTag, { backgroundColor: (TAG_COLORS[d.tag] || "#6B7280") + "20" }]}>
                          <Text style={[styles.draftTagText, { color: TAG_COLORS[d.tag] || "#6B7280" }]}>{d.tag}</Text>
                        </View>
                        <Text style={[styles.draftAge, { color: colors.mutedForeground }]}>{formatDraftAge(d.savedAt)}</Text>
                        {d.isAnonymous && <Feather name="user-x" size={11} color={colors.mutedForeground} />}
                      </View>
                      <Text style={[styles.draftContent, { color: colors.foreground }]} numberOfLines={2}>{d.content}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteDraft(d.id)} style={styles.draftDeleteBtn}>
                      <Feather name="trash-2" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          <View style={[styles.tips, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Community Guidelines</Text>
              <Text style={[styles.tipsText, { color: colors.mutedForeground }]}>Be respectful. No hate speech, personal attacks, or explicit content. Keep it college-relevant.</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, marginBottom: 14 },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 18 },
  anonIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  authorSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  anonLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  tagSection: { marginBottom: 10, gap: 8 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  tagChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  activeTag: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14, alignSelf: "flex-start" },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  activeTagText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  textInput: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 26, minHeight: 160, textAlignVertical: "top", paddingTop: 0, marginBottom: 10 },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  charCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  metaActions: { flexDirection: "row", gap: 8 },
  metaBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  metaBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  draftsPanel: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  draftsPanelTitle: { fontSize: 13, fontFamily: "Inter_700Bold", padding: 12, paddingBottom: 10 },
  draftItem: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, padding: 12 },
  draftMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  draftTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  draftTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  draftAge: { fontSize: 11, fontFamily: "Inter_400Regular" },
  draftContent: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  draftDeleteBtn: { padding: 6 },
  tips: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  tipsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  tipsText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
