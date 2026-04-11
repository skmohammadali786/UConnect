import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Image, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";

const ND = Platform.OS !== "web";
const INTERESTS = ["Tech", "Music", "Sports", "Gaming", "Finance", "Arts", "Photography", "Travel", "Food", "Books", "Fitness", "Cinema", "Coding", "ML/AI", "Startups", "Design"];

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar || null);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: ND }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: ND }),
    ]).start();
  }, []);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handlePickPhoto = async () => {
    if (Platform.OS === "web") {
      showInfo("Photo upload", "Photo picking works best on the mobile app. On web, we'll use your initial instead.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showError("Permission denied", "Please allow access to your photo library in Settings.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
        showSuccess("Photo selected!", "Save your profile to apply the change.");
      }
    } catch {
      showError("Failed to pick photo", "Please try again.");
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      showError("Name required", "Please enter a display name.");
      return;
    }
    setSaving(true);
    await updateUser({ displayName: displayName.trim(), bio: bio.trim(), interests: selectedInterests, avatar: avatarUri });
    setSaving(false);
    showSuccess("Profile updated! ✨", "Your changes have been saved.");
    router.back();
  };

  const initials = displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "U";

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
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarTap} activeOpacity={0.85}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={[styles.avatarImg, { borderColor: colors.primary + "60" }]} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "50" }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                </View>
              )}
              <View style={[styles.cameraOverlay, { backgroundColor: colors.primary }]}>
                <Feather name="camera" size={13} color="#FFF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickPhoto} style={[styles.changePhotoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="camera" size={14} color={colors.primary} />
              <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <AppInput
            label="Display Name"
            placeholder="How you appear to others"
            value={displayName}
            onChangeText={setDisplayName}
            leftIcon="user"
          />

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

          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>College</Text>
            <View style={[styles.readonlyField, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="lock" size={14} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <Text style={[styles.readonlyText, { color: colors.mutedForeground }]}>{user?.college}</Text>
              <View style={[styles.verifiedBadge, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="check" size={11} color={colors.primary} />
                <Text style={[styles.verifiedText, { color: colors.primary }]}>Verified</Text>
              </View>
            </View>
          </View>

          <View style={{ gap: 10 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Interests ({selectedInterests.length} selected)</Text>
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
                    {selected && <Feather name="check" size={11} color="#FFF" />}
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
  avatarTap: { position: "relative" },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5 },
  avatarText: { fontSize: 38, fontFamily: "Inter_700Bold" },
  cameraOverlay: { position: "absolute", bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: "#fff" },
  changePhotoBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  changePhotoText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bioWrap: { borderRadius: 12, borderWidth: 1.5, padding: 12 },
  bioInput: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, minHeight: 80, textAlignVertical: "top" },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  readonlyField: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 13, gap: 0 },
  readonlyText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  interestText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
