import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommentItem } from "@/components/CommentItem";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import type { Comment } from "@/context/PostsContext";

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

  const post = posts.find((p) => p.id === id);

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
          <Text style={[styles.commentsTitle, { color: colors.foreground }]}>Comments ({post.commentCount})</Text>
        </View>
        <View style={{ paddingHorizontal: 16 }}>
          {post.comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              postId={post.id}
              onReply={(cm) => setReplyTo(cm)}
              onVote={(commentId, vote) => voteComment(post.id, commentId, vote)}
            />
          ))}
          {post.comments.length === 0 && (
            <View style={styles.empty}>
              <Feather name="message-circle" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No comments yet. Be the first!</Text>
            </View>
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
