import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { checkRateLimit, recordAttempt, formatLockTime } from "@/utils/rateLimit";

const OTP_MAX = 3;
const OTP_WINDOW = 10 * 60 * 1000;
const OTP_LOCKOUT = 15 * 60 * 1000;

function rlKey(email: string) {
  return `otp_send_${email.toLowerCase().trim()}`;
}

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { flow } = useLocalSearchParams<{ flow: string }>();
  const { sendOtp } = useAuth();
  const isSignIn = flow === "signin";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lockStatus, setLockStatus] = useState<{ isLocked: boolean; secondsLeft: number; attemptsLeft: number } | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startLockTimer = (secondsLeft: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let secs = secondsLeft;
    timerRef.current = setInterval(() => {
      secs -= 1;
      if (secs <= 0) {
        clearInterval(timerRef.current!);
        setLockStatus(null);
      } else {
        setLockStatus((prev) => prev ? { ...prev, secondsLeft: secs } : null);
      }
    }, 1000);
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (e: string) => e.includes("@") && e.includes(".");

  const handleContinue = async () => {
    if (!email.trim()) { setError("Please enter your email address"); shake(); return; }
    if (!validateEmail(email.trim())) { setError("Please enter a valid email address"); shake(); return; }

    const existing = await checkRateLimit(rlKey(email), OTP_MAX, OTP_WINDOW);
    if (existing.isLocked) {
      setLockStatus({ isLocked: true, secondsLeft: existing.secondsLeft, attemptsLeft: 0 });
      startLockTimer(existing.secondsLeft);
      shake();
      return;
    }

    setError("");
    setLoading(true);

    const rlResult = await recordAttempt(rlKey(email), OTP_MAX, OTP_WINDOW, OTP_LOCKOUT);
    if (rlResult.isLocked) {
      setLoading(false);
      setLockStatus({ isLocked: true, secondsLeft: rlResult.secondsLeft, attemptsLeft: 0 });
      startLockTimer(rlResult.secondsLeft);
      shake();
      return;
    }

    setLockStatus({ isLocked: false, secondsLeft: 0, attemptsLeft: rlResult.attemptsLeft });

    // Send real OTP via Supabase
    const { error: otpError } = await sendOtp(email.trim());
    setLoading(false);

    if (otpError) {
      setError(otpError);
      shake();
      return;
    }

    router.push({ pathname: "/auth/otp", params: { email: email.trim(), flow: flow || "signup" } });
  };

  const isDisabled = lockStatus?.isLocked === true;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Back</Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isSignIn ? "Welcome\nback" : "Enter your\nemail address"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {isSignIn
              ? "Enter your registered email. We'll send a verification code to confirm it's you."
              : "We'll send a verification code. You can use any email — you'll select your college in the next step."}
          </Text>

          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <AppInput
              label="Email Address"
              placeholder="yourname@gmail.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); setLockStatus(null); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail"
              error={error}
              autoFocus
              editable={!isDisabled}
            />
          </Animated.View>

          {lockStatus?.isLocked ? (
            <View style={[styles.lockBox, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
              <Feather name="lock" size={18} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.lockTitle, { color: "#EF4444" }]}>Too many OTP requests</Text>
                <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>
                  Try again in <Text style={{ fontFamily: "Inter_700Bold", color: "#EF4444" }}>{formatLockTime(lockStatus.secondsLeft)}</Text>
                </Text>
              </View>
            </View>
          ) : lockStatus && lockStatus.attemptsLeft <= 1 && lockStatus.attemptsLeft > 0 ? (
            <View style={[styles.warnBox, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B40" }]}>
              <Feather name="alert-triangle" size={15} color="#F59E0B" />
              <Text style={[styles.warnText, { color: "#F59E0B" }]}>
                {lockStatus.attemptsLeft} OTP request left before temporary lockout
              </Text>
            </View>
          ) : (
            <View style={[styles.infoBox, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
              <Text style={[styles.infoText, { color: colors.primary }]}>
                Any email works — Gmail, Outlook, college email, or any other. You'll verify your college next.
              </Text>
            </View>
          )}

          <AppButton
            title="Send OTP"
            onPress={handleContinue}
            loading={loading}
            disabled={isDisabled}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { marginBottom: 32 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  content: { gap: 20 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", lineHeight: 38, letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  infoBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  lockBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  lockTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  lockSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  warnBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  warnText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
});
