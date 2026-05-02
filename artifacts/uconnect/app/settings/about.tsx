import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";

const FEATURES = [
  { icon: "shield", label: "Fully Anonymous", desc: "Post without ever revealing your identity" },
  { icon: "users", label: "Verified Students Only", desc: "Your college community, no outsiders" },
  { icon: "briefcase", label: "Career Opportunities", desc: "Internships, jobs, and team projects" },
  { icon: "zap", label: "Real-time Confessions", desc: "Share freely, connect genuinely" },
];

const TEAM = [
  { name: "Sk Mohammad Ali", role: "Founder & CEO", letter: "S", image: "https://iili.io/BegEz22.md.webp" },
];

export default function AboutScreen() {
  const colors = useColors();
  const { themeMode } = useTheme();
  const scheme = useColorScheme();
  const isDarkTheme = themeMode === "dark" || (themeMode === "system" && (scheme ?? "light") === "dark");
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>About UConnect</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: colors.primary + "10" }]}>
          <View style={[styles.logoCircle, isDarkTheme ? { backgroundColor: "#111827", borderColor: "#374151", borderWidth: 1.5 } : { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }]}>
            <Image source={isDarkTheme ? require("@/assets/images/logo-dark.png") : require("@/assets/images/logo.png")} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>UConnect</Text>
          <Text style={[styles.tagline, { color: colors.primary }]}>Your college. Your voice.</Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.versionText, { color: colors.mutedForeground }]}>Version 1.0.0 · Beta</Text>
          </View>
        </View>

        <View style={{ padding: 20, gap: 20 }}>
          <View style={[styles.card, styles.centerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, styles.centerText, { color: colors.foreground }]}>Our Mission</Text>
            <Text style={[styles.cardBody, styles.centerText, { color: colors.mutedForeground }]}>
              UConnect was built to give college students a safe, anonymous space to express themselves, find opportunities, and build their campus community — without the fear of judgment.
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.foreground }]}>What makes us different</Text>
          {FEATURES.map((f) => (
            <View key={f.label} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name={f.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureLabel, { color: colors.foreground }]}>{f.label}</Text>
                <Text style={[styles.featureDesc, { color: colors.mutedForeground }]}>{f.desc}</Text>
              </View>
            </View>
          ))}

          <View style={styles.teamGrid}>
            {TEAM.map((m) => (
              <View key={m.name} style={[styles.teamCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {m.image ? (
                  <Image source={{ uri: m.image }} style={styles.teamAvatarImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.teamAvatar, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.teamLetter, { color: colors.primary }]}>{m.letter}</Text>
                  </View>
                )}
                <Text style={[styles.teamName, { color: colors.foreground }]}>{m.name}</Text>
                <Text style={[styles.teamRole, { color: colors.mutedForeground }]}>{m.role}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.legalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.legalTitle, { color: colors.foreground }]}>Legal</Text>
            {[
              { label: "Privacy Policy", route: "/settings/privacy-policy" },
              { label: "Terms of Service", route: "/settings/terms" },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.legalRow, { borderTopColor: colors.border }]}
                onPress={() => item.route ? router.push(item.route as any) : undefined}
              >
                <Text style={[styles.legalText, { color: colors.mutedForeground }]}>{item.label}</Text>
                <Feather name="external-link" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            Made for students, by students{"\n"}© 2026 UConnect. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  hero: { alignItems: "center", paddingVertical: 40, gap: 12 },
  logoCircle: { width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logoImg: { width: 78, height: 78 },
  appName: { fontSize: 28, fontFamily: "Inter_700Bold" },
  tagline: { fontSize: 16, fontFamily: "Inter_500Medium" },
  versionBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginTop: 4 },
  versionText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 10 },
  centerCard: { alignItems: "center" },
  centerText: { textAlign: "center" },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, borderWidth: 1, padding: 14 },
  featureIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  featureLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  featureDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  teamGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  teamCard: { width: 220, borderRadius: 14, borderWidth: 1, padding: 16, alignItems: "center", gap: 8 },
  teamAvatar: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  teamAvatarImage: { width: 56, height: 56, borderRadius: 18 },
  teamLetter: { fontSize: 24, fontFamily: "Inter_700Bold" },
  teamName: { fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  teamRole: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  legalCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  legalTitle: { fontSize: 14, fontFamily: "Inter_700Bold", paddingHorizontal: 16, paddingVertical: 12 },
  legalRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1 },
  legalText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footer: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
