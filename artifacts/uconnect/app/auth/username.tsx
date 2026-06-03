import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

const SUGGESTIONS = [
  "shadow_coder", "night_owl_dev", "silent_grinder", "campus_ninja",
  "anon_thinker", "quiet_storm_x", "code_monk_22", "midnight_scholar",
];

function generateSuggestions(email: string): string[] {
  const base = email.split("@")[0].replace(/[^a-z]/gi, "").toLowerCase();
  return [
    `${base}_${Math.floor(Math.random() * 999)}`,
    `anon_${base}`,
    ...SUGGESTIONS.slice(0, 4),
  ].slice(0, 5);
}

export default function UsernameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, college, referralCode } = useLocalSearchParams<{ email: string; college: string; referralCode?: string }>();
  const [username, setUsername] = useState("");
  const [suggestions] = useState(() => generateSuggestions(email || "user"));
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const validate = (u: string) => {
    if (!u) { setError("Username is required"); return false; }
    if (u.length < 3) { setError("At least 3 characters"); return false; }
    if (u.length > 20) { setError("Max 20 characters"); return false; }
    if (!/^[a-z0-9_]+$/.test(u)) { setError("Only lowercase letters, numbers, and _"); return false; }
    setError("");
    return true;
  };

  const handleContinue = async () => {
    if (!validate(username)) return;
    setChecking(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", username)
        .maybeSingle();

      if (data) {
        setError("Username is already taken. Try another.");
        setChecking(false);
        return;
      }
    } catch {
    }
    setChecking(false);
    router.push({ pathname: "/auth/profile-setup", params: { email, college, username, referralCode: referralCode || "" } });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: colors.foreground }]}>Choose a{"\n"}username</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>This is how others identify you when you're not posting anonymously</Text>

      <AppInput
        placeholder="username"
        value={username}
        onChangeText={(t) => { setUsername(t.toLowerCase()); validate(t.toLowerCase()); }}
        autoCapitalize="none"
        autoCorrect={false}
        leftIcon="at-sign"
        error={error}
        maxLength={20}
      />

      <View style={styles.suggestionsSection}>
        <Text style={[styles.suggestionsLabel, { color: colors.mutedForeground }]}>Suggestions</Text>
        <View style={styles.chips}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => { setUsername(s); setError(""); }}
              style={[styles.chip, { backgroundColor: username === s ? colors.primary + "20" : colors.secondary, borderColor: username === s ? colors.primary : colors.border }]}
            >
              <Text style={[styles.chipText, { color: username === s ? colors.primary : colors.foreground }]}>@{s}</Text>
              <Feather name="refresh-cw" size={11} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <AppButton
        title={checking ? "Checking..." : "Continue"}
        onPress={handleContinue}
        disabled={!username || checking}
        fullWidth
        size="lg"
        icon={checking ? undefined : "arrow-right"}
      />
      {checking && (
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 36, letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, textAlign: "center" },
  suggestionsSection: { gap: 10 },
  suggestionsLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
