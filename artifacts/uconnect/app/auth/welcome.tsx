import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.hero}>
        <View style={[styles.logoRing, { borderColor: colors.primary + "40" }]}>
          <View style={[styles.logoInner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.logoText, { color: colors.primary }]}>U</Text>
          </View>
        </View>
        <Text style={[styles.headline, { color: colors.foreground }]}>
          Your college.{"\n"}Your voice.
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Join thousands of students sharing anonymously, building connections, and growing together on UConnect.
        </Text>
        <View style={[styles.features, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { icon: "🎭", text: "Post anonymously" },
            { icon: "🔐", text: "Verified college email only" },
            { icon: "💬", text: "Anonymous DMs" },
            { icon: "🚀", text: "Internships & opportunities" },
          ].map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.buttons}>
        <AppButton
          title="Get Started"
          onPress={() => router.push("/auth/login")}
          size="lg"
          fullWidth
        />
        <AppButton
          title="Sign in"
          onPress={() => router.push("/auth/login")}
          variant="outline"
          size="lg"
          fullWidth
        />
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Only students with valid college email IDs can join
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  logoRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logoInner: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logoText: { fontSize: 38, fontFamily: "Inter_700Bold", lineHeight: 42 },
  headline: { fontSize: 34, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 42, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, paddingHorizontal: 16 },
  features: { width: "100%", borderRadius: 14, borderWidth: 1, padding: 4 },
  featureItem: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  featureIcon: { fontSize: 18 },
  featureText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  buttons: { gap: 12, paddingBottom: 8 },
  disclaimer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
});
