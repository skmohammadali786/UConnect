import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { flow, ref, referralCode, email: incomingEmail } = useLocalSearchParams<{ flow: string; ref?: string; referralCode?: string; email?: string }>();
  const { signIn, signUp } = useAuth();
  const isSignIn = flow === "signin";
  const incomingReferralCode = (referralCode || ref || "").trim().toUpperCase();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (incomingEmail) setEmail(String(incomingEmail));
  }, [incomingEmail]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const validateEmail = (e: string) => e.trim().includes("@") && e.trim().includes(".");

  const mapAuthError = (authError: string) => {
    const lower = authError.toLowerCase();
    if (lower.includes("invalid login")) {
      return "Incorrect email or password. Please try again.";
    }
    if (lower.includes("invalid api key") || lower.includes("supabase is not configured")) {
      return "Authentication service is unavailable right now. Please try again later.";
    }
    return authError;
  };

  const handleSignIn = async () => {
    if (!email.trim()) { setError("Please enter your email address"); shake(); return; }
    if (!validateEmail(email)) { setError("Please enter a valid email address"); shake(); return; }
    if (!password) { setError("Please enter your password"); shake(); return; }

    setError("");
    setLoading(true);
    const { error: authError, isNewUser } = await signIn(email.trim(), password);
    setLoading(false);

    if (authError) {
      const msg = mapAuthError(authError);
      setError(msg);
      shake();
      return;
    }

    if (isNewUser) {
      router.replace({ pathname: "/auth/college-select", params: { email: email.trim(), referralCode: incomingReferralCode } });
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleSignUp = async () => {
    if (!email.trim()) { setError("Please enter your email address"); shake(); return; }
    if (!validateEmail(email)) { setError("Please enter a valid email address"); shake(); return; }
    if (!password) { setError("Please enter a password"); shake(); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); shake(); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); shake(); return; }

    setError("");
    setLoading(true);
    const { error: authError } = await signUp(email.trim(), password, phone.trim());
    setLoading(false);

    if (authError) {
      const msg = authError.toLowerCase().includes("already registered")
        ? "An account with this email already exists. Try signing in instead."
        : authError;
      setError(msg);
      shake();
      return;
    }

    router.replace({ pathname: "/auth/college-select", params: { email: email.trim(), referralCode: incomingReferralCode } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text>
        </Pressable>

        <View style={styles.content}>
          <View style={styles.headingArea}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {isSignIn ? "Welcome\nback" : "Create your\naccount"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {isSignIn
                ? "Sign in with your email and password"
                : "Join thousands of college students on UConnect"}
            </Text>
          </View>

          <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
            <AppInput
              label="Email Address"
              placeholder="yourname@gmail.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              leftIcon="mail"
              autoFocus
            />

            {!isSignIn && (
              <AppInput
                label="Mobile Number (optional)"
                placeholder="+91 98765 43210"
                value={phone}
                onChangeText={(t) => { setPhone(t); setError(""); }}
                keyboardType="phone-pad"
                leftIcon="phone"
              />
            )}

            <AppInput
              label="Password"
              placeholder={isSignIn ? "Enter your password" : "Min. 6 characters"}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(""); }}
              secureTextEntry={!showPassword}
              leftIcon="lock"
              rightIcon={showPassword ? "eye-off" : "eye"}
              onRightIconPress={() => setShowPassword((v) => !v)}
            />

            {!isSignIn && (
              <AppInput
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(""); }}
                secureTextEntry={!showConfirm}
                leftIcon="lock"
                rightIcon={showConfirm ? "eye-off" : "eye"}
                onRightIconPress={() => setShowConfirm((v) => !v)}
              />
            )}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
                <Feather name="alert-circle" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <AppButton
              title={isSignIn ? "Sign In" : "Create Account"}
              onPress={isSignIn ? handleSignIn : handleSignUp}
              loading={loading}
              fullWidth
              size="lg"
            />
          </Animated.View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchText, { color: colors.mutedForeground }]}>
              {isSignIn ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <Pressable onPress={() => {
              setError(""); setPassword(""); setConfirmPassword("");
              router.replace({ pathname: "/auth/login", params: { flow: isSignIn ? "signup" : "signin" } });
            }}>
              <Text style={[styles.switchLink, { color: colors.primary }]}>
                {isSignIn ? "Sign Up" : "Sign In"}
              </Text>
            </Pressable>
          </View>

          {isSignIn && (
            <View style={[styles.infoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="shield" size={14} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                Your account is secured. Only verified college students can access UConnect.
              </Text>
            </View>
          )}
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
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "Inter_700Bold" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
