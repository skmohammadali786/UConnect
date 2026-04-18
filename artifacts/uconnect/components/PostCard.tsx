import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as ExpoLinking from "expo-linking";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking as RNLinking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Post } from "@/context/PostsContext";
import { usePosts } from "@/context/PostsContext";
import { useSocial } from "@/context/SocialContext";
import { ReportModal } from "@/components/ReportModal";
import { ConfirmModal } from "@/components/ConfirmModal";
import { formatRelativeTime } from "@/utils/time";

const ND = Platform.OS !== "web";

const TAG_COLORS: Record<string, string> = {
  General: "#6B7280",
  Academic: "#3B82F6",
  "Campus Life": "#8B5CF6",
  Rant: "#EF4444",
  Advice: "#F59E0B",
  Meme: "#EC4899",
  Question: "#06B6D4",
  Achievement: "#00A86B",
  Event: "#F97316",
  Confession: "#A855F7",
};

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onDelete?: (postId: string) => void;
  index?: number;
}

function renderHashtags(content: string, primaryColor: string, foregroundColor: string) {
  const parts = content.split(/(#[a-zA-Z][a-zA-Z0-9_]*)/g);
  return parts.map((part, i) => {
    if (/^#[a-zA-Z][a-zA-Z0-9_]*$/.test(part)) {
      return (
        <Text key={i} style={{ color: primaryColor, fontFamily: "Inter_600SemiBold" }}>
          {part}
        </Text>
      );
    }
    return (
      <Text key={i} style={{ color: foregroundColor, fontFamily: "Inter_400Regular" }}>
        {part}
      </Text>
    );
  });
}

export function PostCard({ post, currentUserId, onDelete, index = 0 }: PostCardProps) {
  const colors = useColors();
  const { votePost, bookmarkPost, toggleRepost, hasReposted } = usePosts();
  const { hasReported } = useSocial();
  const [reportVisible, setReportVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [shareOptionsVisible, setShareOptionsVisible] = useState(false);
  const [activeMedia, setActiveMedia] = useState<{ type: "image" | "video"; uri: string } | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const upAnim = useRef(new Animated.Value(1)).current;
  const downAnim = useRef(new Animated.Value(1)).current;
  const bookmarkAnim = useRef(new Animated.Value(1)).current;
  const deleteAnim = useRef(new Animated.Value(1)).current;

  const pulse = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.45, useNativeDriver: false, tension: 300, friction: 4 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: false, tension: 200, friction: 6 }),
    ]).start();
  };

  const handleVote = (vote: "up" | "down") => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pulse(vote === "up" ? upAnim : downAnim);
    votePost(post.id, vote);
  };

  const handleBookmark = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pulse(bookmarkAnim);
    bookmarkPost(post.id);
  };

  const handleDelete = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pulse(deleteAnim);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = () => {
    setDeleteConfirmVisible(false);
    setTimeout(() => onDelete?.(post.id), 120);
  };

  const openImage = (uri: string) => {
    setActiveMedia({ type: "image", uri });
    setMediaViewerVisible(true);
  };

  const getPostLink = () => ExpoLinking.createURL(`/post/${post.id}`);

  const resolveVideoUri = async (uri: string) => {
    if (uri.startsWith("data:video/")) {
      const base64Index = uri.indexOf("base64,");
      if (base64Index > -1 && FileSystem.cacheDirectory) {
        const base64 = uri.slice(base64Index + "base64,".length);
        const filePath = `${FileSystem.cacheDirectory}uconnect-video-${post.id}.mp4`;
        await FileSystem.writeAsStringAsync(filePath, base64, { encoding: "base64" });
        return filePath;
      }
    }
    return uri;
  };

  const openVideo = async () => {
    if (!post.videoUrl) return;
    try {
      const targetUri = await resolveVideoUri(post.videoUrl);
      const canOpen = await RNLinking.canOpenURL(targetUri);
      if (canOpen) {
        await RNLinking.openURL(targetUri);
      } else {
        setActiveMedia({ type: "video", uri: post.videoUrl });
        setMediaViewerVisible(true);
      }
      return;
    } catch {
      setActiveMedia({ type: "video", uri: post.videoUrl });
      setMediaViewerVisible(true);
    }
  };

  const handleOpenVideoExternally = async () => {
    if (!activeMedia?.uri) return;
    const targetUri = await resolveVideoUri(activeMedia.uri);
    const can = await RNLinking.canOpenURL(targetUri);
    if (can) {
      await RNLinking.openURL(targetUri);
      setMediaViewerVisible(false);
    }
  };

  const handleCopyPostLink = async () => {
    await Clipboard.setStringAsync(getPostLink());
    setShareOptionsVisible(false);
  };

  const handleToggleRepost = async () => {
    await toggleRepost(post.id);
    setShareOptionsVisible(false);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: false, tension: 280, friction: 10 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: false, tension: 200, friction: 10 }).start();
  };

  const handlePress = () => {
    router.push({ pathname: "/post/[id]" as any, params: { id: post.id } });
  };

  const handleAuthorPress = () => {
    if (!post.isAnonymous && post.authorUsername) {
      router.push({ pathname: "/user/[username]" as any, params: { username: post.authorUsername } });
    }
  };

  const tagColor = TAG_COLORS[post.tag] || colors.mutedForeground;
  const isOwner = post.authorId === currentUserId;
  const reported = hasReported(post.id);
  const initials = post.authorUsername?.charAt(0)?.toUpperCase() || "U";
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
  const hasVideo = !!post.videoUrl;
  const isReposted = hasReposted(post.id);

  const autoDeleteLabel = post.autoDeleteAt ? (() => {
    const diff = new Date(post.autoDeleteAt).getTime() - Date.now();
    if (diff < 0) return null;
    const h = Math.ceil(diff / 3600000);
    if (h < 24) return `${h}h`;
    return `${Math.ceil(h / 24)}d`;
  })() : null;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: colors.radius,
            padding: 16,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            onPress={handleAuthorPress}
            disabled={post.isAnonymous}
            activeOpacity={0.7}
            style={styles.authorRow}
          >
            {post.isAnonymous ? (
              <View style={[styles.avatarWrap, { backgroundColor: colors.muted }]}>
                <Feather name="user-x" size={14} color={colors.mutedForeground} />
              </View>
            ) : post.authorAvatar ? (
              <Image source={{ uri: post.authorAvatar }} style={[styles.avatarWrap, styles.avatarImg]} />
            ) : (
              <View style={[styles.avatarWrap, { backgroundColor: colors.primary + "22" }]}>
                <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initials}</Text>
              </View>
            )}
            <View>
              <Text style={[styles.username, { color: post.isAnonymous ? colors.mutedForeground : colors.foreground }]}>
                {post.isAnonymous ? "Anonymous" : `@${post.authorUsername}`}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {post.college} · {formatRelativeTime(post.createdAt)}
                {autoDeleteLabel ? ` · ⏱ ${autoDeleteLabel}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.tag, { backgroundColor: tagColor + "20" }]}>
            <Text style={[styles.tagText, { color: tagColor }]}>{post.tag}</Text>
          </View>
        </View>

        {post.repostedByUsername ? (
          <View style={[styles.repostedBadge, { backgroundColor: colors.secondary }]}>
            <Feather name="repeat" size={12} color={colors.mutedForeground} />
            <Text style={[styles.repostedBadgeText, { color: colors.mutedForeground }]}>
              Reposted by @{post.repostedByUsername}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.content, { color: colors.foreground }]} numberOfLines={5}>
          {renderHashtags(post.content, colors.primary, colors.foreground)}
        </Text>

        {hasMedia && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow} contentContainerStyle={{ gap: 8 }}>
            {post.mediaUrls.map((uri, i) => (
              <TouchableOpacity
                key={i}
                onPress={(e) => { e.stopPropagation(); openImage(uri); }}
                activeOpacity={0.9}
              >
                <Image source={{ uri }} style={[styles.mediaThumb, post.mediaUrls.length === 1 && styles.mediaThumbSingle]} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {hasVideo && (
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); openVideo(); }}
            activeOpacity={0.85}
            style={[styles.videoThumb, { backgroundColor: colors.secondary }]}
          >
            <View style={[styles.playBtn, { backgroundColor: colors.primary }]}>
              <Feather name="play" size={18} color="#FFF" />
            </View>
            <Text style={[styles.videoLabel, { color: colors.mutedForeground }]}>Video attached</Text>
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          <View style={styles.voteRow}>
            <TouchableOpacity onPress={() => handleVote("up")} style={[styles.voteBtn, post.userVote === "up" && { backgroundColor: colors.primary + "20" }]}>
              <Animated.View style={{ transform: [{ scale: upAnim }] }}>
                <Feather name="arrow-up" size={16} color={post.userVote === "up" ? colors.primary : colors.mutedForeground} />
              </Animated.View>
              <Text style={[styles.voteCount, { color: post.userVote === "up" ? colors.primary : colors.mutedForeground }]}>{post.upvotes}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleVote("down")} style={[styles.voteBtn, post.userVote === "down" && { backgroundColor: "#EF444420" }]}>
              <Animated.View style={{ transform: [{ scale: downAnim }] }}>
                <Feather name="arrow-down" size={16} color={post.userVote === "down" ? "#EF4444" : colors.mutedForeground} />
              </Animated.View>
              <Text style={[styles.voteCount, { color: post.userVote === "down" ? "#EF4444" : colors.mutedForeground }]}>{post.downvotes}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handlePress} style={styles.actionBtn}>
            <Feather name="message-circle" size={16} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{post.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBookmark} style={styles.actionBtn}>
            <Animated.View style={{ transform: [{ scale: bookmarkAnim }] }}>
              <Feather name="bookmark" size={16} color={post.isBookmarked ? colors.primary : colors.mutedForeground} />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => toggleRepost(post.id)} style={styles.actionBtn}>
            <Feather name="repeat" size={16} color={isReposted ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.actionText, { color: isReposted ? colors.primary : colors.mutedForeground }]}>{post.repostCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShareOptionsVisible(true)} style={styles.actionBtn}>
            <Feather name="share-2" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {isOwner ? (
            <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
              <Animated.View style={{ transform: [{ scale: deleteAnim }] }}>
                <Feather name="trash-2" size={16} color="#EF4444" />
              </Animated.View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setReportVisible(true)}
              style={[styles.actionBtn, { opacity: reported ? 0.4 : 1 }]}
              disabled={reported}
            >
              <Feather name="flag" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {reported && (
          <View style={[styles.reportedBanner, { backgroundColor: colors.secondary }]}>
            <Feather name="check-circle" size={12} color={colors.mutedForeground} />
            <Text style={[styles.reportedText, { color: colors.mutedForeground }]}>You reported this post</Text>
          </View>
        )}
      </TouchableOpacity>

      <ReportModal postId={post.id} visible={reportVisible} onClose={() => setReportVisible(false)} />
      <ConfirmModal
        visible={deleteConfirmVisible}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
      <Modal visible={mediaViewerVisible} transparent animationType="fade" onRequestClose={() => setMediaViewerVisible(false)}>
        <View style={[styles.mediaModalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity style={styles.mediaCloseBtn} onPress={() => setMediaViewerVisible(false)}>
            <Feather name="x" size={24} color="#FFF" />
          </TouchableOpacity>
          {activeMedia?.type === "image" ? (
            <Image source={{ uri: activeMedia.uri }} style={styles.mediaModalImage} resizeMode="contain" />
          ) : (
            <View style={[styles.videoModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="video" size={28} color={colors.primary} />
              <Text style={[styles.videoModalTitle, { color: colors.foreground }]}>Open video</Text>
              <TouchableOpacity onPress={handleOpenVideoExternally} style={[styles.videoOpenBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.videoOpenText}>Open Video</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
      <Modal visible={shareOptionsVisible} transparent animationType="fade" onRequestClose={() => setShareOptionsVisible(false)}>
        <View style={[styles.mediaModalOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity style={styles.mediaCloseBtn} onPress={() => setShareOptionsVisible(false)}>
            <Feather name="x" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={[styles.videoModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="share-2" size={28} color={colors.primary} />
            <Text style={[styles.videoModalTitle, { color: colors.foreground }]}>Share post</Text>
            <TouchableOpacity onPress={handleCopyPostLink} style={[styles.videoOpenBtn, { backgroundColor: colors.primary, width: "100%", alignItems: "center" }]}>
              <Text style={styles.videoOpenText}>Copy link</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleToggleRepost} style={[styles.videoOpenBtn, { backgroundColor: colors.secondary, width: "100%", alignItems: "center" }]}>
              <Text style={[styles.videoOpenText, { color: colors.foreground }]}>{isReposted ? "Remove repost" : "Repost"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    marginBottom: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { backgroundColor: "transparent" },
  avatarInitial: { fontSize: 15, fontFamily: "Inter_700Bold" },
  username: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  repostedBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  repostedBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  content: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  mediaRow: { marginBottom: 12 },
  mediaThumb: { width: 120, height: 120, borderRadius: 10 },
  mediaThumbSingle: { width: 240, height: 160 },
  videoThumb: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, padding: 14, marginBottom: 12 },
  playBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  videoLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  voteRow: { flexDirection: "row", alignItems: "center", gap: 2, flex: 1 },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  voteCount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 7,
    borderRadius: 8,
  },
  actionText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  reportedBanner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 10 },
  reportedText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  mediaModalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  mediaCloseBtn: { position: "absolute", right: 20, top: Platform.OS === "web" ? 30 : 54, zIndex: 5, padding: 8 },
  mediaModalImage: { width: "100%", height: "80%", borderRadius: 12 },
  videoModalCard: { width: "100%", maxWidth: 420, borderWidth: 1, borderRadius: 16, padding: 18, alignItems: "center", gap: 10 },
  videoModalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  videoOpenBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  videoOpenText: { color: "#FFF", fontSize: 13, fontFamily: "Inter_700Bold" },
});
