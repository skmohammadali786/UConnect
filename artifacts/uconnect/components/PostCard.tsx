import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking as RNLinking,
  Modal,
  Platform,
  ScrollView,
  Share,
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
import { AuraRingAvatar } from "@/components/AuraRingAvatar";
import { formatRelativeTime } from "@/utils/time";
import { buildPostShareLink } from "@/utils/postLinks";

const URI_PROTOCOL_REGEX = /^[a-z][a-z0-9+.-]*:/i;


const GHOST_AVATARS = [
  { icon: "cloud-snow", bg: "#0B1020", border: "#7C3AED", fg: "#C4B5FD" },
  { icon: "moon", bg: "#111827", border: "#38BDF8", fg: "#BAE6FD" },
  { icon: "zap", bg: "#1E1B4B", border: "#F472B6", fg: "#FBCFE8" },
  { icon: "eye-off", bg: "#172554", border: "#22D3EE", fg: "#A5F3FC" },
  { icon: "hexagon", bg: "#2E1065", border: "#A78BFA", fg: "#E9D5FF" },
];

function ghostAvatarFor(seed: string) {
  const hash = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return GHOST_AVATARS[Math.abs(hash) % GHOST_AVATARS.length] ?? GHOST_AVATARS[0];
}

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

const OFFICIAL_UCONNECT_BADGE_COLOR = "#EE4B2B";
const DEFAULT_VERIFIED_BADGE_COLOR = "#16A34A";

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onDelete?: (postId: string) => void;
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

export function PostCard({ post, currentUserId, onDelete }: PostCardProps) {
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
  const isOfficialUconnectAuthor = post.authorUsername?.toLowerCase() === "uconnect";
  const verifiedBadgeColor = isOfficialUconnectAuthor ? OFFICIAL_UCONNECT_BADGE_COLOR : DEFAULT_VERIFIED_BADGE_COLOR;

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

  const getPostLink = () => buildPostShareLink(post.id);

  const resolveVideoUri = async (uri: string) => {
    if (uri.startsWith("data:video/")) {
      const base64Index = uri.indexOf("base64,");
      if (base64Index > -1 && FileSystem.cacheDirectory) {
        const base64 = uri.slice(base64Index + "base64,".length);
        const filePath = `${FileSystem.cacheDirectory}uconnect-video-${post.id}.mp4`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (!fileInfo.exists) {
          await FileSystem.writeAsStringAsync(filePath, base64, { encoding: "base64" });
        }
        return filePath;
      }
    }
    return uri;
  };

  const normalizePlayableUri = (uri: string) => {
    if (!uri) return uri;
    if (URI_PROTOCOL_REGEX.test(uri)) return uri;
    return `file://${uri}`;
  };

  const playVideoUri = async (uri: string) => {
    const targetUri = normalizePlayableUri(await resolveVideoUri(uri));
    if (!targetUri) return false;
    try {
      if (targetUri.startsWith("http://") || targetUri.startsWith("https://")) {
        await WebBrowser.openBrowserAsync(targetUri);
      } else {
        await RNLinking.openURL(targetUri);
      }
      return true;
    } catch {
      return false;
    }
  };

  const openVideo = async () => {
    if (!post.videoUrl) return;
    const opened = await playVideoUri(post.videoUrl);
    if (!opened) {
      setActiveMedia({ type: "video", uri: post.videoUrl });
      setMediaViewerVisible(true);
    }
  };

  const handleOpenVideoExternally = async () => {
    if (!activeMedia?.uri) return;
    const opened = await playVideoUri(activeMedia.uri);
    if (opened) {
      setMediaViewerVisible(false);
    }
  };

  const handleSharePostLink = async () => {
    const postLink = getPostLink();
    const message = `Check out this post on UConnect:\n${postLink}`;
    try {
      await Share.share({ title: "UConnect post", message, url: postLink });
    } catch {
      await Clipboard.setStringAsync(postLink);
    } finally {
      setShareOptionsVisible(false);
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
    if (!post.isAnonymous && !post.isGhost && post.authorUsername) {
      router.push({ pathname: "/user/[username]" as any, params: { username: post.authorUsername } });
    }
  };

  const tagColor = TAG_COLORS[post.tag] || colors.mutedForeground;
  const isOwner = post.authorId === currentUserId;
  const reported = hasReported(post.id);
  const initials = post.isGhost ? "👻" : post.authorUsername?.charAt(0)?.toUpperCase() || "U";
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
  const hasVideo = !!post.videoUrl;
  const isReposted = hasReposted(post.id);
  const auraRingColor = post.authorAuraRingColor || "#6366F1";
  const ghostAvatar = ghostAvatarFor(post.id || post.ghostAlias || post.authorUsername || "ghost");

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
            borderRadius: 22,
            padding: 15,
            shadowColor: colors.profileShadow ?? colors.shadow,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.1,
            shadowRadius: 22,
            elevation: 3,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <TouchableOpacity
            onPress={handleAuthorPress}
            disabled={post.isAnonymous || post.isGhost}
            activeOpacity={0.7}
            style={styles.authorRow}
          >
            {post.isGhost ? (
              <View style={[styles.avatarWrap, styles.ghostAvatarWrap, { backgroundColor: ghostAvatar.bg, borderColor: ghostAvatar.border }]}>
                <Feather name={ghostAvatar.icon as any} size={14} color={ghostAvatar.fg} />
                <Text style={styles.ghostAvatarText}>👻</Text>
              </View>
            ) : post.isAnonymous ? (
              <View style={[styles.avatarWrap, { backgroundColor: colors.muted, borderColor: "transparent" }]}>
                <Feather name="user-x" size={14} color={colors.mutedForeground} />
              </View>
            ) : (
              <AuraRingAvatar
                avatarUri={post.authorAvatar}
                initials={initials}
                ringValue={auraRingColor}
                size={36}
                ringWidth={2}
                textColor={colors.primary}
                textSize={15}
              />
            )}
            <View>
              <View style={styles.usernameRow}>
                <Text style={[styles.username, { color: post.isAnonymous ? colors.mutedForeground : colors.foreground }]}>
                  {post.isGhost ? post.ghostAlias || post.authorUsername : post.isAnonymous ? "Anonymous" : `@${post.authorUsername}`}
                </Text>
                {post.isGhost ? (
                  <View style={[styles.ghostBadge, { backgroundColor: "#7C3AED" }]}>
                    <Text style={styles.ghostBadgeText}>GHOST</Text>
                  </View>
                ) : !post.isAnonymous && post.authorIsVerified ? (
                  <View style={[styles.verifiedBadge, { backgroundColor: verifiedBadgeColor }]}>
                    <Feather name="check" size={9} color="#FFF" />
                  </View>
                ) : null}
              </View>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {post.isGhost ? "Ghost transmission" : post.college} · {formatRelativeTime(post.createdAt)}
                {autoDeleteLabel ? ` · ⏱ ${autoDeleteLabel}` : ""}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.tag, { backgroundColor: tagColor + "1A", borderColor: tagColor + "33" }]}>
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
                style={[styles.mediaThumbWrap, { backgroundColor: colors.secondary }]}
              >
                <Image
                  source={{ uri }}
                  style={[styles.mediaThumb, post.mediaUrls.length === 1 && styles.mediaThumbSingle]}
                  resizeMode="contain"
                />
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
            <TouchableOpacity onPress={() => handleVote("up")} style={[styles.voteBtn, { backgroundColor: colors.surface }, post.userVote === "up" && { backgroundColor: colors.primary + "22" }]}>
              <Animated.View style={{ transform: [{ scale: upAnim }] }}>
                <Feather name="arrow-up" size={16} color={post.userVote === "up" ? colors.primary : colors.mutedForeground} />
              </Animated.View>
              <Text style={[styles.voteCount, { color: post.userVote === "up" ? colors.primary : colors.mutedForeground }]}>{post.upvotes}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleVote("down")} style={[styles.voteBtn, { backgroundColor: colors.surface }, post.userVote === "down" && { backgroundColor: "#EF444420" }]}>
              <Animated.View style={{ transform: [{ scale: downAnim }] }}>
                <Feather name="arrow-down" size={16} color={post.userVote === "down" ? "#EF4444" : colors.mutedForeground} />
              </Animated.View>
              <Text style={[styles.voteCount, { color: post.userVote === "down" ? "#EF4444" : colors.mutedForeground }]}>{post.downvotes}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handlePress} style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
            <Feather name="message-circle" size={16} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{post.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBookmark} style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
            <Animated.View style={{ transform: [{ scale: bookmarkAnim }] }}>
              <Feather name="bookmark" size={16} color={post.isBookmarked ? colors.primary : colors.mutedForeground} />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => toggleRepost(post.id)} style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
            <Feather name="repeat" size={16} color={isReposted ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.actionText, { color: isReposted ? colors.primary : colors.mutedForeground }]}>{post.repostCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShareOptionsVisible(true)} style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
            <Feather name="share-2" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>

          {isOwner ? (
            <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, { backgroundColor: colors.surface }]}>
              <Animated.View style={{ transform: [{ scale: deleteAnim }] }}>
                <Feather name="trash-2" size={16} color="#EF4444" />
              </Animated.View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setReportVisible(true)}
              style={[styles.actionBtn, { backgroundColor: colors.surface, opacity: reported ? 0.4 : 1 }]}
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
            <TouchableOpacity onPress={handleSharePostLink} style={[styles.videoOpenBtn, { backgroundColor: colors.primary, width: "100%", alignItems: "center" }]}>
              <Text style={styles.videoOpenText}>Share link</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCopyPostLink} style={[styles.videoOpenBtn, { backgroundColor: colors.secondary, width: "100%", alignItems: "center" }]}>
              <Text style={[styles.videoOpenText, { color: colors.foreground }]}>Copy link</Text>
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
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { backgroundColor: "transparent" },
  avatarInitial: { fontSize: 15, fontFamily: "Inter_700Bold" },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  username: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  verifiedBadge: { width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  ghostAvatarWrap: { shadowOpacity: 0.22, shadowRadius: 8, elevation: 3 },
  ghostAvatarText: { position: "absolute", right: -5, bottom: -6, fontSize: 14 },
  ghostBadge: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 2 },
  ghostBadgeText: { color: "#FFF", fontSize: 8, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexShrink: 0,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  repostedBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  repostedBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  content: { fontSize: 15, lineHeight: 22, marginBottom: 12 },
  mediaRow: { marginBottom: 12 },
  mediaThumbWrap: { borderRadius: 10, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  mediaThumb: { width: 120, height: 120 },
  mediaThumbSingle: { width: 240, height: 160 },
  videoThumb: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, padding: 14, marginBottom: 12 },
  playBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  videoLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  actions: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  voteRow: { flexDirection: "row", alignItems: "center", gap: 2, flex: 1 },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
  },
  voteCount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 36,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 13,
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
