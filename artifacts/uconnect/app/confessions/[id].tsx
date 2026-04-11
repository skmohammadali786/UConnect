import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useConfessions } from "@/context/ConfessionsContext";
import { useSettings } from "@/context/SettingsContext";
import { formatRelativeTime } from "@/utils/time";

const ND = Platform.OS !== "web";

export default function ConfessionDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { confessions, voteConfession, addConfessionComment } = useConfessions();
  const { settings } = useSettings();
  const { user } = useAuth();
  const [comment, setComment] = useState("");
  const [isAnon, setIsAnon] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const confession = confessions.find((c) => c.id === id);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: ND }).start();
  }, []);

  if (!confession) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[{ color: colors.mutedForeground, fontSize: 16, fontFamily: "Inter_400Regular" }]}>Confession not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backFallback, { backgroundColor: colors.primary }]}>
          <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isRevealed = settings.showSensitiveContent || revealed;

  const handleSendComment = () => {
    if (!comment.trim() || !user) return;
    addConfessionComment(confession.id, {
      authorId: isAnon ? "anon" : user.id,
      isAnonymous: isAnon,
      content: comment.trim(),
    });
    setComment("");
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.bottom + 56}>
      <Animated.View style={[{ flex: 1, backgroundColor: colors.background }, { opacity: fadeAnim }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Confession</Text>
          <View style={{ width: 38 }} />
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
            </View>
          </View>

          <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.commentsTitle, { color: colors.foreground }]}>
              {confession.commentCount > 0 ? `${confession.commentCount} Comment${confession.commentCount !== 1 ? "s" : ""}` : "Be the first to comment"}
            </Text>
          </View>

          <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
            {confession.comments.length === 0 && (
              <View style={styles.noComments}>
                <Feather name="message-circle" size={36} color={colors.mutedForeground} />
                <Text style={[styles.noCommentsText, { color: colors.mutedForeground }]}>No comments yet</Text>
                <Text style={[styles.noCommentsSub, { color: colors.mutedForeground }]}>Share your thoughts anonymously</Text>
              </View>
            )}
            {confession.comments.map((c) => (
              <View key={c.id} style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.commentHeader}>
                  <View style={[styles.commentAvatar, { backgroundColor: c.isAnonymous ? colors.secondary : colors.primary + "20" }]}>
                    <Feather name={c.isAnonymous ? "user-x" : "user"} size={13} color={c.isAnonymous ? colors.mutedForeground : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.commentAuthor, { color: c.isAnonymous ? colors.mutedForeground : colors.foreground }]}>
                      {c.isAnonymous ? "Anonymous" : `@${c.authorId}`}
                    </Text>
                    <Text style={[styles.commentTime, { color: colors.mutedForeground }]}>{formatRelativeTime(c.createdAt)}</Text>
                  </View>
                  <View style={[styles.upvotePill, { backgroundColor: colors.primary + "12" }]}>
                    <Feather name="arrow-up" size={12} color={colors.primary} />
                    <Text style={[styles.upvoteText, { color: colors.primary }]}>{c.upvotes}</Text>
                  </View>
                </View>
                <Text style={[styles.commentContent, { color: colors.foreground }]}>{c.content}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === "web" ? 16 : insets.bottom + 8 }]}>
          <View style={[styles.anonToggle, { backgroundColor: colors.secondary }]}>
            <Feather name={isAnon ? "user-x" : "user"} size={14} color={isAnon ? colors.primary : colors.mutedForeground} />
            <Switch value={isAnon} onValueChange={setIsAnon} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }} />
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
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
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
  commentCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  commentHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  commentAuthor: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  commentTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  upvotePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  upvoteText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  commentContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1 },
  anonToggle: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 6, borderRadius: 10 },
  commentInput: { flex: 1, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  backFallback: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
});
