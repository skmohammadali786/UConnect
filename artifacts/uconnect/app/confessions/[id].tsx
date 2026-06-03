import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useConfessions } from "@/context/ConfessionsContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";
import { supabase } from "@/lib/supabase";
import { formatRelativeTime } from "@/utils/time";
import type { ConfessionComment } from "@/context/ConfessionsContext";

const ND = Platform.OS !== "web";

const LOCAL_ID_PREFIX = "local_";
function isLocalId(value: unknown) {
  return typeof value === "string" && value.startsWith(LOCAL_ID_PREFIX);
}

export default function ConfessionDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { confessions, voteConfession, addConfessionComment, voteConfessionComment, deleteConfession, deleteConfessionComment } = useConfessions();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();
  const [comment, setComment] = useState("");
  const [isAnon, setIsAnon] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [loadedComments, setLoadedComments] = useState<ConfessionComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteCommentConfirmVisible, setDeleteCommentConfirmVisible] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<ConfessionComment | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const confession = confessions.find((c) => c.id === id);
  const confessionId = confession?.id;
  const isOwner = !!user && confession?.authorId === user.id;
  const canCommentAnonymously = Boolean(user?.isVerified);

  const goBackSafely = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/confessions");
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: ND }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: ND }),
    ]).start();
  }, []);

  const loadComments = useCallback(async () => {
    if (!confession) { setCommentsLoading(false); return; }
    if (isLocalId(confession.id)) {
      setLoadedComments(confession.comments);
      setCommentsLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("confession_comments")
        .select("*")
        .eq("confession_id", confession.id)
        .order("created_at", { ascending: true });

      if (data) {
        const commentIds = (data ?? []).map((row: { id: string }) => row.id);
        let voteMap = new Map<string, "up" | "down">();
        if (user && commentIds.length > 0) {
          const { data: voteRows } = await supabase
            .from("confession_comment_votes")
            .select("comment_id, vote")
            .eq("user_id", user.id)
            .in("comment_id", commentIds);
          (voteRows ?? []).forEach((v: unknown) => {
            if (
              typeof v === 'object' &&
              v !== null &&
              'comment_id' in v &&
              'vote' in v
            ) {
              const { comment_id, vote } = v as { comment_id: string; vote: number };
              voteMap.set(comment_id, vote);
            }
          });
        }
        const remoteComments = data.map((row: {
          id: string;
          is_anonymous: boolean;
          author_id: string;
          content: string;
          upvotes: number | null;
          downvotes: number | null;
          created_at: string;
        }) => ({
          id: row.id,
          authorId: row.is_anonymous ? "anon" : row.author_id,
          ownerId: row.is_anonymous ? row.author_id : undefined,
          isAnonymous: row.is_anonymous,
          content: row.content,
          upvotes: row.upvotes ?? 0,
          downvotes: row.downvotes ?? 0,
          userVote: voteMap.get(row.id) ?? null,
          createdAt: row.created_at,
        }));
        setLoadedComments((prev) => {
          const pendingLocal = prev.filter((c) =>
            c.id.startsWith(LOCAL_ID_PREFIX)
            && !remoteComments.some((r) =>
              r.authorId === c.authorId
              && r.isAnonymous === c.isAnonymous
              && r.content === c.content
            )
          );
          return [...remoteComments, ...pendingLocal];
        });
      } else {
        setLoadedComments(confession.comments);
      }
    } catch {
      setLoadedComments(confession.comments);
    }
    setCommentsLoading(false);
  }, [confession?.id, user?.id]);

  useEffect(() => {
    setCommentsLoading(true);
    loadComments();
  }, [loadComments]);

  useEffect(() => {
    if (!confession || isLocalId(confession.id)) return;
    const channel = supabase
      .channel(`confession-comments-${confession.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confession_comments", filter: `confession_id=eq.${confession.id}` },
        () => { loadComments(); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [confession?.id, loadComments]);

  if (!confession) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.mutedForeground, fontSize: 16, fontFamily: "Inter_400Regular" }]}>Confession not found</Text>
        <TouchableOpacity onPress={goBackSafely} style={[styles.backFallback, { backgroundColor: colors.primary }]}>
          <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isRevealed = settings.showSensitiveContent || revealed;

  const handleSendComment = async () => {
    if (!comment.trim() || !user) return;
    if (isAnon && !canCommentAnonymously) {
      showInfo("Verification required", "Verify your profile to comment anonymously in confessions.");
      return;
    }
    const message = comment.trim();
    const tempCommentId = LOCAL_ID_PREFIX + Date.now();
    const newComment: ConfessionComment = {
      id: tempCommentId,
      authorId: isAnon ? "anon" : user.id,
      ownerId: isAnon ? user.id : undefined,
      isAnonymous: isAnon,
      content: message,
      upvotes: 0,
      downvotes: 0,
      userVote: null,
      createdAt: new Date().toISOString(),
    };
    setLoadedComments((prev) => [...prev, newComment]);

    const ok = await addConfessionComment(confession.id, {
      authorId: isAnon ? "anon" : user.id,
      isAnonymous: isAnon,
      content: message,
    });
    if (!ok) {
      setLoadedComments((prev) => prev.filter((c) => c.id !== newComment.id));
      setComment(message);
      showError("Failed to post comment", "Please try again");
      return;
    }

    setComment("");
    setLoadedComments((prev) => prev.filter((c) => c.id !== tempCommentId));
    if (!isLocalId(confession.id)) {
      loadComments();
    }
  };

  const displayComments = [
    ...loadedComments.filter((c) => !c.id.startsWith(LOCAL_ID_PREFIX)),
    ...loadedComments.filter((c) => c.id.startsWith(LOCAL_ID_PREFIX)),
  ];

  const handleVoteConfessionComment = useCallback((commentId: string, vote: "up" | "down") => {
    if (!confession || !confessionId) return;
    setLoadedComments((prev) => prev.map((cm) => {
      if (cm.id !== commentId) return cm;
      const prevVote = cm.userVote;
      let upvotes = cm.upvotes;
      let downvotes = cm.downvotes;
      if (prevVote === "up") upvotes = Math.max(0, upvotes - 1);
      if (prevVote === "down") downvotes = Math.max(0, downvotes - 1);
      const nextVote: "up" | "down" | null = prevVote === vote ? null : vote;
      if (nextVote === "up") upvotes += 1;
      if (nextVote === "down") downvotes += 1;
      return { ...cm, upvotes, downvotes, userVote: nextVote };
    }));
    if (isLocalId(commentId)) return;
    voteConfessionComment(confessionId, commentId, vote);
  }, [confession, confessionId, voteConfessionComment]);

  const handleDeleteConfession = async () => {
    if (!confession) return;
    setDeleteConfirmVisible(false);
    const ok = await deleteConfession(confession.id);
    if (!ok) {
      showError("Failed to delete confession", "Please try again");
      return;
    }
    showSuccess("Confession deleted");
    router.replace("/confessions");
  };

  const handleRequestDeleteComment = useCallback((target: ConfessionComment) => {
    setCommentToDelete(target);
    setDeleteCommentConfirmVisible(true);
  }, []);

  const handleDeleteComment = useCallback(async () => {
    if (!confession || !commentToDelete) return;
    setDeleteCommentConfirmVisible(false);
    const ok = await deleteConfessionComment(confession.id, commentToDelete.id);
    if (!ok) {
      showError("Failed to delete comment", "Please try again");
      setCommentToDelete(null);
      return;
    }
    setLoadedComments((prev) => prev.filter((c) => c.id !== commentToDelete.id));
    setCommentToDelete(null);
    showSuccess("Comment deleted");
    if (!isLocalId(confession.id)) {
      loadComments();
    }
  }, [commentToDelete, confession, deleteConfessionComment, loadComments, showError, showSuccess]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom : 0}
    >
      <Animated.View style={[{ flex: 1, backgroundColor: colors.background }, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={goBackSafely}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Confession</Text>
          {isOwner ? (
            <TouchableOpacity onPress={() => setDeleteConfirmVisible(true)} style={styles.deleteBtn}>
              <Feather name="trash-2" size={18} color="#EF4444" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.confessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.anonBadge, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="user-x" size={14} color={colors.primary} />
              <Text style={[styles.anonText, { color: colors.primary }]}>Anonymous</Text>
            </View>

            {confession.hasSensitiveContent && !isRevealed ? (
              <View style={styles.sensitiveBlock}>
                <View style={[styles.sensitiveIcon, { backgroundColor: "#F59E0B15" }]}>
                  <Feather name="alert-triangle" size={22} color="#F59E0B" />
                </View>
                <Text style={[styles.sensitiveTitle, { color: colors.foreground }]}>Sensitive Content</Text>
                <TouchableOpacity onPress={() => setRevealed(true)} style={[styles.revealBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                  <Feather name="eye" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.revealText, { color: colors.mutedForeground }]}>Show anyway</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[styles.confessionContent, { color: colors.foreground }]}>{confession.content}</Text>
            )}

            <View style={styles.confessionFooter}>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatRelativeTime(confession.createdAt)}</Text>
              <TouchableOpacity
                onPress={() => voteConfession(confession.id, "up")}
                style={[styles.voteBtn, confession.userVote === "up" && { backgroundColor: colors.primary + "20" }]}
              >
                <Feather name="arrow-up" size={16} color={confession.userVote === "up" ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.voteCount, { color: confession.userVote === "up" ? colors.primary : colors.mutedForeground }]}>{confession.upvotes}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => voteConfession(confession.id, "down")}
                style={[styles.voteBtn, confession.userVote === "down" && { backgroundColor: "#EF444420" }]}
              >
                <Feather name="arrow-down" size={16} color={confession.userVote === "down" ? "#EF4444" : colors.mutedForeground} />
                <Text style={[styles.voteCount, { color: confession.userVote === "down" ? "#EF4444" : colors.mutedForeground }]}>{confession.downvotes}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
              {displayComments.length > 0 ? `${displayComments.length} Comment${displayComments.length !== 1 ? "s" : ""}` : "Be the first to comment"}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
            {commentsLoading ? (
              <View style={styles.noComments}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : displayComments.length === 0 ? (
              <View style={styles.noComments}>
                <Feather name="message-circle" size={36} color={colors.mutedForeground} />
                <Text style={[styles.noCommentsText, { color: colors.mutedForeground }]}>No comments yet</Text>
                <Text style={[styles.noCommentsSub, { color: colors.mutedForeground }]}>Share your thoughts anonymously</Text>
              </View>
            ) : (
              displayComments.map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={[styles.commentAvatar, { backgroundColor: c.isAnonymous ? colors.muted : colors.primary + "22" }]}>
                      <Feather name={c.isAnonymous ? "user-x" : "user"} size={11} color={c.isAnonymous ? colors.mutedForeground : colors.primary} />
                    </View>
                    <Text style={[styles.commentAuthor, { color: colors.foreground }]}>
                      {c.isAnonymous ? "Anonymous" : `@${c.authorId}`}
                    </Text>
                    <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>{formatRelativeTime(c.createdAt)}</Text>
                  </View>
                  <Text style={[styles.commentContent, { color: colors.foreground }]}>{c.content}</Text>
                  <View style={styles.commentActions}>
                    <TouchableOpacity onPress={() => handleVoteConfessionComment(c.id, "up")} style={styles.commentActionBtn}>
                      <Feather name="arrow-up" size={13} color={c.userVote === "up" ? colors.primary : colors.mutedForeground} />
                      <Text style={[styles.commentActionText, { color: c.userVote === "up" ? colors.primary : colors.mutedForeground }]}>{c.upvotes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleVoteConfessionComment(c.id, "down")} style={styles.commentActionBtn}>
                      <Feather name="arrow-down" size={13} color={c.userVote === "down" ? "#EF4444" : colors.mutedForeground} />
                    </TouchableOpacity>
                    {user?.id === (c.ownerId ?? c.authorId) && (
                      <TouchableOpacity onPress={() => handleRequestDeleteComment(c)} style={styles.commentActionBtn}>
                        <Feather name="trash-2" size={13} color="#EF4444" />
                        <Text style={[styles.commentActionText, { color: "#EF4444" }]}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 16 : insets.bottom + 8 }]}>
          <View style={[styles.anonToggle, { backgroundColor: colors.secondary }]}>
            <Feather name={isAnon ? "user-x" : "user"} size={14} color={isAnon ? colors.primary : colors.mutedForeground} />
            <Switch
              value={isAnon}
              onValueChange={(value) => {
                if (value && !canCommentAnonymously) {
                  showInfo("Verification required", "Verify your profile to comment anonymously in confessions.");
                  return;
                }
                setIsAnon(value);
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={isAnon ? "Reply anonymously..." : "Reply as yourself..."}
            placeholderTextColor={colors.placeholder}
            style={[styles.commentInput, { color: colors.foreground, backgroundColor: colors.secondary, borderColor: comment ? colors.primary + "60" : colors.border }]}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={!comment.trim() || !user}
            style={[styles.sendBtn, { backgroundColor: comment.trim() && user ? colors.primary : colors.secondary }]}
          >
            <Feather name="send" size={16} color={comment.trim() && user ? "#FFF" : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        {!canCommentAnonymously && (
          <Text style={[styles.verifyHint, { color: colors.mutedForeground }]}>
            Verify your profile to enable anonymous confession comments.
          </Text>
        )}
        <ConfirmModal
          visible={deleteConfirmVisible}
          title="Delete confession"
          message="Are you sure you want to delete this confession? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleDeleteConfession}
          onCancel={() => setDeleteConfirmVisible(false)}
        />
        <ConfirmModal
          visible={deleteCommentConfirmVisible}
          title="Delete comment"
          message="Are you sure you want to delete this comment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleDeleteComment}
          onCancel={() => {
            setDeleteCommentConfirmVisible(false);
            setCommentToDelete(null);
          }}
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  deleteBtn: { width: 38, height: 30, alignItems: "center", justifyContent: "center" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  backFallback: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  confessionCard: { margin: 16, borderRadius: 18, borderWidth: 1, padding: 20, gap: 14 },
  anonBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: "flex-start" },
  anonText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  confessionContent: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 26 },
  confessionFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  time: { fontSize: 12, fontFamily: "Inter_400Regular" },
  voteBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  voteCount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sensitiveBlock: { alignItems: "center", gap: 10, paddingVertical: 12 },
  sensitiveIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sensitiveTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  revealBtn: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  revealText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  commentsHeader: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, marginBottom: 12 },
  commentsTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  noComments: { alignItems: "center", gap: 8, paddingTop: 40 },
  noCommentsText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  noCommentsSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  commentItem: { paddingVertical: 12 },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  commentAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  commentContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 8 },
  commentActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  commentActionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  commentActionText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  anonToggle: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 6, borderRadius: 10 },
  commentInput: { flex: 1, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  verifyHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 8, marginHorizontal: 4 },
});
