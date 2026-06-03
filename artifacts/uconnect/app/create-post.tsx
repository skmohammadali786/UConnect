import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/Toast";
import { useGhostMode } from "@/context/GhostModeContext";
import { recordAttempt, formatLockTime } from "@/utils/rateLimit";
import { isRemoteUri, uploadMediaUriToR2, uploadVideoUriToGumlet } from "@/utils/r2Upload";
import type { PostTag, Draft } from "@/context/PostsContext";

const ND = Platform.OS !== "web";
const TAGS: PostTag[] = ["General", "Academic", "Campus Life", "Rant", "Advice", "Meme", "Question", "Achievement", "Event", "Confession"];
const TAG_COLORS: Record<string, string> = { General: "#6B7280", Academic: "#3B82F6", "Campus Life": "#8B5CF6", Rant: "#EF4444", Advice: "#F59E0B", Meme: "#EC4899", Question: "#06B6D4", Achievement: "#00A86B", Event: "#F97316", Confession: "#A855F7" };
const MAX_VIDEO_DURATION_SECONDS = 30;
const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_SECONDS * 1000;

const AUTO_DELETE_OPTIONS = [
  { label: "Never", value: "never" },
  { label: "1 hour", value: "1h" },
  { label: "6 hours", value: "6h" },
  { label: "24 hours", value: "24h" },
  { label: "3 days", value: "3d" },
  { label: "7 days", value: "7d" },
];

function getAutoDeleteMs(value: string): number | null {
  const map: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "3d": 3 * 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
  };
  return map[value] ?? null;
}

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
  const { isGhostActive, session } = useGhostMode();
  const { showSuccess, showInfo, showError } = useToast();
  const [content, setContent] = useState("");
  const [presetTag, setPresetTag] = useState<PostTag>("General");
  const [customTag, setCustomTag] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(settings.defaultAnonymous);
  const [anonymousTouched, setAnonymousTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showAutoDelete, setShowAutoDelete] = useState(false);
  const [autoDelete, setAutoDelete] = useState("never");
  const [mediaUris, setMediaUris] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ fileType?: string; fileName?: string } | null>(null);
  const canPostAnonymously = Boolean(user?.isVerified);

  const draftsAnim = useRef(new Animated.Value(0)).current;
  const autoDeleteAnim = useRef(new Animated.Value(0)).current;
  const publishAnim = useRef(new Animated.Value(1)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 280, useNativeDriver: ND }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!anonymousTouched) {
      setIsAnonymous(settings.defaultAnonymous);
    }
  }, [settings.defaultAnonymous, anonymousTouched]);

  useEffect(() => {
    Animated.spring(draftsAnim, { toValue: showDrafts ? 1 : 0, tension: 120, friction: 14, useNativeDriver: ND }).start();
  }, [showDrafts]);

  useEffect(() => {
    Animated.spring(autoDeleteAnim, { toValue: showAutoDelete ? 1 : 0, tension: 120, friction: 14, useNativeDriver: ND }).start();
  }, [showAutoDelete]);

  const handlePickPhoto = async () => {
    if (mediaUris.length >= 3) { showInfo("Max 3 photos", "Remove a photo to add another."); return; }
    if (Platform.OS === "web") { showInfo("Photo upload", "Photo picking works best on the mobile app."); return; }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { showError("Permission denied", "Allow photo access in Settings."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 3 - mediaUris.length,
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const uris = result.assets
          .map((a) => (a.base64 ? `data:${a.mimeType || "image/jpeg"};base64,${a.base64}` : a.uri))
          .slice(0, 3 - mediaUris.length);
        setMediaUris((prev) => [...prev, ...uris].slice(0, 3));
        showSuccess(`${uris.length} photo${uris.length > 1 ? "s" : ""} added`);
      }
    } catch { showError("Failed", "Could not pick photo. Try again."); }
  };

  const handlePickVideo = async () => {
    if (videoUri) { showInfo("Video attached", "Remove the current video to pick a new one."); return; }
    if (Platform.OS === "web") { showInfo("Video upload", "Video picking works best on the mobile app."); return; }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") { showError("Permission denied", "Allow photo access in Settings."); return; }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.duration && asset.duration > MAX_VIDEO_DURATION_MS) { showError("Video too long", "Videos must be 30 seconds or less."); return; }
        setVideoUri(asset.uri);
        setVideoMeta({ fileType: asset.mimeType ?? undefined, fileName: asset.fileName ?? undefined });
        showSuccess("Video added", "Up to 30 seconds.");
      }
    } catch { showError("Failed", "Could not pick video. Try again."); }
  };

  const handlePost = async () => {
    if (!content.trim() || !user) return;
    if (isAnonymous && !isGhostActive && !canPostAnonymously) {
      showInfo("Verification required", "Verify your profile to post anonymously.");
      return;
    }

    const rl = await recordAttempt(`post_create_${user.id}`, 10, 60 * 60 * 1000, 0);
    if (!rl.allowed) {
      showError("Posting too fast", `You've reached the limit. Try again in ${formatLockTime(rl.secondsLeft || 3600)}.`);
      return;
    }

    setLoading(true);
    Animated.sequence([
      Animated.spring(publishAnim, { toValue: 0.92, tension: 300, friction: 6, useNativeDriver: ND }),
      Animated.spring(publishAnim, { toValue: 1, tension: 200, friction: 8, useNativeDriver: ND }),
    ]).start();

    try {
      const deleteMs = getAutoDeleteMs(autoDelete);
      const autoDeleteAt = deleteMs ? new Date(Date.now() + deleteMs).toISOString() : undefined;

      const uploadedMedia = await Promise.all(
        mediaUris.map(async (uri) => {
          if (isRemoteUri(uri)) return uri;
          const result = await uploadMediaUriToR2(uri, { kind: "image" });
          return result.publicUrl;
        }),
      );

      let finalVideoUrl: string | null = null;
      let videoProvider: "r2" | "gumlet" | undefined;
      let videoAssetId: string | null = null;

      if (videoUri) {
        if (isRemoteUri(videoUri)) {
          finalVideoUrl = videoUri;
          videoProvider = "gumlet";
        } else {
          const uploadedVideo = await uploadVideoUriToGumlet(videoUri, {
            fileType: videoMeta?.fileType,
            fileName: videoMeta?.fileName,
          });
          finalVideoUrl = uploadedVideo.publicUrl;
          videoProvider = "gumlet";
          videoAssetId = uploadedVideo.assetId;
        }
      }

      await createPost({
        authorId: user.id,
        authorUsername: isGhostActive && session ? session.alias : user.username,
        authorAvatar: isGhostActive || isAnonymous ? null : (user.avatar || null),
        college: user.college,
        isAnonymous: isGhostActive ? false : isAnonymous,
        tag: activeTag,
        content: content.trim(),
        mediaUrls: uploadedMedia,
        videoUrl: finalVideoUrl,
        videoProvider,
        videoAssetId,
        autoDeleteAt,
      });
      showSuccess("Post published!", isGhostActive && session ? `Posted as ${session.alias}` : isAnonymous ? "Posted anonymously" : `Posted as @${user.username}`);
      router.back();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not publish your post. Please try again.";
      showError("Upload failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!content.trim()) return;
    await saveDraft({ content: content.trim(), tag: activeTag, isAnonymous });
    showInfo("Draft saved", "You can come back to finish it anytime.");
    setContent("");
  };

  const handleLoadDraft = (draft: Draft) => {
    setContent(draft.content);
    const isPreset = TAGS.includes(draft.tag);
    setPresetTag(isPreset ? draft.tag : "General");
    setCustomTag(isPreset ? "" : draft.tag);
    setIsAnonymous(draft.isAnonymous);
    setShowDrafts(false);
    showInfo("Draft loaded", "Edit and post when you're ready.");
  };

  const handleDeleteDraft = async (id: string) => {
    await deleteDraft(id);
    showInfo("Draft deleted");
    if (drafts.length <= 1) setShowDrafts(false);
  };

  const trimmedCustomTag = customTag.trim().replace(/^#+/, "");
  const activeTag = trimmedCustomTag ? trimmedCustomTag : presetTag;
  const tagColor = TAG_COLORS[activeTag] || colors.mutedForeground;
  const charsLeft = 500 - content.length;
  const charColor = charsLeft < 50 ? "#EF4444" : charsLeft < 100 ? "#F59E0B" : colors.mutedForeground;
  const selectedDeleteOption = AUTO_DELETE_OPTIONS.find((o) => o.value === autoDelete);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.View style={{ flex: 1, paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, opacity: headerAnim }}>
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
            {!isAnonymous && user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.authorAvatar} />
            ) : (
              <View style={[styles.anonIcon, { backgroundColor: isAnonymous ? colors.primary + "20" : colors.secondary }]}>
                <Feather name={isAnonymous ? "user-x" : "user"} size={16} color={isAnonymous ? colors.primary : colors.mutedForeground} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.authorName, { color: colors.foreground }]}>
                {isGhostActive && session ? `Posting as ${session.alias}` : isAnonymous ? "Posting as Anonymous" : `@${user?.username}`}
              </Text>
              <Text style={[styles.authorSub, { color: colors.mutedForeground }]}>
                {isGhostActive ? "Ghost identity snapshot will be permanent" : isAnonymous ? "Your identity is hidden" : user?.college}
              </Text>
            </View>
            <View style={styles.toggleRow}>
              <Text style={[styles.anonLabel, { color: colors.mutedForeground }]}>Anon</Text>
              <Switch
                value={isAnonymous}
                onValueChange={(value) => {
                  if (value && !canPostAnonymously) {
                    showInfo("Verification required", "Verify your profile to post anonymously.");
                    return;
                  }
                  setAnonymousTouched(true);
                  setIsAnonymous(value);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFF"
                ios_backgroundColor={colors.border}
              />
            </View>
          </View>
          {!canPostAnonymously && (
            <View style={[styles.verifyNotice, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
              <Feather name="shield" size={14} color={colors.primary} />
              <Text style={[styles.verifyNoticeText, { color: colors.mutedForeground }]}>
                Anonymous posting is available after profile verification.
              </Text>
            </View>
          )}

          <View style={styles.tagSection}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>TAG</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
              {TAGS.map((t) => {
                const tc = TAG_COLORS[t];
                const isActive = presetTag === t && !customTag.trim();
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => { setPresetTag(t); setCustomTag(""); }}
                    style={[styles.tagChip, { backgroundColor: isActive ? tc + "20" : colors.card, borderColor: isActive ? tc : colors.border }]}
                  >
                    <Text style={[styles.tagChipText, { color: isActive ? tc : colors.mutedForeground }]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={[styles.customTagRow, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="edit-2" size={14} color={colors.mutedForeground} />
              <TextInput
                value={customTag}
                onChangeText={(value) => setCustomTag(value.replace(/\s{2,}/g, " "))}
                onBlur={() => setCustomTag((value) => value.trim().replace(/^#+/, "").replace(/\s{2,}/g, " "))}
                placeholder="Custom tag (optional)"
                placeholderTextColor={colors.placeholder}
                style={[styles.customTagInput, { color: colors.foreground }]}
                autoCapitalize="words"
                maxLength={28}
              />
            </View>
          </View>

          <View style={[styles.activeTag, { backgroundColor: tagColor + "10", borderColor: tagColor + "30" }]}>
            <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
            <Text style={[styles.activeTagText, { color: tagColor }]}>#{activeTag}</Text>
          </View>

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={"What's on your mind? Use #hashtags to tag topics..."}
            placeholderTextColor={colors.placeholder}
            multiline
            style={[styles.textInput, { color: colors.foreground }]}
            autoFocus
            maxLength={500}
          />

          {(mediaUris.length > 0 || videoUri) && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaPreviewRow} contentContainerStyle={{ gap: 10 }}>
              {mediaUris.map((uri, i) => (
                <View key={i} style={[styles.mediaPreviewWrap, { backgroundColor: colors.secondary }]}>
                  <Image source={{ uri }} style={styles.mediaPreviewImg} resizeMode="contain" />
                  <TouchableOpacity onPress={() => setMediaUris((prev) => prev.filter((_, idx) => idx !== i))} style={styles.removeMediaBtn}>
                    <Feather name="x" size={11} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
              {videoUri && (
                <View style={[styles.mediaPreviewWrap, styles.videoPreviewWrap, { backgroundColor: colors.secondary }]}>
                  <Feather name="video" size={24} color={colors.primary} />
                  <Text style={[styles.videoPreviewText, { color: colors.mutedForeground }]}>Video</Text>
                  <TouchableOpacity onPress={() => { setVideoUri(null); setVideoMeta(null); }} style={styles.removeMediaBtn}>
                    <Feather name="x" size={11} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          <View style={[styles.mediaActionsRow, { borderColor: colors.border }]}>
            <TouchableOpacity onPress={handlePickPhoto} disabled={mediaUris.length >= 3} style={[styles.mediaBtn, { opacity: mediaUris.length >= 3 ? 0.4 : 1 }]}>
              <Feather name="image" size={16} color={colors.primary} />
              <Text style={[styles.mediaBtnText, { color: colors.primary }]}>Photo ({mediaUris.length}/3)</Text>
            </TouchableOpacity>
            <View style={[styles.mediaDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity onPress={handlePickVideo} disabled={!!videoUri} style={[styles.mediaBtn, { opacity: videoUri ? 0.4 : 1 }]}>
              <Feather name="video" size={16} color={colors.primary} />
              <Text style={[styles.mediaBtnText, { color: colors.primary }]}>{videoUri ? "Video added" : "Video (≤30s)"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.charCount, { color: charColor }]}>{charsLeft} left</Text>
            <View style={styles.metaActions}>
              {content.trim().length > 0 && (
                <TouchableOpacity onPress={handleSaveDraft} style={[styles.metaBtn, { borderColor: colors.border }]}>
                  <Feather name="save" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.metaBtnText, { color: colors.mutedForeground }]}>Draft</Text>
                </TouchableOpacity>
              )}
              {drafts.length > 0 && (
                <TouchableOpacity onPress={() => setShowDrafts(!showDrafts)} style={[styles.metaBtn, { borderColor: showDrafts ? colors.primary + "60" : colors.border, backgroundColor: showDrafts ? colors.primary + "10" : undefined }]}>
                  <Feather name="file-text" size={14} color={showDrafts ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.metaBtnText, { color: showDrafts ? colors.primary : colors.mutedForeground }]}>Drafts ({drafts.length})</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setShowAutoDelete(!showAutoDelete)} style={[styles.metaBtn, { borderColor: autoDelete !== "never" ? colors.primary + "60" : colors.border, backgroundColor: autoDelete !== "never" ? colors.primary + "10" : undefined }]}>
                <Feather name={autoDelete !== "never" ? "clock" : "bookmark"} size={14} color={autoDelete !== "never" ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.metaBtnText, { color: autoDelete !== "never" ? colors.primary : colors.mutedForeground }]}>
                  {autoDelete !== "never" ? selectedDeleteOption?.label : "Keep forever"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {showAutoDelete && (
            <Animated.View style={{ opacity: autoDeleteAnim, transform: [{ translateY: autoDeleteAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
              <View style={[styles.autoDeletePanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.autoDeleteHeader}>
                  <Feather name="clock" size={15} color={colors.primary} />
                  <Text style={[styles.autoDeleteTitle, { color: colors.foreground }]}>Auto-delete after</Text>
                </View>
                <View style={styles.autoDeleteChips}>
                  {AUTO_DELETE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => { setAutoDelete(opt.value); setShowAutoDelete(false); }}
                      style={[
                        styles.autoDeleteChip,
                        {
                          backgroundColor: autoDelete === opt.value ? colors.primary : colors.secondary,
                          borderColor: autoDelete === opt.value ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.autoDeleteChipText, { color: autoDelete === opt.value ? "#FFF" : colors.foreground }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[styles.autoDeleteNote, { color: autoDelete === "never" ? colors.primary : colors.mutedForeground }]}>
                  {autoDelete === "never"
                    ? "This post will stay up permanently"
                    : `This post will disappear ${selectedDeleteOption?.label} after posting`}
                </Text>
              </View>
            </Animated.View>
          )}

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
            <Feather name="hash" size={14} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Tip: Use hashtags</Text>
              <Text style={[styles.tipsText, { color: colors.mutedForeground }]}>Add #hashtags in your post to help people find it. e.g. #placement #iitdelhi #coding</Text>
            </View>
          </View>

          <View style={[styles.tips, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Community Guidelines</Text>
              <Text style={[styles.tipsText, { color: colors.mutedForeground }]}>Be respectful. No hate speech or explicit content. Keep it college-relevant.</Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
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
  authorAvatar: { width: 40, height: 40, borderRadius: 12 },
  authorName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  authorSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  anonLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  verifyNotice: { marginTop: -8, marginBottom: 16, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  verifyNoticeText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
  tagSection: { marginBottom: 10, gap: 8 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  tagChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  customTagRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  customTagInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  activeTag: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 14, alignSelf: "flex-start" },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  activeTagText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  textInput: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 26, minHeight: 140, textAlignVertical: "top", paddingTop: 0, marginBottom: 10 },
  mediaPreviewRow: { marginBottom: 12 },
  mediaPreviewWrap: { position: "relative", width: 90, height: 90, borderRadius: 10, overflow: "hidden" },
  mediaPreviewImg: { width: 90, height: 90 },
  videoPreviewWrap: { alignItems: "center", justifyContent: "center", gap: 4 },
  videoPreviewText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  removeMediaBtn: { position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" },
  mediaActionsRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, marginBottom: 14, overflow: "hidden" },
  mediaBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 11 },
  mediaBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  mediaDivider: { width: 1, height: "100%" },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  charCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  metaActions: { flexDirection: "row", gap: 8 },
  metaBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  metaBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  autoDeletePanel: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14, gap: 10 },
  autoDeleteHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  autoDeleteTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  autoDeleteChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  autoDeleteChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  autoDeleteChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  autoDeleteNote: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  draftsPanel: { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 14 },
  draftsPanelTitle: { fontSize: 13, fontFamily: "Inter_700Bold", padding: 12, paddingBottom: 10 },
  draftItem: { flexDirection: "row", alignItems: "center", gap: 8, borderTopWidth: 1, padding: 12 },
  draftMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  draftTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  draftTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  draftAge: { fontSize: 11, fontFamily: "Inter_400Regular" },
  draftContent: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  draftDeleteBtn: { padding: 6 },
  tips: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 14, gap: 12 },
  tipsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  tipsText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
