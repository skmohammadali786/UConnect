import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";

const STEPS = [
  { icon: "user-plus", title: "Invite your batchmates", desc: "Share your unique invite link with college friends." },
  { icon: "check-circle", title: "They sign up with college email", desc: "Only verified students can join your college feed." },
  { icon: "gift", title: "You both get perks", desc: "Unlock early access features for every successful invite." },
];

export default function InviteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showSuccess } = useToast();
  const { user } = useAuth();

  const inviteCode = "UCON-IITD-3X9K";
  const inviteLink = `https://uconnect.app/join?ref=${inviteCode}`;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    showSuccess("Invite code copied!", inviteCode);
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    showSuccess("Link copied to clipboard", "Share it with your batchmates");
  };

  const handleShare = async () => {
    const message = `Hey! Join me on UConnect — the private social network for college students.\n\nUse my invite link: ${inviteLink}`;
    try {
      const result = await Share.share({ message, url: inviteLink, title: "Join UConnect" });
      if (result.action === Share.dismissedAction) return;
    } catch {
      await Clipboard.setStringAsync(inviteLink);
      showSuccess("Link copied to clipboard", "Sharing not supported on this device");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Invite Friends</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, gap: 28, paddingBottom: 40 }}>
        <View style={styles.heroSection}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="gift" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Grow your college community</Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
            Invite batchmates and make UConnect even better. Only verified college students can join.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleCopyCode}
          activeOpacity={0.8}
          style={[styles.inviteBox, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}
        >
          <Text style={[styles.codeLabel, { color: colors.mutedForeground }]}>Your invite code · tap to copy</Text>
          <Text style={[styles.code, { color: colors.primary }]}>{inviteCode}</Text>
          <View style={[styles.copyBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
            <Feather name="copy" size={13} color={colors.primary} />
            <Text style={[styles.copyBadgeText, { color: colors.primary }]}>Copy Code</Text>
          </View>
        </TouchableOpacity>

        <View style={{ gap: 14 }}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepIcon, { backgroundColor: colors.primary + "15" }]}>
                <Feather name={s.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepTitle, { color: colors.foreground }]}>{s.title}</Text>
                <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: 12 }}>
          <AppButton title="Share Invite Link" onPress={handleShare} fullWidth size="lg" icon="share-2" />
          <AppButton title="Copy Invite Link" onPress={handleCopyLink} variant="outline" fullWidth icon="link" />
        </View>

        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Invited</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Joined</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  heroSection: { alignItems: "center", gap: 14 },
  heroIcon: { width: 88, height: 88, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  inviteBox: { alignItems: "center", borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", padding: 20, gap: 10 },
  codeLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  code: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  copyBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  copyBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  step: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  stepIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  stepTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  stepDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 18 },
  statsRow: { flexDirection: "row", paddingTop: 20, borderTopWidth: 1 },
  statItem: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 40, alignSelf: "center" },
});
