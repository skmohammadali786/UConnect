import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const SECTIONS = [
  {
    title: "Information We Collect",
    icon: "database",
    content:
      "We collect information you provide directly, including your email address, college affiliation, username, display name, bio, and interests. We also collect content you create such as posts, comments, and confessions. Usage data and device information may be collected to improve your experience.",
  },
  {
    title: "How We Use Your Information",
    icon: "settings",
    content:
      "Your information is used to provide and maintain the UConnect service, verify your college identity, personalize your feed and recommendations, send notifications about activity related to your account, and ensure the safety and integrity of our platform.",
  },
  {
    title: "Anonymous Posting",
    icon: "user-x",
    content:
      "When you post anonymously, your username and avatar are hidden from other users. However, for safety and moderation purposes, we internally link anonymous posts to the account that created them. We do not publicly reveal anonymous author identities except when required by law or to prevent harm.",
  },
  {
    title: "Data Sharing",
    icon: "share-2",
    content:
      "We do not sell your personal information to third parties. We may share data with service providers who assist us in operating the platform, subject to confidentiality agreements. We may disclose information if required by law or to protect the rights and safety of our users.",
  },
  {
    title: "Data Retention",
    icon: "clock",
    content:
      "We retain your account data for as long as your account is active. Posts with auto-delete timers are removed after the specified duration. When you delete your account, your personal data and content are permanently erased within 30 days.",
  },
  {
    title: "Your Rights",
    icon: "shield",
    content:
      "You have the right to access, update, or delete your personal information at any time through the app settings. You may request a copy of your data or object to certain processing. To exercise these rights, contact us through the Help & Support section.",
  },
  {
    title: "Security",
    icon: "lock",
    content:
      "We implement industry-standard security measures to protect your data. Your college email is verified via OTP. We use encryption for data in transit and at rest. However, no method of transmission over the internet is 100% secure.",
  },
  {
    title: "Changes to This Policy",
    icon: "edit",
    content:
      "We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or by email. Continued use of UConnect after changes constitutes acceptance of the updated policy.",
  },
  {
    title: "Contact Us",
    icon: "mail",
    content:
      "If you have questions about this Privacy Policy or how we handle your data, please reach out through the Help & Support section in Settings. We aim to respond to all privacy inquiries within 48 hours.",
  },
];

export default function PrivacyPolicyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Privacy Policy</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "20" }]}>
          <Feather name="shield" size={28} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Your Privacy Matters</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            UConnect is built for college students. We are committed to protecting your information and being transparent about how we use it.
          </Text>
          <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>Last updated: April 2026</Text>
        </View>

        {SECTIONS.map((section, i) => (
          <View key={i} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>  
            <View style={styles.sectionHeader}>  
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>  
                <Feather name={section.icon} size={16} color={colors.primary} />  
              </View>  
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>  
            </View>  
            <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>{section.content}</Text>  
          </View>  
        ))}

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          © 2026 UConnect. All rights reserved
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { padding: 16, gap: 12, paddingBottom: 60 },
  heroBanner: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: "center", gap: 10, marginBottom: 4 },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, textAlign: "center" },
  lastUpdated: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  sectionBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  footer: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", paddingVertical: 8 },
});
