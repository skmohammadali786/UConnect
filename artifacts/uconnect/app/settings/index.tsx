import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const Section = ({ title, children, colors }: any) => (
  <View style={{ marginBottom: 24 }}>
    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{title}</Text>
    <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  </View>
);

const SettingRow = ({ icon, label, onPress, value, isSwitch, switchValue, onSwitchChange, destructive, colors }: any) => (
  <TouchableOpacity onPress={onPress} style={[styles.row, { borderBottomColor: colors.separator }]} disabled={isSwitch}>
    <View style={[styles.iconWrap, { backgroundColor: destructive ? colors.destructive + "15" : colors.primary + "15" }]}>
      <Feather name={icon} size={16} color={destructive ? colors.destructive : colors.primary} />
    </View>
    <Text style={[styles.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>{label}</Text>
    {isSwitch ? (
      <Switch value={switchValue} onValueChange={onSwitchChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" />
    ) : (
      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
    )}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = React.useState(true);
  const [anonymousMode, setAnonymousMode] = React.useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
        <View style={{ width: 30 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 34 : 40 }}>
        {/* Profile card */}
        <TouchableOpacity onPress={() => router.push("/edit-profile")} style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
            <Text style={[styles.profileAvatarText, { color: colors.primary }]}>
              {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileName, { color: colors.foreground }]}>{user?.displayName || user?.username}</Text>
            <Text style={[styles.profileUsername, { color: colors.mutedForeground }]}>@{user?.username} · {user?.college}</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        <Section title="ACCOUNT" colors={colors}>
          <SettingRow icon="user" label="Edit Profile" onPress={() => router.push("/edit-profile")} colors={colors} />
          <SettingRow icon="shield" label="Privacy Settings" onPress={() => router.push("/settings/privacy")} colors={colors} />
          <SettingRow icon="at-sign" label="Change Username" onPress={() => {}} colors={colors} />
          <SettingRow icon="mail" label="College Email" value={user?.email} onPress={() => {}} colors={colors} />
        </Section>

        <Section title="PREFERENCES" colors={colors}>
          <SettingRow icon="bell" label="Push Notifications" isSwitch switchValue={notifications} onSwitchChange={setNotifications} colors={colors} />
          <SettingRow icon="user-x" label="Default Anonymous Mode" isSwitch switchValue={anonymousMode} onSwitchChange={setAnonymousMode} colors={colors} />
          <SettingRow icon="heart" label="Edit Interests" onPress={() => router.push("/settings/interests")} colors={colors} />
        </Section>

        <Section title="SAFETY" colors={colors}>
          <SettingRow icon="slash" label="Blocked Users" onPress={() => router.push("/settings/blocked")} colors={colors} />
          <SettingRow icon="flag" label="My Reports" onPress={() => {}} colors={colors} />
        </Section>

        <Section title="OTHER" colors={colors}>
          <SettingRow icon="gift" label="Invite Friends" onPress={() => router.push("/invite")} colors={colors} />
          <SettingRow icon="star" label="Rate the App" onPress={() => {}} colors={colors} />
          <SettingRow icon="help-circle" label="Help & Support" onPress={() => {}} colors={colors} />
          <SettingRow icon="info" label="About UConnect" onPress={() => {}} colors={colors} />
        </Section>

        <TouchableOpacity
          onPress={() => Alert.alert("Sign Out", "Are you sure you want to sign out?", [{ text: "Cancel", style: "cancel" }, { text: "Sign Out", style: "destructive", onPress: () => { logout(); router.replace("/auth/welcome"); } }])}
          style={[styles.signOutBtn, { borderColor: colors.destructive + "40" }]}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>UConnect v1.0.0 · For college students</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 24 },
  profileAvatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  profileUsername: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 8, marginBottom: 20 },
  signOutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular" },
});
