import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";
import type { PostTag } from "@/context/PostsContext";

const TAGS: PostTag[] = ["General", "Academic", "Campus Life", "Rant", "Advice", "Meme", "Question", "Achievement", "Event", "Confession"];

export default function CreatePostScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { createPost } = usePosts();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [tag, setTag] = useState<PostTag>("General");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    setLoading(true);
    await createPost({
      authorId: user.id,
      authorUsername: user.username,
      college: user.college,
      isAnonymous,
      tag,
      content: content.trim(),
      mediaUrl: null,
    });
    setLoading(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>New Post</Text>
          <AppButton title="Post" onPress={handlePost} loading={loading} disabled={!content.trim()} size="sm" />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Anonymous toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.anonIcon, { backgroundColor: isAnonymous ? colors.primary + "20" : colors.muted }]}>
              <Feather name={isAnonymous ? "user-x" : "user"} size={16} color={isAnonymous ? colors.primary : colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Post anonymously</Text>
              <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
                {isAnonymous ? "Your identity is hidden" : `Posting as @${user?.username}`}
              </Text>
            </View>
            <Switch value={isAnonymous} onValueChange={setIsAnonymous} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
          </View>

          {/* Tag selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Tag</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsRow}>
              {TAGS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTag(t)}
                  style={[styles.tagChip, { backgroundColor: tag === t ? colors.primary : colors.card, borderColor: tag === t ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.tagChipText, { color: tag === t ? "#FFFFFF" : colors.foreground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Content input */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind? Share anonymously with your campus..."
            placeholderTextColor={colors.placeholder}
            multiline
            style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.background }]}
            autoFocus
            maxLength={500}
          />

          <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{content.length}/500</Text>

          {/* Tips */}
          <View style={[styles.tips, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsTitle, { color: colors.mutedForeground }]}>Community Guidelines</Text>
            <Text style={[styles.tipsText, { color: colors.mutedForeground }]}>Be respectful. No hate speech, personal attacks, or explicit content. Keep it college-relevant.</Text>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 1, marginBottom: 16 },
  cancelBtn: { padding: 4 },
  cancelText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  anonIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toggleTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toggleSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8 },
  tagsRow: { gap: 8, paddingRight: 16 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  tagChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  textInput: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, minHeight: 160, textAlignVertical: "top", paddingTop: 4 },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginBottom: 16 },
  tips: { borderRadius: 10, borderWidth: 1, padding: 12, gap: 4, marginBottom: 16 },
  tipsTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tipsText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
