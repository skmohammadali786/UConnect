import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Comment } from "@/context/PostsContext";
import { formatRelativeTime } from "@/utils/time";

interface CommentItemProps {
  comment: Comment;
  postId: string;
  depth?: number;
  currentUserId?: string;
  onReply?: (comment: Comment) => void;
  onVote?: (commentId: string, vote: "up" | "down") => void;
  onDelete?: (comment: Comment) => void;
}

export function CommentItem({ comment, postId, depth = 0, currentUserId, onReply, onVote, onDelete }: CommentItemProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);
  const canDelete = !!currentUserId && currentUserId === comment.authorId;

  return (
    <View style={[styles.container, depth > 0 && { marginLeft: 16, borderLeftWidth: 1.5, borderLeftColor: colors.border, paddingLeft: 12 }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: comment.isAnonymous ? colors.muted : colors.primary + "22" }]}>
          <Feather name={comment.isAnonymous ? "user-x" : "user"} size={11} color={comment.isAnonymous ? colors.mutedForeground : colors.primary} />
        </View>
        <Text style={[styles.username, { color: colors.foreground }]}>
          {comment.isAnonymous ? "Anonymous" : comment.authorUsername}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatRelativeTime(comment.createdAt)}</Text>
      </View>
      <Text style={[styles.content, { color: colors.foreground }]}>{comment.content}</Text>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => onVote?.(comment.id, "up")} style={styles.actionBtn}>
          <Feather name="arrow-up" size={13} color={comment.userVote === "up" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.count, { color: comment.userVote === "up" ? colors.primary : colors.mutedForeground }]}>{comment.upvotes}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onVote?.(comment.id, "down")} style={styles.actionBtn}>
          <Feather name="arrow-down" size={13} color={comment.userVote === "down" ? colors.destructive : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onReply?.(comment)} style={styles.actionBtn}>
          <Feather name="corner-down-right" size={13} color={colors.mutedForeground} />
          <Text style={[styles.count, { color: colors.mutedForeground }]}>Reply</Text>
        </TouchableOpacity>
        {canDelete && (
          <TouchableOpacity onPress={() => onDelete?.(comment)} style={styles.actionBtn}>
            <Feather name="trash-2" size={13} color="#EF4444" />
            <Text style={[styles.count, { color: "#EF4444" }]}>Delete</Text>
          </TouchableOpacity>
        )}
        {comment.replies.length > 0 && (
          <TouchableOpacity onPress={() => setExpanded((e) => !e)} style={styles.actionBtn}>
            <Feather name={expanded ? "chevron-up" : "chevron-down"} size={13} color={colors.primary} />
            <Text style={[styles.count, { color: colors.primary }]}>{comment.replies.length} {expanded ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        )}
      </View>
      {expanded && comment.replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          postId={postId}
          depth={depth + 1}
          currentUserId={currentUserId}
          onReply={onReply}
          onVote={onVote}
          onDelete={onDelete}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  avatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  username: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  content: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 8 },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  count: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
