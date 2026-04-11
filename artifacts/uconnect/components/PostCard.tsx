import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
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

export function PostCard({ post, currentUserId, onDelete, index = 0 }: PostCardProps) {
  const colors = useColors();
  const { votePost, bookmarkPost } = usePosts();
  const { hasReported } = useSocial();
  const [reportVisible, setReportVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const upAnim = useRef(new Animated.Value(1)).current;
  const downAnim = useRef(new Animated.Value(1)).current;
  const bookmarkAnim = useRef(new Animated.Value(1)).current;
  const deleteAnim = useRef(new Animated.Value(1)).current;

  const pulse = (anim: Animated.Value) => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1.35, useNativeDriver: ND, tension: 250, friction: 5 }),
      Animated.spring(anim, { toValue: 1, useNativeDriver: ND, tension: 250, friction: 5 }),
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
    setTimeout(() => onDelete?.(post.id), 180);
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.982, useNativeDriver: ND, tension: 300, friction: 12 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: ND, tension: 300, friction: 12 }).start();
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleAuthorPress}
            disabled={post.isAnonymous}
            activeOpacity={0.7}
            style={styles.authorRow}
          >
            <View style={[styles.avatarWrap, { backgroundColor: post.isAnonymous ? colors.muted : colors.primary + "22" }]}>
              <Feather name={post.isAnonymous ? "user-x" : "user"} size={14} color={post.isAnonymous ? colors.mutedForeground : colors.primary} />
            </View>
            <View>
              <Text style={[styles.username, { color: post.isAnonymous ? colors.mutedForeground : colors.foreground }]}>
                {post.isAnonymous ? "Anonymous" : `@${post.authorUsername}`}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {post.college} · {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.tag, { backgroundColor: tagColor + "20" }]}>
            <Text style={[styles.tagText, { color: tagColor }]}>{post.tag}</Text>
          </View>
        </View>

        <Text style={[styles.content, { color: colors.foreground }]} numberOfLines={4}>{post.content}</Text>

        <View style={styles.actions}>
          <View style={styles.voteRow}>
            <TouchableOpacity onPress={() => handleVote("up")} style={[styles.voteBtn, post.userVote === "up" && { backgroundColor: colors.primary + "20" }]}>
              <Animated.View style={{ transform: [{ scale: upAnim }] }}>
                <Feather name="arrow-up" size={16} color={post.userVote === "up" ? colors.primary : colors.mutedForeground} />
              </Animated.View>
              <Text style={[styles.voteCount, { color: post.userVote === "up" ? colors.primary : colors.mutedForeground }]}>{post.upvotes}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleVote("down")} style={[styles.voteBtn, post.userVote === "down" && { backgroundColor: colors.destructive + "20" }]}>
              <Animated.View style={{ transform: [{ scale: downAnim }] }}>
                <Feather name="arrow-down" size={16} color={post.userVote === "down" ? colors.destructive : colors.mutedForeground} />
              </Animated.View>
              <Text style={[styles.voteCount, { color: post.userVote === "down" ? colors.destructive : colors.mutedForeground }]}>{post.downvotes}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handlePress} style={styles.actionBtn}>
            <Feather name="message-circle" size={16} color={colors.mutedForeground} />
            <Text style={[styles.actionText, { color: colors.mutedForeground }]}>{post.commentCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBookmark} style={styles.actionBtn}>
            <Animated.View style={{ transform: [{ scale: bookmarkAnim }] }}>
              <Feather name={post.isBookmarked ? "bookmark" : "bookmark"} size={16} color={post.isBookmarked ? colors.primary : colors.mutedForeground} />
            </Animated.View>
          </TouchableOpacity>

          {isOwner ? (
            <TouchableOpacity onPress={handleDelete} disabled={!onDelete} style={[styles.actionBtn, { opacity: onDelete ? 1 : 0.4 }]}>
              <Animated.View style={{ transform: [{ scale: deleteAnim }] }}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
              </Animated.View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setReportVisible(true)}
              style={[styles.actionBtn, { opacity: reported ? 0.4 : 1 }]}
              disabled={reported}
            >
              <Feather name="flag" size={16} color={reported ? colors.mutedForeground : colors.mutedForeground} />
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  username: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  content: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 14 },
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
});
