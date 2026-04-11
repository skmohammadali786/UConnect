import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const INTERESTS = [
  "Coding", "Machine Learning", "Web Dev", "App Dev", "Competitive Programming",
  "Open Source", "Startups", "Finance", "Design", "Photography",
  "Music", "Sports", "Gaming", "Anime", "Movies",
  "Writing", "Research", "Robotics", "Cybersecurity", "Cloud Computing",
  "Blockchain", "AR/VR", "Data Science", "Quant Finance", "Product Management",
];

export default function InterestsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, college, username, displayName, branch, year, bio } = useLocalSearchParams<Record<string, string>>();
  const [selected, setSelected] = useState<string[]>([]);
  const { setUserData } = useAuth();

  const toggle = (interest: string) => {
    setSelected((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : prev.length < 10 ? [...prev, interest] : prev
    );
  };

  const handleDone = async () => {
    const user = {
      id: Date.now().toString(),
      email: email || "",
      username: username || "",
      displayName: displayName || username || "",
      college: college || "",
      branch: branch || "",
      year: year || "",
      bio: bio || "",
      avatar: null,
      interests: selected,
      followers: 0,
      following: 0,
      postsCount: 0,
      isVerified: true,
      joinedAt: new Date().toISOString(),
    };
    await setUserData(user);
    router.replace("/(tabs)/");
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Back</Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]}>What are you{"\n"}into?</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Select up to 10 interests. We'll personalize your feed.</Text>
      <View style={styles.chips}>
        {INTERESTS.map((interest) => {
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
      <AppButton title="Finish Setup" onPress={handleDone} disabled={selected.length === 0} fullWidth size="lg" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 20 },
  backBtn: {},
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 36, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  counter: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
