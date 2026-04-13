import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function RateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showSuccess } = useToast();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const scaleAnims = [1, 2, 3, 4, 5].map(() => React.useRef(new Animated.Value(1)).current);

  const handleStarPress = (star: number) => {
    setRating(star);
    Animated.sequence([
      Animated.spring(scaleAnims[star - 1], { toValue: 1.4, tension: 200, friction: 8, useNativeDriver: false }),
      Animated.spring(scaleAnims[star - 1], { toValue: 1, tension: 200, friction: 8, useNativeDriver: false }),
    ]).start();
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    if (user) {
      try {
        await supabase.from("app_ratings").insert({
          user_id: user.id,
          rating,
          feedback: feedback.trim() || null,
        });
      } catch {}
    }
    setSubmitted(true);
    showSuccess("Thank you!", "Your review helps us grow.");
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Rate UConnect</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="heart" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.successTitle, { color: colors.foreground }]}>Thank you!</Text>
          <Text style={[styles.successSubtitle, { color: colors.mutedForeground }]}>
            Your {rating}-star review means a lot to our team. We'll keep making UConnect better for you!
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Feather key={s} name="star" size={28} color={s <= rating ? "#F59E0B" : colors.border} />
            ))}
          </View>
          <TouchableOpacity onPress={() => router.back()} style={[styles.doneBtn, { backgroundColor: colors.primary }]}>
            <Text style={styles.doneBtnText}>Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const messages = ["", "It was bad", "Could be better", "It was okay", "Really good!", "Absolutely love it!"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Rate UConnect</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 16 }}>
          <View style={[styles.appIcon, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.appIconChar, { color: colors.primary }]}>U</Text>
          </View>
          <Text style={[styles.heading, { color: colors.foreground }]}>Enjoying UConnect?</Text>
          <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
            Let us know how we're doing. Your feedback helps us build a better app for everyone.
          </Text>
        </View>

        <View style={{ alignItems: "center", gap: 16 }}>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Animated.View key={star} style={{ transform: [{ scale: scaleAnims[star - 1] }] }}>
                <TouchableOpacity onPress={() => handleStarPress(star)}>
                  <Feather
                    name="star"
                    size={44}
                    color={star <= (hovered || rating) ? "#F59E0B" : colors.border}
                  />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
          {rating > 0 && (
            <Text style={[styles.ratingMessage, { color: colors.primary }]}>{messages[rating]}</Text>
          )}
        </View>

        <View style={[styles.feedbackBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.feedbackLabel, { color: colors.foreground }]}>Leave a comment (optional)</Text>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Tell us what you love or what we can improve..."
            placeholderTextColor={colors.placeholder}
            style={[styles.feedbackInput, { color: colors.foreground, borderColor: colors.border }]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={rating === 0}
          style={[styles.submitBtn, { backgroundColor: rating > 0 ? colors.primary : colors.secondary, opacity: rating > 0 ? 1 : 0.5 }]}
        >
          <Feather name="star" size={18} color={rating > 0 ? "#FFF" : colors.mutedForeground} />
          <Text style={[styles.submitText, { color: rating > 0 ? "#FFF" : colors.mutedForeground }]}>Submit Rating</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  appIcon: { width: 90, height: 90, borderRadius: 24, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  appIconChar: { fontSize: 48, fontFamily: "Inter_700Bold" },
  heading: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  subheading: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  starsContainer: { flexDirection: "row", gap: 10 },
  ratingMessage: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  feedbackBox: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  feedbackLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  feedbackInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 100 },
  submitBtn: { borderRadius: 14, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  submitText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 20 },
  successIcon: { width: 100, height: 100, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  successTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  successSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  starsRow: { flexDirection: "row", gap: 8 },
  doneBtn: { paddingHorizontal: 36, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFF" },
});
