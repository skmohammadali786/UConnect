import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommentItem } from "@/components/CommentItem";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";
import type { Comment } from "@/context/PostsContext";

function isUUID(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function rowToComment(row: any): Comment {
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
    userVote: null,
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
  const { posts, addComment, voteComment, deletePost } = usePosts();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [comment, setComment] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [isAnon, setIsAnon] = useState(false);
  const [loadedComments, setLoadedComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const newLocalIds = useRef<Set<string>>(new Set());

  const post = posts.find((p) => p.id === id);

  const loadComments = useCallback(async () => {
    if (!post) { setCommentsLoading(false); return; }
    if (!isUUID(post.id)) {
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

      const topLevel = (data ?? []).map(rowToComment);
      const { data: replyRows } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", post.id)
        .not("parent_id", "is", null)
        .order("created_at", { ascending: true });

      const replyMap = new Map<string, Comment[]>();
      (replyRows ?? []).forEach((r: any) => {
        const c = rowToComment(r);
        if (!replyMap.has(r.parent_id)) replyMap.set(r.parent_id, []);
        replyMap.get(r.parent_id)!.push(c);
      });

      const withReplies = topLevel.map((c) => ({
        ...c,
        replies: replyMap.get(c.id) ?? [],
      }));
      setLoadedComments((prev) => {
        const prevTopLevelLocal = prev.filter((c) => c.id.startsWith("local_") && !c.parentId);
        const prevReplyLocal = prev.flatMap((c) => c.replies.filter((r) => r.id.startsWith("local_")));
        const merged = [...withReplies];

        prevTopLevelLocal
          .filter((local) => !hasMatchingRemoteComment(local, withReplies))
          .forEach((local) => {
            if (!merged.some((c) => c.id === local.id)) merged.push(local);
          });

        prevReplyLocal
          .filter((local) => !hasMatchingRemoteComment(local, withReplies.flatMap((c) => c.replies)))
          .forEach((local) => {
            const parentIndex = merged.findIndex((c) => c.id === local.parentId);
            if (parentIndex < 0) return;
            const parent = merged[parentIndex];
            if (parent.replies.some((r) => r.id === local.id)) return;
            merged[parentIndex] = { ...parent, replies: [...parent.replies, local] };
          });

        return merged;
      });
    } catch {}
    setCommentsLoading(false);
  }, [post?.id]);

  useEffect(() => {
    setCommentsLoading(true);
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!post || !isUUID(post.id)) return;
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

  const handleSendComment = () => {
    if (!comment.trim() || !user) return;
    const tempId = "local_" + Date.now();
    newLocalIds.current.add(tempId);
    const newComment: Comment = {
      id: tempId,
      postId: post.id,
      parentId: replyTo?.id ?? null,
      authorId: user.id,
      authorUsername: isAnon ? "anonymous" : user.username,
      authorAvatar: isAnon ? null : (user.avatar ?? null),
      isAnonymous: isAnon,
      content: comment.trim(),
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      createdAt: new Date().toISOString(),
      replies: [],
    };
    if (replyTo) {
      setLoadedComments((prev) =>
        prev.map((c) => c.id === replyTo.id ? { ...c, replies: [...c.replies, newComment] } : c)
      );
    } else {
      setLoadedComments((prev) => [...prev, newComment]);
    }
    addComment(post.id, {
      postId: post.id,
      parentId: replyTo?.id || null,
      authorId: user.id,
      authorUsername: user.username,
      authorAvatar: isAnon ? null : (user.avatar || null),
      isAnonymous: isAnon,
      content: comment.trim(),
    });
    setComment("");
    setReplyTo(null);
  };

  const handleDelete = (postId: string) => {
    deletePost(postId);
    showSuccess("Post deleted");
    router.back();
  };

  const displayCount = loadedComments.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom + 56 : 0}>
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
                onReply={(cm) => setReplyTo(cm)}
                onVote={(commentId, vote) => voteComment(post.id, commentId, vote)}
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
