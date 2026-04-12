import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { checkRateLimit, recordAttempt, clearRateLimit, formatLockTime } from "@/utils/rateLimit";

const FAIL_MAX = 5;
const FAIL_WINDOW = 30 * 60 * 1000;
const FAIL_LOCKOUT = 30 * 60 * 1000;

function rlKey(email: string) {
  return `otp_verify_${email.toLowerCase().trim()}`;
}

export default function OTPScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, flow } = useLocalSearchParams<{ email: string; flow: string }>();
  const { verifyOtp, sendOtp } = useAuth();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [error, setError] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(FAIL_MAX);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const refs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const status = await checkRateLimit(rlKey(email), FAIL_MAX, FAIL_WINDOW);
      if (status.isLocked) {
        setIsLocked(true);
        setLockSecondsLeft(status.secondsLeft);
        startLockTimer(status.secondsLeft);
      } else {
        setAttemptsLeft(status.attemptsLeft);
      }
    })();
    return () => { if (lockTimerRef.current) clearInterval(lockTimerRef.current); };
  }, [email]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const startLockTimer = (secs: number) => {
    if (lockTimerRef.current) clearInterval(lockTimerRef.current);
    let s = secs;
    lockTimerRef.current = setInterval(() => {
      s -= 1;
      if (s <= 0) {
        clearInterval(lockTimerRef.current!);
        setIsLocked(false);
        setLockSecondsLeft(0);
        setAttemptsLeft(FAIL_MAX);
      } else {
        setLockSecondsLeft(s);
      }
    }, 1000);
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleChange = (val: string, idx: number) => {
    const cleaned = val.replace(/[^0-9]/g, "").slice(-1);
    const updated = [...otp];
    updated[idx] = cleaned;
    setOtp(updated);
    if (cleaned && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === "Backspace" && !otp[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the 6-digit code"); shake(); return; }

    if (isLocked) {
      setError(`Account locked. Try again in ${formatLockTime(lockSecondsLeft)}.`);
      shake();
      return;
    }

    setError("");
    setLoading(true);

    const { error: verifyError, isNewUser } = await verifyOtp(email, code);

    if (verifyError) {
      setLoading(false);
      const result = await recordAttempt(rlKey(email), FAIL_MAX, FAIL_WINDOW, FAIL_LOCKOUT);
      if (result.isLocked) {
        setIsLocked(true);
        setLockSecondsLeft(result.secondsLeft);
        startLockTimer(result.secondsLeft);
        setError("Too many failed attempts. Account temporarily locked.");
      } else {
        setAttemptsLeft(result.attemptsLeft);
        setError("Invalid or expired code. Please try again.");
      }
      shake();
      return;
    }

    await clearRateLimit(rlKey(email));
    setLoading(false);

    if (isNewUser) {
      router.push({ pathname: "/auth/college-select", params: { email } });
    } else {
      router.replace("/(tabs)/");
    }
  };

  const handleResend = async () => {
    setResendTimer(30);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    await sendOtp(email);
  };

  const filledCount = otp.filter(Boolean).length;
  const warnAttempts = !isLocked && attemptsLeft <= 2 && attemptsLeft > 0;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Back</Text>
        </Pressable>

        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.foreground }]}>Verify your{"\n"}email</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
          </Text>

          <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(r) => { refs.current[idx] = r; }}
                value={digit}
                onChangeText={(v) => { handleChange(v, idx); setError(""); }}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: isLocked ? colors.secondary : colors.input,
                    borderColor: error && !isLocked ? "#EF4444" : digit ? colors.primary : colors.border,
                    color: colors.foreground,
                    opacity: isLocked ? 0.5 : 1,
                  },
                ]}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!isLocked}
              />
            ))}
          </Animated.View>

          {isLocked ? (
            <View style={[styles.lockBox, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
              <Feather name="lock" size={20} color="#EF4444" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.lockTitle, { color: "#EF4444" }]}>Too many failed attempts</Text>
                <Text style={[styles.lockSub, { color: colors.mutedForeground }]}>
                  Locked for{" "}
                  <Text style={{ fontFamily: "Inter_700Bold", color: "#EF4444" }}>
                    {formatLockTime(lockSecondsLeft)}
                  </Text>
                </Text>
              </View>
            </View>
          ) : (
            <>
              {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
              {warnAttempts ? (
                <View style={[styles.warnBox, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B40" }]}>
                  <Feather name="alert-triangle" size={14} color="#F59E0B" />
                  <Text style={[styles.warnText, { color: "#F59E0B" }]}>
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} left before lockout
                  </Text>
                </View>
              ) : null}
            </>
          )}

          <View style={styles.resendRow}>
            {resendTimer > 0 ? (
              <Text style={[styles.timerText, { color: colors.mutedForeground }]}>
                Resend code in <Text style={{ color: colors.primary }}>{resendTimer}s</Text>
              </Text>
            ) : (
              <Pressable onPress={handleResend} disabled={isLocked}>
                <Text style={[styles.resendText, { color: isLocked ? colors.mutedForeground : colors.primary }]}>
                  Resend code
                </Text>
              </Pressable>
            )}
          </View>

          <AppButton
            title="Verify"
            onPress={handleVerify}
            loading={loading}
            disabled={isLocked || filledCount < 6}
            fullWidth
            size="lg"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  backBtn: { marginBottom: 32 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  content: { gap: 24 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", lineHeight: 38, letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24, textAlign: "center" },
  otpRow: { flexDirection: "row", justifyContent: "center", gap: 10 },
  otpInput: { width: 48, height: 56, borderRadius: 12, borderWidth: 1.5, fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  error: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  lockBox: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  lockTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  lockSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 3 },
  warnBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  warnText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  resendRow: { alignItems: "center" },
  timerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resendText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
