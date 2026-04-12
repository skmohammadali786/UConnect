import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";

export default function OTPScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(30);
  const [error, setError] = useState("");
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

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

  const handleVerify = () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({ pathname: "/auth/college-select", params: { email } });
    }, 1000);
  };

  const handleResend = () => {
    setTimer(30);
    setOtp(["", "", "", "", "", ""]);
  };

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
          <View style={styles.otpRow}>
            {otp.map((digit, idx) => (
              <TextInput
                key={idx}
                ref={(r) => { refs.current[idx] = r; }}
                value={digit}
                onChangeText={(v) => handleChange(v, idx)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                style={[
                  styles.otpInput,
                  {
                    backgroundColor: colors.input,
                    borderColor: digit ? colors.primary : colors.border,
                    color: colors.foreground,
                  },
                ]}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          <View style={styles.resendRow}>
            {timer > 0 ? (
              <Text style={[styles.timerText, { color: colors.mutedForeground }]}>
                Resend code in <Text style={{ color: colors.primary }}>{timer}s</Text>
              </Text>
            ) : (
              <Pressable onPress={handleResend}>
                <Text style={[styles.resendText, { color: colors.primary }]}>Resend code</Text>
              </Pressable>
            )}
          </View>
          <AppButton title="Verify" onPress={handleVerify} loading={loading} fullWidth size="lg" />
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
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  error: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  resendRow: { alignItems: "center" },
  timerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resendText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
