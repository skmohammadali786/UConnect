import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";

const ND = Platform.OS !== "web";

function SettingRow({ icon, label, sub, onPress, isSwitch, switchValue, onSwitchChange, destructive, colors, last, badge }: any) {
  const pressAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    if (!isSwitch) Animated.spring(pressAnim, { toValue: 0.97, tension: 300, friction: 12, useNativeDriver: ND }).start();
  };
  const onPressOut = () => {
    if (!isSwitch) Animated.spring(pressAnim, { toValue: 1, tension: 300, friction: 12, useNativeDriver: ND }).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isSwitch}
        activeOpacity={1}
        style={[styles.row, { borderBottomColor: last ? "transparent" : colors.separator }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: destructive ? "#EF444418" : colors.primary + "18" }]}>
          <Feather name={icon} size={16} color={destructive ? "#EF4444" : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: destructive ? "#EF4444" : colors.foreground }]}>{label}</Text>
          {sub ? <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {isSwitch ? (
          <Switch value={switchValue} onValueChange={onSwitchChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFF" ios_backgroundColor={colors.border} />
        ) : !badge ? (
          <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

function SectionCard({ children, colors }: any) {
  return <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}

function ThemeSelector({ colors }: any) {
  const { themeMode, setThemeMode } = useTheme();
  const { showSuccess } = useToast();
  const options: { key: "dark" | "light" | "system"; icon: string; label: string }[] = [
    { key: "dark", icon: "moon", label: "Dark" },
    { key: "light", icon: "sun", label: "Light" },
    { key: "system", icon: "smartphone", label: "System" },
  ];
  return (
    <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.themeHeader}>
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="monitor" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>Appearance</Text>
      </View>
      <View style={[styles.themeRow, { backgroundColor: colors.surface || colors.secondary, borderRadius: 10 }]}>
        {options.map((o) => (
          <TouchableOpacity
            key={o.key}
            onPress={() => { setThemeMode(o.key); showSuccess(`${o.label} mode enabled`); }}
            style={[styles.themeOption, themeMode === o.key && { backgroundColor: colors.primary }]}
          >
            <Feather name={o.icon as any} size={15} color={themeMode === o.key ? "#FFF" : colors.mutedForeground} />
            <Text style={[styles.themeLabel, { color: themeMode === o.key ? "#FFF" : colors.mutedForeground }]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, deleteAccount } = useAuth();
  const { settings, updateSetting } = useSettings();
  const { showSuccess, showInfo } = useToast();
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: ND }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: ND }),
    ]).start();
  }, []);

  const handleLogout = async () => {
    setLogoutConfirm(false);
    await logout();
    router.replace("/auth/welcome");
  };

  const handleDeleteAccount = async () => {
    setDeleteConfirm(false);
    if (deleteAccount) await deleteAccount();
    router.replace("/auth/welcome");
  };

  return (
    <Animated.View style={[{ flex: 1 }, { backgroundColor: colors.background, opacity: fadeAnim }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <Animated.ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false} style={{ transform: [{ translateY: slideAnim }] }}>
        <TouchableOpacity onPress={() => router.push("/edit-profile")} style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.85}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.profileAvatarImg} />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
              <Text style={[styles.profileAvatarText, { color: colors.primary }]}>
                {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.displayName || user?.username}</Text>
            <Text style={[styles.profileSub, { color: colors.mutedForeground }]}>@{user?.username} · {user?.college}</Text>
          </View>
          <View style={[styles.editBadge, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.editBadgeText, { color: colors.primary }]}>Edit</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT</Text>
        <SectionCard colors={colors}>
          <SettingRow icon="edit-2" label="Edit Profile" onPress={() => router.push("/edit-profile")} colors={colors} />
          <SettingRow icon="at-sign" label="Change Username" onPress={() => router.push("/settings/change-username")} colors={colors} />
          <SettingRow icon="mail" label="College Email" sub={user?.email || "Verified"} onPress={() => showInfo("Email verified", user?.email || "Your verified email")} colors={colors} last />
        </SectionCard>

        <View style={{ height: 20 }} />
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APPEARANCE</Text>
        <ThemeSelector colors={colors} />

        <View style={{ height: 20 }} />
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PREFERENCES</Text>
        <SectionCard colors={colors}>
          <SettingRow
            icon="bell"
            label="Push Notifications"
            sub="Get notified about replies and mentions"
            isSwitch
            switchValue={settings.pushNotifications}
            onSwitchChange={(v: boolean) => { updateSetting("pushNotifications", v); showSuccess(v ? "Notifications on" : "Notifications off"); }}
            colors={colors}
          />
          <SettingRow
            icon="user-x"
            label="Post Anonymously by Default"
            sub={settings.defaultAnonymous ? "New posts start as anonymous" : "New posts show your username"}
            isSwitch
            switchValue={settings.defaultAnonymous}
            onSwitchChange={(v: boolean) => { updateSetting("defaultAnonymous", v); showSuccess(v ? "Anonymous mode on" : "Anonymous mode off"); }}
            colors={colors}
          />
          <SettingRow
            icon="eye"
            label="Show Sensitive Content"
            sub={settings.showSensitiveContent ? "Sensitive confessions shown" : "Sensitive content is hidden"}
            isSwitch
            switchValue={settings.showSensitiveContent}
            onSwitchChange={(v: boolean) => { updateSetting("showSensitiveContent", v); showSuccess(v ? "Showing all content" : "Sensitive content hidden"); }}
            colors={colors}
          />
          <SettingRow
            icon="layout"
            label="Compact Mode"
            sub="Smaller cards for more content"
            isSwitch
            switchValue={settings.compactMode}
            onSwitchChange={(v: boolean) => { updateSetting("compactMode", v); showSuccess(v ? "Compact mode on" : "Compact mode off"); }}
            colors={colors}
            last
          />
        </SectionCard>

        <View style={{ height: 20 }} />
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SAFETY & PRIVACY</Text>
        <SectionCard colors={colors}>
          <SettingRow icon="slash" label="Blocked Users" onPress={() => showInfo("No blocked users", "You haven't blocked anyone yet.")} colors={colors} />
          <SettingRow icon="flag" label="My Reports" sub="See posts you've reported and their status" onPress={() => router.push("/settings/reports" as any)} colors={colors} last />
        </SectionCard>

        <View style={{ height: 20 }} />
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SUPPORT</Text>
        <SectionCard colors={colors}>
          <SettingRow icon="user-plus" label="Invite Friends" onPress={() => router.push("/invite")} colors={colors} />
          <SettingRow icon="star" label="Rate UConnect" onPress={() => router.push("/settings/rate")} colors={colors} />
          <SettingRow icon="help-circle" label="Help & Support" onPress={() => router.push("/settings/help")} colors={colors} />
          <SettingRow icon="info" label="About UConnect" onPress={() => router.push("/settings/about")} colors={colors} last />
        </SectionCard>

        <View style={{ height: 20 }} />
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ACCOUNT ACTIONS</Text>
        <SectionCard colors={colors}>
          <SettingRow icon="log-out" label="Sign Out" sub="You can always sign back in" onPress={() => setLogoutConfirm(true)} colors={colors} />
          <SettingRow icon="trash-2" label="Delete Account" sub="Permanently delete all your data" onPress={() => setDeleteConfirm(true)} destructive colors={colors} last />
        </SectionCard>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>UConnect v1.0.0 · Only for verified students</Text>
      </Animated.ScrollView>

      <ConfirmModal
        visible={logoutConfirm}
        title="Sign Out?"
        message="You'll need to sign in again to access your account. Your data stays safe."
        confirmText="Sign Out"
        cancelText="Stay"
        variant="warning"
        onConfirm={handleLogout}
        onCancel={() => setLogoutConfirm(false)}
      />
      <ConfirmModal
        visible={deleteConfirm}
        title="Delete Account?"
        message="This is permanent and cannot be undone. All your posts, data, and activity will be erased forever."
        confirmText="Delete Forever"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteConfirm(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1, padding: 14 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  profileAvatarImg: { width: 52, height: 52, borderRadius: 26 },
  profileAvatarText: { fontSize: 24, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  profileSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  editBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  editBadgeText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  rowSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#FFF" },
  themeCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden", padding: 14, gap: 12 },
  themeHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  themeRow: { flexDirection: "row", padding: 4, gap: 4 },
  themeOption: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 8 },
  themeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", paddingVertical: 20 },
});
