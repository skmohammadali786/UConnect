import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/Toast";

function SectionHeader({ title, colors }: any) {
  return <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>;
}

function SettingRow({ icon, label, onPress, isSwitch, switchValue, onSwitchChange, destructive, colors, last }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isSwitch}
      activeOpacity={0.7}
      style={[styles.row, { borderBottomColor: last ? "transparent" : colors.separator }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: destructive ? "#EF444420" : colors.primary + "18" }]}>
        <Feather name={icon} size={16} color={destructive ? "#EF4444" : colors.primary} />
      </View>
      <Text style={[styles.rowLabel, { color: destructive ? "#EF4444" : colors.foreground, flex: 1 }]}>{label}</Text>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.border}
        />
      ) : (
        <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

function SectionCard({ children, colors }: any) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { settings, updateSetting } = useSettings();
  const { showSuccess, showInfo } = useToast();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, []);

  const handleLogout = async () => {
    await logout();
    router.replace("/auth/welcome");
  };

  return (
    <Animated.View style={[{ flex: 1, opacity: fadeAnim }, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <TouchableOpacity onPress={() => router.push("/edit-profile")} style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
            <Text style={[styles.profileAvatarText, { color: colors.primary }]}>
              {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.displayName || user?.username}</Text>
            <Text style={[styles.profileSub, { color: colors.mutedForeground }]}>@{user?.username} · {user?.college}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        <View style={{ height: 20 }} />
        <SectionHeader title="ACCOUNT" colors={colors} />
        <SectionCard colors={colors}>
          <SettingRow icon="edit-2" label="Edit Profile" onPress={() => router.push("/edit-profile")} colors={colors} />
          <SettingRow icon="at-sign" label="Change Username" onPress={() => showInfo("Coming soon!", "Username change will be available shortly.")} colors={colors} />
          <SettingRow icon="mail" label="College Email" onPress={() => showInfo("Email verified", user?.email || "Verified college email")} colors={colors} last />
        </SectionCard>

        <View style={{ height: 20 }} />
        <SectionHeader title="PREFERENCES" colors={colors} />
        <SectionCard colors={colors}>
          <SettingRow
            icon="bell"
            label="Push Notifications"
            isSwitch
            switchValue={settings.pushNotifications}
            onSwitchChange={(v: boolean) => { updateSetting("pushNotifications", v); showSuccess(v ? "Notifications on" : "Notifications off"); }}
            colors={colors}
          />
          <SettingRow
            icon="user-x"
            label="Post Anonymously by Default"
            isSwitch
            switchValue={settings.defaultAnonymous}
            onSwitchChange={(v: boolean) => { updateSetting("defaultAnonymous", v); showSuccess(v ? "Anonymous mode on" : "Anonymous mode off"); }}
            colors={colors}
          />
          <SettingRow
            icon="eye"
            label="Show Sensitive Content"
            isSwitch
            switchValue={settings.showSensitiveContent}
            onSwitchChange={(v: boolean) => { updateSetting("showSensitiveContent", v); showSuccess(v ? "Sensitive content visible" : "Sensitive content hidden"); }}
            colors={colors}
          />
          <SettingRow
            icon="layout"
            label="Compact Mode"
            isSwitch
            switchValue={settings.compactMode}
            onSwitchChange={(v: boolean) => { updateSetting("compactMode", v); showSuccess(v ? "Compact mode on" : "Compact mode off"); }}
            colors={colors}
            last
          />
        </SectionCard>

        <View style={{ height: 20 }} />
        <SectionHeader title="SAFETY" colors={colors} />
        <SectionCard colors={colors}>
          <SettingRow icon="slash" label="Blocked Users" onPress={() => showInfo("No blocked users")} colors={colors} />
          <SettingRow icon="flag" label="My Reports" onPress={() => showInfo("No pending reports")} colors={colors} last />
        </SectionCard>

        <View style={{ height: 20 }} />
        <SectionHeader title="OTHER" colors={colors} />
        <SectionCard colors={colors}>
          <SettingRow icon="user-plus" label="Invite Friends" onPress={() => router.push("/invite")} colors={colors} />
          <SettingRow icon="star" label="Rate UConnect" onPress={() => showInfo("Thanks for the love! ⭐")} colors={colors} />
          <SettingRow icon="help-circle" label="Help & Support" onPress={() => showInfo("Support coming soon!")} colors={colors} />
          <SettingRow icon="info" label="About UConnect v1.0" onPress={() => showInfo("UConnect v1.0", "Built for college students. Private & anonymous.")} colors={colors} last />
        </SectionCard>

        <View style={{ height: 20 }} />
        <TouchableOpacity
          onPress={handleLogout}
          style={[styles.signOutBtn, { borderColor: "#EF444440", backgroundColor: "#EF44440A" }]}
        >
          <Feather name="log-out" size={18} color="#EF4444" />
          <Text style={[styles.signOutText, { color: "#EF4444" }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>UConnect v1.0.0 · Only for verified students</Text>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, borderWidth: 1, padding: 14 },
  profileAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  profileSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8, marginLeft: 2 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  signOutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", paddingBottom: 8 },
});
