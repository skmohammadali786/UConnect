import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommentItem } from "@/components/CommentItem";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";
import { supabase } from "@/lib/supabase";
import type { Comment } from "@/context/PostsContext";

const LOCAL_ID_PREFIX = "local_";
const ND = Platform.OS !== "web";
function isLocalId(value: unknown) {
  return typeof value === "string" && value.startsWith(LOCAL_ID_PREFIX);
}

function rowToComment(row: any, userVote: "up" | "down" | null = null): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    parentId: row.parent_id ?? null,
    authorId: row.author_id,
    authorUsername: row.is_anonymous ? "anonymous" : (row.author_username ?? "user"),
    authorAvatar: row.is_anonymous ? null : (row.author_avatar ?? null),
    isAnonymous: row.is_anonymous,
    content: row.content,
    upvotes: row.upvotes ?? 0,
    downvotes: row.downvotes ?? 0,
    userVote,
    createdAt: row.created_at,
    replies: [],
  };
}

function hasMatchingRemoteComment(local: Comment, remote: Comment[]): boolean {
  return remote.some((c) =>
    c.parentId === local.parentId
    && c.authorId === local.authorId
    && c.isAnonymous === local.isAnonymous
    && c.content === local.content
  );
}

export default function PostDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { posts, addComment, voteComment, deletePost, adjustCommentCount, refreshPosts } = usePosts();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isAnon, setIsAnon] = useState(false);
  const [loadedComments, setLoadedComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const newLocalIds = useRef<Set<string>>(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const post = posts.find((p) => p.id === id);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: ND }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: ND }),
    ]).start();
  }, []);

  const loadComments = useCallback(async () => {
    if (!post) { setCommentsLoading(false); return; }
    if (isLocalId(post.id)) {
      setLoadedComments(post.comments);
      setCommentsLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .is("parent_id", null)
        .order("created_at", { ascending: true });

      const { data: replyRows } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .not("parent_id", "is", null)
        .order("created_at", { ascending: true });

      const allRows = [...(data ?? []), ...(replyRows ?? [])];
      const commentIds = allRows.map((r: any) => r.id);
      let userVoteMap = new Map<string, "up" | "down">();
      if (user && commentIds.length > 0) {
        const { data: voteRows } = await supabase
          .from("comment_votes")
          .select("comment_id, vote")
          .eq("user_id", user.id)
          .in("comment_id", commentIds);
        (voteRows ?? []).forEach((v: any) => userVoteMap.set(v.comment_id, v.vote));
      }

      const topLevel = (data ?? []).map((row: any) => rowToComment(row, userVoteMap.get(row.id) ?? null));

      const replyMap = new Map<string, Comment[]>();
      (replyRows ?? []).forEach((r: any) => {
        const c = rowToComment(r, userVoteMap.get(r.id) ?? null);
        if (!replyMap.has(r.parent_id)) replyMap.set(r.parent_id, []);
        replyMap.get(r.parent_id)!.push(c);
      });

      const withReplies = topLevel.map((c) => ({
        ...c,
        replies: replyMap.get(c.id) ?? [],
      }));
      setLoadedComments((prev) => {
        const prevTopLevelLocal = prev.filter((c) => c.id.startsWith(LOCAL_ID_PREFIX) && !c.parentId);
        const prevReplyLocalByParent = new Map<string, Comment[]>();
        prev.forEach((c) => {
          c.replies.forEach((r) => {
            if (!r.id.startsWith(LOCAL_ID_PREFIX)) return;
            const parentId = r.parentId ?? c.id;
            const current = prevReplyLocalByParent.get(parentId) ?? [];
            prevReplyLocalByParent.set(parentId, [...current, r]);
          });
        });
        const remoteReplies = withReplies.flatMap((c) => c.replies);
        const merged = [...withReplies];
        const mergedById = new Map(merged.map((c) => [c.id, c]));

        prevTopLevelLocal
          .filter((local) => !hasMatchingRemoteComment(local, withReplies))
          .forEach((local) => {
            if (mergedById.has(local.id)) return;
            merged.push(local);
            mergedById.set(local.id, local);
          });

        prevReplyLocalByParent.forEach((locals, parentId) => {
          const parent = mergedById.get(parentId);
          if (!parent) return;
          const existingReplyIds = new Set(parent.replies.map((r) => r.id));
          const pendingReplies = locals.filter((local) => !hasMatchingRemoteComment(local, remoteReplies) && !existingReplyIds.has(local.id));
          if (pendingReplies.length === 0) return;
          const updatedParent = { ...parent, replies: [...parent.replies, ...pendingReplies] };
          mergedById.set(parentId, updatedParent);
          const parentIndex = merged.findIndex((c) => c.id === parentId);
          if (parentIndex >= 0) merged[parentIndex] = updatedParent;
          });

        return merged;
      });
    } catch {}
    setCommentsLoading(false);
  }, [post?.id, user?.id]);

  useEffect(() => {
    setCommentsLoading(true);
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!post || isLocalId(post.id)) return;
    const channel = supabase
      .channel(`post-comments-${post.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${post.id}` },
        () => { loadComments(); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [post?.id, loadComments]);

  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontFamily: "Inter_600SemiBold", color: colors.foreground, marginLeft: 16 }}>Post</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Feather name="alert-circle" size={44} color={colors.mutedForeground} />
          <Text style={{ fontSize: 16, fontFamily: "Inter_500Medium", color: colors.mutedForeground }}>Post not found</Text>
        </View>
      </View>
    );
  }

  const handleSendComment = async () => {
    if (!comment.trim() || !user) return;
    const message = comment.trim();
    const replyingTo = replyTo;
    const tempId = LOCAL_ID_PREFIX + Date.now();
    newLocalIds.current.add(tempId);
    const newComment: Comment = {
      id: tempId,
      postId: post.id,
      parentId: replyingTo?.id ?? null,
      authorId: user.id,
      authorUsername: isAnon ? "anonymous" : user.username,
      authorAvatar: isAnon ? null : (user.avatar ?? null),
      isAnonymous: isAnon,
      content: message,
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      createdAt: new Date().toISOString(),
      replies: [],
    };
    if (replyingTo) {
      setLoadedComments((prev) =>
        prev.map((c) => c.id === replyingTo.id ? { ...c, replies: [...c.replies, newComment] } : c)
      );
    } else {
      setLoadedComments((prev) => [...prev, newComment]);
    }
    setComment("");
    setReplyTo(null);

    const ok = await addComment(post.id, {
      postId: post.id,
      parentId: replyingTo?.id || null,
      authorId: user.id,
      authorUsername: user.username,
      authorAvatar: isAnon ? null : (user.avatar || null),
      isAnonymous: isAnon,
      content: message,
    });

    if (!ok) {
      if (replyingTo) {
        setLoadedComments((prev) =>
          prev.map((c) => c.id === replyingTo.id ? { ...c, replies: c.replies.filter((r) => r.id !== tempId) } : c)
        );
      } else {
        setLoadedComments((prev) => prev.filter((c) => c.id !== tempId));
      }
      showError("Failed to post comment", "Please try again");
      return;
    }

    if (!isLocalId(post.id)) {
      loadComments();
    }
  };

  const handleDelete = (postId: string) => {
    deletePost(postId);
    showSuccess("Post deleted");
    router.back();
  };

  const displayCount = loadedComments.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  const applyVoteToComments = useCallback((comments: Comment[], commentId: string, vote: "up" | "down"): Comment[] => {
    const applyVote = (c: Comment): Comment => {
      const prevVote = c.userVote;
      let upvotes = c.upvotes;
      let downvotes = c.downvotes;
      if (prevVote === "up") upvotes = Math.max(0, upvotes - 1);
      if (prevVote === "down") downvotes = Math.max(0, downvotes - 1);
      const nextVote: "up" | "down" | null = prevVote === vote ? null : vote;
      if (nextVote === "up") upvotes += 1;
      if (nextVote === "down") downvotes += 1;
      return { ...c, upvotes, downvotes, userVote: nextVote };
    };

    return comments.map((c) => {
      if (c.id === commentId) return applyVote(c);
      if (c.replies.length === 0) return c;
      return { ...c, replies: applyVoteToComments(c.replies, commentId, vote) };
    });
  }, []);

  const handleVoteComment = useCallback((commentId: string, vote: "up" | "down") => {
    setLoadedComments((prev) => applyVoteToComments(prev, commentId, vote));
    if (isLocalId(commentId)) return;
    voteComment(post.id, commentId, vote);
  }, [applyVoteToComments, post.id, voteComment]);

  const countCommentsInTree = (commentNode: Comment): number => (
    1 + commentNode.replies.reduce((acc, reply) => acc + countCommentsInTree(reply), 0)
  );

  const removeCommentFromTree = useCallback((comments: Comment[], targetId: string): { updatedComments: Comment[]; removedCount: number } => {
    let removedCount = 0;
    const updatedComments: Comment[] = [];
    for (const c of comments) {
      if (c.id === targetId) {
        removedCount += countCommentsInTree(c);
        continue;
      }
      const childResult = c.replies.length > 0 ? removeCommentFromTree(c.replies, targetId) : { updatedComments: c.replies, removedCount: 0 };
      removedCount += childResult.removedCount;
      updatedComments.push(childResult.removedCount > 0 ? { ...c, replies: childResult.updatedComments } : c);
    }
    return { updatedComments, removedCount };
  }, []);

  const handleRequestDeleteComment = useCallback((target: Comment) => {
    setCommentToDelete(target);
    setDeleteConfirmVisible(true);
  }, []);

  const handleDeleteComment = useCallback(async () => {
    if (!post || !commentToDelete || !user) return;
    setDeleteConfirmVisible(false);
    const previous = loadedComments;
    const removed = removeCommentFromTree(previous, commentToDelete.id);
    if (removed.removedCount === 0) return;
    setLoadedComments(removed.updatedComments);
    if (isLocalId(commentToDelete.id)) {
      adjustCommentCount(post.id, -removed.removedCount);
      showSuccess("Comment deleted");
      setCommentToDelete(null);
      return;
    }
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentToDelete.id)
      .eq("author_id", user.id);
    if (error) {
      setLoadedComments(previous);
      showError("Failed to delete comment", "Please try again");
      setCommentToDelete(null);
      return;
    }
    adjustCommentCount(post.id, -removed.removedCount);
    await supabase.rpc("decrement_comment_count", { p_post_id: post.id, p_decrement_by: removed.removedCount });
    showSuccess("Comment deleted");
    setCommentToDelete(null);
    await Promise.all([loadComments(), refreshPosts()]);
  }, [adjustCommentCount, commentToDelete, loadedComments, loadComments, post, refreshPosts, removeCommentFromTree, showError, showSuccess, user]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom + 56 : 0}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Post</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <PostCard post={post} currentUserId={user?.id || ""} onDelete={handleDelete} />
          <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
              Comments ({displayCount})
            </Text>
          </View>
          <View style={{ paddingHorizontal: 16 }}>
            {commentsLoading ? (
              <View style={styles.empty}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : loadedComments.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="message-circle" size={36} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No comments yet. Be the first!</Text>
              </View>
            ) : (
              loadedComments.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  postId={post.id}
                  currentUserId={user?.id}
                  onReply={(cm) => setReplyTo(cm)}
                  onVote={handleVoteComment}
                  onDelete={handleRequestDeleteComment}
                />
              ))
            )}
          </View>
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 4 }]}>
          {replyTo && (
            <View style={[styles.replyBanner, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.replyText, { color: colors.primary }]}>Replying to {replyTo.isAnonymous ? "Anonymous" : `@${replyTo.authorUsername}`}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Feather name="x" size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setIsAnon((v) => !v)} style={[styles.anonToggle, { backgroundColor: isAnon ? colors.primary + "20" : colors.muted }]}>
              <Feather name={isAnon ? "user-x" : "user"} size={14} color={isAnon ? colors.primary : colors.mutedForeground} />
            </TouchableOpacity>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={isAnon ? "Comment anonymously..." : "Write a comment..."}
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.input, borderColor: colors.border }]}
              multiline
            />
            <TouchableOpacity onPress={handleSendComment} disabled={!comment.trim()} style={[styles.sendBtn, { backgroundColor: comment.trim() ? colors.primary : colors.muted }]}>
              <Feather name="send" size={16} color={comment.trim() ? "#FFFFFF" : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
        <ConfirmModal
          visible={deleteConfirmVisible}
          title="Delete comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleDeleteComment}
          onCancel={() => {
            setDeleteConfirmVisible(false);
            setCommentToDelete(null);
          }}
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  commentsHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  commentsTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", gap: 10, paddingVertical: 40 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  inputBar: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10 },
  replyBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginBottom: 8 },
  replyText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  anonToggle: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
