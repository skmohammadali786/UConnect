import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  { icon: "🎭", text: "Post anonymously, no judgment" },
  { icon: "🔐", text: "Verified college students only" },
  { icon: "💼", text: "Internships & opportunities" },
  { icon: "🤝", text: "Find your hackathon team" },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { loginAsDemo } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo */}
        <Animated.View style={[styles.logoRing, { borderColor: colors.primary + "40", transform: [{ scale: logoScale }] }]}>
          <View style={[styles.logoInner, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.logoText, { color: colors.primary }]}>U</Text>
          </View>
        </Animated.View>

        <View style={styles.headlines}>
          <Text style={[styles.brand, { color: colors.primary }]}>UConnect</Text>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Your college.{"\n"}Your voice.
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            The anonymous social network for verified college students. Share freely, connect deeply.
          </Text>
        </View>

        <View style={[styles.features, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.featureItem, i < FEATURES.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.buttons, { opacity: fadeAnim }]}>
        <AppButton
          title="Get Started with College Email"
          onPress={() => router.push("/auth/login")}
          size="lg"
          fullWidth
          icon="mail"
        />
        <AppButton
          title="Sign In"
          onPress={() => router.push("/auth/login")}
          variant="outline"
          size="lg"
          fullWidth
        />
        <View style={styles.divider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text style={[styles.orText, { color: colors.mutedForeground }]}>or</Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>
        <TouchableOpacity
          onPress={async () => { await loginAsDemo(); router.replace("/(tabs)/"); }}
          style={[styles.demoBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.demoBtnText, { color: colors.mutedForeground }]}>Explore Demo (no sign up)</Text>
        </TouchableOpacity>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Only students with a valid college email can join
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 22 },
  logoRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  logoInner: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 38, fontFamily: "Inter_700Bold", lineHeight: 42 },
  headlines: { alignItems: "center", gap: 8 },
  brand: { fontSize: 14, fontFamily: "Inter_600SemiBold", letterSpacing: 2 },
  headline: { fontSize: 32, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 40, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, paddingHorizontal: 10 },
  features: { width: "100%", borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  featureItem: { flexDirection: "row", alignItems: "center", padding: 13, gap: 12 },
  featureIcon: { fontSize: 18, width: 24 },
  featureText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  buttons: { gap: 11, paddingBottom: 8 },
  divider: { flexDirection: "row", alignItems: "center", gap: 12 },
  line: { flex: 1, height: 1 },
  orText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  demoBtn: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  demoBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  disclaimer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
