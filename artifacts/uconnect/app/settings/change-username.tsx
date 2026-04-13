import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { supabase } from "@/lib/supabase";

export default function ChangeUsernameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const [username, setUsername] = useState(user?.username || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validate = (u: string) => {
    if (!u.trim()) return "Username is required";
    if (u.length < 3) return "Username must be at least 3 characters";
    if (u.length > 20) return "Username must be 20 characters or less";
    if (!/^[a-z0-9_.]+$/.test(u)) return "Only lowercase letters, numbers, _ and . allowed";
    return "";
  };

  const handleSave = async () => {
    const clean = username.toLowerCase().trim();
    const err = validate(clean);
    if (err) { setError(err); return; }
    if (clean === user?.username) { router.back(); return; }
    setError("");
    setLoading(true);
    try {
      if (user) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", clean)
          .maybeSingle();
        if (existing) {
          setError("Username is already taken. Try another.");
          setLoading(false);
          return;
        }
      }
      await updateUser({ username: clean });
      showSuccess("Username updated!", `You're now @${clean}`);
      router.back();
    } catch {
      showError("Failed", "Could not update username. Try again.");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Change Username</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
            <Feather name="at-sign" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.foreground }]}>Username Rules</Text>
              <Text style={[styles.infoBody, { color: colors.mutedForeground }]}>3–20 characters. Only lowercase letters, numbers, underscores and dots.</Text>
            </View>
          </View>

          <View style={styles.inputWrapper}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="New Username"
                placeholder="your_username"
                value={username}
                onChangeText={(t) => { setUsername(t); setError(""); }}
                autoCapitalize="none"
                autoCorrect={false}
                error={error}
              />
            </View>
          </View>

          {user?.username && (
            <Text style={[styles.current, { color: colors.mutedForeground }]}>
              Current username: <Text style={{ color: colors.primary }}>@{user.username}</Text>
            </Text>
          )}

          <AppButton title="Save Username" onPress={handleSave} loading={loading} fullWidth size="lg" />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoCard: { flexDirection: "row", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "flex-start" },
  infoTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoBody: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
  inputWrapper: { gap: 4 },
  current: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
