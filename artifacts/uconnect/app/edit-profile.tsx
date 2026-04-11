import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

const INTERESTS = ["Tech", "Music", "Sports", "Gaming", "Finance", "Arts", "Photography", "Travel", "Food", "Books", "Fitness", "Cinema"];

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["Tech", "Gaming"]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Edit Profile</Text>
          <View style={{ width: 30 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {displayName?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <TouchableOpacity style={[styles.changePhotoBtn, { borderColor: colors.border }]}>
              <Feather name="camera" size={14} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
            </TouchableOpacity>
          </View>
          <AppInput label="Display Name" placeholder="How you appear to others" value={displayName} onChangeText={setDisplayName} leftIcon="user" />
          <View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Bio</Text>
            <View style={[styles.bioInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AppInput placeholder="Tell others about yourself..." value={bio} onChangeText={(t) => t.length <= 160 && setBio(t)} multiline style={{ height: 80, textAlignVertical: "top", paddingTop: 8, borderWidth: 0, backgroundColor: "transparent" }} />
            </View>
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{bio.length}/160</Text>
          </View>
          <AppInput label="College" value={user?.college || "IIT Delhi"} editable={false} leftIcon="book" style={{ opacity: 0.6 }} />
          <View>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Interests</Text>
            <View style={styles.interestGrid}>
              {INTERESTS.map((interest) => {
                const selected = selectedInterests.includes(interest);
                return (
                  <TouchableOpacity key={interest} onPress={() => toggleInterest(interest)} style={[styles.interestChip, { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border }]}>
                    <Text style={[styles.interestText, { color: selected ? "#FFF" : colors.foreground }]}>{interest}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <AppButton title="Save Changes" onPress={() => { Alert.alert("Saved!", "Your profile has been updated.", [{ text: "OK", onPress: () => router.back() }]); }} fullWidth size="lg" />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  avatarSection: { alignItems: "center", gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 34, fontFamily: "Inter_700Bold" },
  changePhotoBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  changePhotoText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  bioInput: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  interestText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
