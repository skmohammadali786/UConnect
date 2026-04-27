import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { useConfessions } from "@/context/ConfessionsContext";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";

export default function CreateConfessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addConfession } = useConfessions();
  const { user } = useAuth();
  const { showSuccess, showInfo } = useToast();
  const [content, setContent] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [posting, setPosting] = useState(false);

  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePost = async () => {
    if (!content.trim() || !agreed) return;
    if (!user?.isVerified) {
      showInfo("Verification required", "Verify your profile to post anonymous confessions.");
      return;
    }
    setPosting(true);
    await addConfession(content.trim(), isSensitive);
    setPosting(false);
    showSuccess("Confession posted!", "Your secret is safe with us.");
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, paddingBottom: insets.bottom + 16, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Anonymous Confession</Text>
          <View style={{ width: 30 }} />
        </View>

        {/* Anonymous badge */}
        <View style={[styles.anonBadge, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <Feather name="shield" size={18} color={colors.primary} />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.anonTitle, { color: colors.primary }]}>Fully anonymous</Text>
            <Text style={[styles.anonDesc, { color: colors.mutedForeground }]}>Your identity is never stored or shared.</Text>
          </View>
        </View>
        {!user?.isVerified && (
          <View style={[styles.verifyNotice, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <Text style={[styles.verifyNoticeText, { color: colors.mutedForeground }]}>
              Profile verification is required before posting in confessions.
            </Text>
          </View>
        )}

        {/* Text input */}
        <View style={[styles.textWrap, { backgroundColor: colors.card, borderColor: content ? colors.primary + "60" : colors.border }]}>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Share something you've never told anyone..."
            placeholderTextColor={colors.placeholder}
            multiline
            style={[styles.textarea, { color: colors.foreground }]}
            autoFocus
            maxLength={600}
          />
        </View>
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>{content.length}/600</Text>

        {/* Sensitive toggle */}
        <TouchableOpacity onPress={() => setIsSensitive((v) => !v)} style={styles.sensitiveRow}>
          <View style={[styles.checkbox, { borderColor: isSensitive ? "#F59E0B" : colors.border, backgroundColor: isSensitive ? "#F59E0B20" : "transparent" }]}>
            {isSensitive && <Feather name="check" size={11} color="#F59E0B" />}
          </View>
          <Text style={[styles.sensitiveLabel, { color: colors.mutedForeground }]}>Mark as sensitive content</Text>
        </TouchableOpacity>

        {/* Guidelines agreement */}
        <TouchableOpacity onPress={() => setAgreed((v) => !v)} style={styles.agreeRow}>
          <View style={[styles.checkbox, { borderColor: agreed ? colors.primary : colors.border, backgroundColor: agreed ? colors.primary : "transparent" }]}>
            {agreed && <Feather name="check" size={11} color="#FFF" />}
          </View>
          <Text style={[styles.agreeText, { color: colors.mutedForeground }]}>
            I follow community guidelines — no threats, harassment, or illegal content.
          </Text>
        </TouchableOpacity>

        <AppButton
          title={posting ? "Posting..." : "Post Confession"}
          onPress={handlePost}
          disabled={!content.trim() || !agreed || posting}
          loading={posting}
          fullWidth
          size="lg"
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, gap: 14 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  anonBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  anonTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  anonDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, textAlign: "center" },
  textWrap: { borderRadius: 14, borderWidth: 1.5, padding: 14, minHeight: 140 },
  textarea: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, textAlignVertical: "top", flex: 1 },
  counter: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: -8 },
  sensitiveRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sensitiveLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  agreeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  agreeText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
  verifyNotice: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  verifyNoticeText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
});
