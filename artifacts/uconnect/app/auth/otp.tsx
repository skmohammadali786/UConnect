import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const ND = Platform.OS !== "web";

export default function MagicLinkWaitScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, flow } = useLocalSearchParams<{ email: string; flow: string }>();
  const { sendOtp } = useAuth();

  const [resendTimer, setResendTimer] = useState(30);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: ND }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: ND }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: ND }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: ND }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    await sendOtp(email);
    setResending(false);
    setResent(true);
    setResendTimer(30);
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, opacity: fadeAnim }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Back</Text>
        </Pressable>

        <Animated.View style={[styles.content, { transform: [{ translateY: slideAnim }] }]}>
          <Animated.View style={[styles.iconWrap, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", transform: [{ scale: pulseAnim }] }]}>
            <Feather name="mail" size={36} color={colors.primary} />
          </Animated.View>

          <Text style={[styles.title, { color: colors.foreground }]}>Check your{"\n"}email</Text>

          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We sent a sign-in link to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
          </Text>

          <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: "mail", step: "Open the email from Supabase" },
              { icon: "link", step: "Tap the sign-in link" },
              { icon: "check-circle", step: "You'll be signed in instantly" },
            ].map(({ icon, step }, i) => (
              <View key={i} style={[styles.stepRow, i < 2 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.stepIcon, { backgroundColor: colors.primary + "12" }]}>
                  <Feather name={icon as any} size={15} color={colors.primary} />
                </View>
                <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.noteCard, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "20" }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
              Open the link on <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>this device</Text> for it to sign you in automatically.
            </Text>
          </View>

          {resent && (
            <View style={[styles.resentBadge, { backgroundColor: "#00A86B15", borderColor: "#00A86B30" }]}>
              <Feather name="check" size={14} color="#00A86B" />
              <Text style={[styles.resentText, { color: "#00A86B" }]}>New link sent!</Text>
            </View>
          )}

          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={[styles.timerText, { color: colors.mutedForeground }]}>
                Resend link in <Text style={{ color: colors.primary }}>{resendTimer}s</Text>
              </Text>
            ) : (
              <AppButton
                title="Resend Magic Link"
                variant="outline"
                onPress={handleResend}
                loading={resending}
                fullWidth
                size="lg"
              />
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { marginBottom: 32 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  content: { gap: 22, alignItems: "center" },
  iconWrap: { width: 80, height: 80, borderRadius: 24, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", lineHeight: 38, letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24, textAlign: "center" },
  stepsCard: { width: "100%", borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  stepIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, width: "100%" },
  noteText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
  resentBadge: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14 },
  resentText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  resendRow: { width: "100%", alignItems: "center" },
  timerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
