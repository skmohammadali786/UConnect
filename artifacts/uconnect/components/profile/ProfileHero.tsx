import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getSocialLinkInfo } from "@/utils/socialLink";

const OFFICIAL_UCONNECT_BADGE_COLOR = "#EE4B2B";
const DEFAULT_VERIFIED_BADGE_COLOR = "#16A34A";

type ProfileInfo = {
  displayName: string;
  username: string;
  college?: string;
  branch?: string;
  year?: string;
  bio?: string;
  avatar?: string | null;
  avatarRingColor?: string | null;
  banner?: string | null;
  socialLink?: string;
  isVerified?: boolean;
};

export function ProfileHero({
  profile,
  colors,
  topInset,
  title,
  leftControl,
  rightControls,
  actions,
  onAvatarPress,
  onQrPress,
  self = false,
}: {
  profile: ProfileInfo;
  colors: any;
  topInset: number;
  title?: React.ReactNode;
  leftControl?: React.ReactNode;
  rightControls?: React.ReactNode;
  actions?: React.ReactNode;
  onAvatarPress?: () => void;
  onQrPress?: () => void;
  self?: boolean;
}) {
  const initials = profile.displayName?.charAt(0)?.toUpperCase() || profile.username?.charAt(0)?.toUpperCase() || "U";
  const socialLinkInfo = getSocialLinkInfo(profile.socialLink ?? "");

  return (
    <View style={[styles.shell, { backgroundColor: colors.profileCard ?? colors.card }]}>
      <View style={[styles.hero, { paddingTop: topInset, backgroundColor: colors.primarySoft ?? colors.primary + "18" }]}>
        {profile.banner ? <Image source={{ uri: profile.banner }} style={styles.heroImage} resizeMode="cover" /> : <LinearGradient colors={[colors.primary + "45", colors.primary + "10", colors.card]} style={StyleSheet.absoluteFill} />}
        <LinearGradient colors={["rgba(3,13,8,0.44)", "rgba(3,13,8,0.08)", "rgba(3,13,8,0.34)"]} style={StyleSheet.absoluteFill} />
        <View style={[styles.heroControls, { top: topInset + 8 }]}>
          <View style={styles.controlSide}>{leftControl}</View>
          {title ? <View style={styles.titleWrap}>{title}</View> : <View />}
          <View style={[styles.controlSide, styles.controlRight]}>{rightControls}</View>
        </View>
      </View>

      <View style={styles.avatarActionRow}>
        <TouchableOpacity onPress={onAvatarPress} activeOpacity={onAvatarPress ? 0.85 : 1} style={styles.avatarWrap}>
          {profile.avatar ? (
            <Image source={{ uri: profile.avatar }} style={[styles.avatarImg, { borderColor: profile.avatarRingColor || colors.avatarRingDefault || colors.card }]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: (profile.avatarRingColor || colors.primary) + "22", borderColor: profile.avatarRingColor || colors.avatarRingDefault || colors.card }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
            </View>
          )}
          {self ? (
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              <Feather name="camera" size={11} color="#FFF" />
            </View>
          ) : null}
        </TouchableOpacity>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>

      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text style={[styles.displayName, { color: colors.foreground }]} numberOfLines={1}>{profile.displayName}</Text>
          {onQrPress ? (
            <TouchableOpacity onPress={onQrPress} style={[styles.qrBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <MaterialCommunityIcons name="qrcode" size={14} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
          {profile.isVerified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: profile.username?.toLowerCase() === "uconnect" ? OFFICIAL_UCONNECT_BADGE_COLOR : DEFAULT_VERIFIED_BADGE_COLOR }]}>
              <Feather name="check" size={10} color="#FFF" />
            </View>
          ) : null}
        </View>
        <Text style={[styles.username, { color: colors.mutedForeground }]}>@{profile.username}</Text>
        <View style={styles.metaRow}>
          {profile.college ? <MetaPill icon="book" label={profile.college} colors={colors} /> : null}
          {profile.branch ? <MetaPill icon="code" label={profile.branch} colors={colors} /> : null}
          {profile.year ? <MetaPill icon="award" label={profile.year} colors={colors} /> : null}
        </View>
        {profile.bio ? <Text style={[styles.bio, { color: colors.foreground }]}>{profile.bio}</Text> : null}
        {socialLinkInfo ? (
          <TouchableOpacity onPress={() => Linking.openURL(socialLinkInfo.url)} activeOpacity={0.85} style={[styles.socialLinkBtn, { backgroundColor: colors.profileSoftGreen ?? colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <MaterialCommunityIcons name={socialLinkInfo.icon as any} size={15} color={colors.primary} />
            <Text style={[styles.socialLinkText, { color: colors.primary }]} numberOfLines={1}>{socialLinkInfo.label}</Text>
            <Feather name="external-link" size={12} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function MetaPill({ icon, label, colors }: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; colors: any }) {
  return (
    <View style={[styles.metaPill, { backgroundColor: colors.profileSoftGreen ?? colors.secondary }]}>
      <Feather name={icon} size={11} color={colors.mutedForeground} />
      <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function ProfileHeroIconButton({ children, onPress, colors }: { children: React.ReactNode; onPress?: () => void; colors: any }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.heroIcon, { backgroundColor: colors.profileGlass ?? "rgba(255,255,255,0.86)", borderColor: "rgba(255,255,255,0.45)" }]}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shell: { borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", marginBottom: 14 },
  hero: { height: 218, overflow: "hidden", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroImage: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroControls: { position: "absolute", left: 16, right: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  controlSide: { minWidth: 42, minHeight: 42, justifyContent: "center" },
  controlRight: { alignItems: "flex-end", flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  titleWrap: { flex: 1, alignItems: "center" },
  heroIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  avatarActionRow: { marginTop: -48, paddingHorizontal: 18, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  avatarWrap: { width: 104, height: 104 },
  avatar: { width: 104, height: 104, borderRadius: 52, alignItems: "center", justifyContent: "center", borderWidth: 5 },
  avatarImg: { width: 104, height: 104, borderRadius: 52, borderWidth: 5, backgroundColor: "#FFF" },
  avatarText: { fontSize: 38, fontFamily: "Inter_700Bold" },
  cameraBadge: { position: "absolute", right: 2, bottom: 6, width: 25, height: 25, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFF" },
  actions: { flexDirection: "row", gap: 8, alignItems: "center", paddingBottom: 8, flexShrink: 1 },
  identity: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16, gap: 6 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  displayName: { flexShrink: 1, fontSize: 23, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  qrBtn: { width: 25, height: 25, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  verifiedBadge: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  username: { fontSize: 14, fontFamily: "Inter_500Medium", marginTop: -2 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 4 },
  metaPill: { maxWidth: "100%", flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: Platform.OS === "web" ? 5 : 4, borderRadius: 20 },
  metaText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginTop: 3 },
  socialLinkBtn: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, maxWidth: "100%", borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, marginTop: 3 },
  socialLinkText: { fontSize: 12, fontFamily: "Inter_700Bold", maxWidth: 210 },
});
