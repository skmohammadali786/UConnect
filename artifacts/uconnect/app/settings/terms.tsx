import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const SECTIONS = [
  {
    title: "Acceptance of Terms",
    icon: "check-circle",
    content:
      "By creating an account on UConnect, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the platform. These terms apply to all users and visitors of UConnect.",
  },
  {
    title: "Eligibility",
    icon: "user-check",
    content:
      "UConnect is exclusively for current or former college and university students. You must be at least 16 years of age to use the platform. By signing up, you confirm that you are a student or alumnus of a recognized educational institution.",
  },
  {
    title: "Account Responsibilities",
    icon: "key",
    content:
      "You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate information during registration and to update it as necessary. You are solely responsible for all activity that occurs under your account.",
  },
  {
    title: "Content Guidelines",
    icon: "file-text",
    content:
      "You may not post content that is illegal, hateful, threatening, defamatory, or harassing. Spamming, phishing, and impersonation are strictly prohibited. Content that violates another person's privacy or intellectual property rights is not allowed. UConnect reserves the right to remove any content that violates these guidelines.",
  },
  {
    title: "Anonymous Posting",
    icon: "user-x",
    content:
      "The anonymous posting feature is provided to encourage open conversation. You may not use anonymity to harass, bully, or threaten other users. Misuse of anonymous features may result in account suspension. UConnect can internally identify the author of any post for moderation and safety purposes.",
  },
  {
    title: "Intellectual Property",
    icon: "award",
    content:
      "You retain ownership of the content you post. By posting on UConnect, you grant us a non-exclusive, royalty-free license to display and distribute your content within the platform. The UConnect name, logo, and platform design are our intellectual property and may not be used without permission.",
  },
  {
    title: "Prohibited Conduct",
    icon: "slash",
    content:
      "You agree not to attempt to access other users' accounts, reverse-engineer the platform, scrape data, introduce malware or harmful code, or use the platform in any way that could damage, disable, or impair UConnect's services or other users' experience.",
  },
  {
    title: "Termination",
    icon: "x-circle",
    content:
      "We reserve the right to suspend or terminate your account at any time for violations of these Terms. You may delete your account at any time through Settings. Upon termination, your data will be handled in accordance with our Privacy Policy.",
  },
  {
    title: "Limitation of Liability",
    icon: "alert-triangle",
    content:
      "UConnect is provided on an 'as is' basis. We make no warranties regarding the availability or accuracy of the service. To the maximum extent permitted by law, UConnect shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.",
  },
  {
    title: "Changes to Terms",
    icon: "edit",
    content:
      "We may update these Terms from time to time. We will notify you of material changes through the app. Your continued use of UConnect after changes are posted constitutes acceptance of the updated Terms.",
  },
];

export default function TermsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Terms & Conditions</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "20" }]}>
          <Feather name="file-text" size={28} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Terms & Conditions</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Please read these terms carefully before using UConnect. By using our platform, you agree to these terms.
          </Text>
          <Text style={[styles.lastUpdated, { color: colors.mutedForeground }]}>Last updated: April 2025</Text>
        </View>

        {SECTIONS.map((section, i) => (
          <View key={i} style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>  
            <View style={styles.sectionHeader}>  
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}>  
                <Feather name={section.icon as React.ComponentProps<typeof Feather>["name"]} size={16} color={colors.primary} />  
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
