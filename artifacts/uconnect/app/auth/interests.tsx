import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ALL_INTERESTS } from "@/constants/interests";
import { DEFAULT_AURA_RING } from "@/utils/auraRing";

export default function InterestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, college, username, displayName, dateOfBirth, branch, year, bio, referralCode } = useLocalSearchParams<Record<string, string>>();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const { setUserData } = useAuth();

  const toggle = (interest: string) => {
    setSelected((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : prev.length < 10 ? [...prev, interest] : prev
    );
  };

  const handleDone = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userId = authUser?.id;

      if (!userId) {
        setLoading(false);
        setVerifyModalVisible(true);
        return;
      }

      const phone = (authUser?.user_metadata?.phone as string) ?? "";
      const now = new Date().toISOString();

      const profile = {
        id: userId,
        email: email || authUser?.email || "",
        phone,
        username: username || "",
        display_name: displayName || username || "",
        college: college || "",
        branch: branch || "",
        year: year || "",
        date_of_birth: dateOfBirth || null,
        bio: bio || "",
        avatar: null,
        avatar_ring_color: DEFAULT_AURA_RING,
        banner: null,
        interests: selected,
        followers: 0,
        following: 0,
        posts_count: 0,
        is_verified: false,
        joined_at: now,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profile, { onConflict: "id" });
      if (profileError) {
        console.error("Profile save failed:", profileError.message);
        throw new Error("Failed to save profile. Please try again.");
      }

      const { error: settingsError } = await supabase.from("user_settings").upsert({
        user_id: userId,
        push_notifications: true,
        default_anonymous: false,
        show_sensitive_content: false,
        updated_at: now,
      }, { onConflict: "user_id" });
      if (settingsError) {
        console.error("User settings save failed:", settingsError.message);
        throw new Error("Failed to save settings. Please try again.");
      }

      const code = (referralCode || "").trim().toUpperCase();
      if (code) {
        await supabase.rpc("claim_referral", {
          p_invite_code: code,
          p_referred_user_id: userId,
        }).then(() => {});
      }

      await setUserData({
        id: userId,
        email: profile.email,
        phone,
        username: profile.username,
        displayName: profile.display_name,
        college: profile.college,
        branch: profile.branch,
        year: profile.year,
        bio: profile.bio,
        socialLink: "",
        avatar: null,
        avatarRingColor: DEFAULT_AURA_RING,
        banner: null,
        interests: selected,
        followers: 0,
        following: 0,
        postsCount: 0,
        isVerified: false,
        joinedAt: now,
      });

      router.replace("/(tabs)");
    } catch {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>What are you{"\n"}into?</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Select up to 10 interests. We'll personalize your feed.</Text>
      <View style={styles.chips}>
        {ALL_INTERESTS.map((interest) => {
          const isSelected = selected.includes(interest);
          return (
            <TouchableOpacity
              key={interest}
              onPress={() => toggle(interest)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: isSelected ? "#FFFFFF" : colors.foreground }]}>{interest}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={[styles.counter, { color: colors.mutedForeground }]}>{selected.length}/10 selected</Text>
      <AppButton title="Finish Setup" onPress={handleDone} loading={loading} disabled={selected.length === 0 || loading} fullWidth size="lg" />
      <ConfirmModal
        visible={verifyModalVisible}
        title="Sign in required"
        message="Your session has expired. Please sign in again to complete your onboarding."
        confirmText="Go to Sign In"
        cancelText="Close"
        variant="info"
        onConfirm={() => {
          setVerifyModalVisible(false);
          router.replace({ pathname: "/auth/login", params: { flow: "signin", email: email || "" } });
        }}
        onCancel={() => setVerifyModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 36, letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  counter: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
