import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

const INTERESTS = ["Tech", "Music", "Sports", "Gaming", "Finance", "Arts", "Photography", "Travel", "Food", "Books", "Fitness", "Cinema", "Coding", "ML/AI", "Startups", "Design"];

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { showSuccess } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    await updateUser({ displayName: displayName.trim(), bio: bio.trim(), interests: selectedInterests });
    setSaving(false);
    showSuccess("Profile updated!", "Your changes have been saved.");
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Animated.View style={[styles.container, { backgroundColor: colors.background, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.saveBtnText, { color: colors.primary }]}>{saving ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "50" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {displayName?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <TouchableOpacity style={[styles.changePhotoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="camera" size={14} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Display Name */}
          <AppInput
            label="Display Name"
            placeholder="How you appear to others"
            value={displayName}
            onChangeText={setDisplayName}
            leftIcon="user"
          />

          {/* Bio */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Bio</Text>
            <View style={[styles.bioWrap, { backgroundColor: colors.input, borderColor: bio ? colors.primary + "80" : colors.border }]}>
              <TextInput
                value={bio}
                onChangeText={(t) => t.length <= 160 && setBio(t)}
                placeholder="Tell others about yourself..."
                placeholderTextColor={colors.placeholder}
                multiline
                style={[styles.bioInput, { color: colors.foreground }]}
              />
            </View>
            <Text style={[styles.charCount, { color: colors.mutedForeground }]}>{bio.length}/160</Text>
          </View>

          {/* College (read-only) */}
          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>College</Text>
            <View style={[styles.readonlyField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="lock" size={14} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <Text style={[styles.readonlyText, { color: colors.mutedForeground }]}>{user?.college}</Text>
              <Text style={[styles.readonlyHint, { color: colors.mutedForeground }]}>Verified</Text>
            </View>
          </View>

          {/* Interests */}
          <View style={{ gap: 10 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Interests</Text>
            <View style={styles.interestGrid}>
              {INTERESTS.map((interest) => {
                const selected = selectedInterests.includes(interest);
                return (
                  <TouchableOpacity
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    style={[
                      styles.interestChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.interestText, { color: selected ? "#FFF" : colors.foreground }]}>{interest}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <AppButton title="Save Changes" onPress={handleSave} loading={saving} disabled={!displayName.trim()} fullWidth size="lg" />
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerBtn: { padding: 4 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  avatarSection: { alignItems: "center", gap: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 34, fontFamily: "Inter_700Bold" },
  changePhotoBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  changePhotoText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bioWrap: { borderRadius: 12, borderWidth: 1.5, padding: 12 },
  bioInput: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, minHeight: 80, textAlignVertical: "top" },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  readonlyField: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 13 },
  readonlyText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  readonlyHint: { fontSize: 11, fontFamily: "Inter_500Medium" },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  interestText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
