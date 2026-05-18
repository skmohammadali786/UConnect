import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(Boolean(data.session?.user));
    }).catch(() => {
      setSessionReady(false);
    });
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleUpdatePassword = async () => {
    if (!sessionReady) {
      setError("This reset link is expired or invalid. Request a new password reset link.");
      shake();
      return;
    }
    if (!password) {
      setError("Please enter a new password.");
      shake();
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      shake();
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      shake();
      return;
    }

    setError("");
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message || "Unable to reset password. Please try again.");
      shake();
      return;
    }

    router.replace({ pathname: "/auth/login", params: { flow: "signin" } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.replace({ pathname: "/auth/login", params: { flow: "signin" } })} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back to Sign In</Text>
        </Pressable>

        <View style={styles.content}>
          <View style={styles.headingArea}>
            <Text style={[styles.title, { color: colors.foreground }]}>Reset{"\n"}password</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Choose a new secure password for your account.
            </Text>
          </View>

          <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
            <AppInput
              label="New Password"
              placeholder="Enter new password"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(""); }}
              secureTextEntry={!showPassword}
              leftIcon="lock"
              rightIcon={showPassword ? "eye-off" : "eye"}
              onRightIconPress={() => setShowPassword((v) => !v)}
            />
            <AppInput
              label="Confirm Password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
              secureTextEntry={!showConfirmPassword}
              leftIcon="lock"
              rightIcon={showConfirmPassword ? "eye-off" : "eye"}
              onRightIconPress={() => setShowConfirmPassword((v) => !v)}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
                <Feather name="alert-circle" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <AppButton
              title="Update Password"
              onPress={handleUpdatePassword}
              loading={loading}
              fullWidth
              size="lg"
            />
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 32 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  content: { gap: 24 },
  headingArea: { gap: 8, alignItems: "center" },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", lineHeight: 38, letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, textAlign: "center" },
  form: { gap: 16 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444", lineHeight: 18 },
});
