import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (e: string) => {
    return e.includes("@") && (e.includes(".edu") || e.includes("ac.in") || e.includes("iit") || e.includes("nit") || e.includes("bits"));
  };

  const handleContinue = async () => {
    if (!email.trim()) {
      setError("Please enter your college email");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please use a valid college email address");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({ pathname: "/auth/otp", params: { email } });
    }, 800);
  };

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
          <Text style={[styles.title, { color: colors.foreground }]}>Enter your{"\n"}college email</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            We'll send a verification code to confirm you're a student
          </Text>
          <AppInput
            label="College Email"
            placeholder="yourname@college.ac.in"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            leftIcon="mail"
            error={error}
            autoFocus
          />
          <View style={[styles.infoBox, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Accepted: .edu, .ac.in, IIT, NIT, BITS, and other verified college domains
            </Text>
          </View>
          <AppButton title="Send OTP" onPress={handleContinue} loading={loading} fullWidth size="lg" />
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
  title: { fontSize: 30, fontFamily: "Inter_700Bold", lineHeight: 38, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  infoBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
