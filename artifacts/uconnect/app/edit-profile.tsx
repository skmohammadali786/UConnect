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
import { ALL_INTERESTS } from "@/constants/interests";

const ND = Platform.OS !== "web";
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Postgraduate", "PhD", "Alumni"];
const DEFAULT_AVATAR_RING_COLOR = "#6366F1";
const RING_SWATCHES = ["#6366F1", "#EF4444", "#F59E0B", "#10B981", "#06B6D4", "#8B5CF6", "#EC4899", "#111827"];

const isValidHexColor = (value: string) => /^#([0-9A-F]{3}|[0-9A-F]{6})$/i.test(value.trim());

export default function EditProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [year, setYear] = useState(user?.year || "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(user?.interests || []);
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar || null);
  const [avatarRingColor, setAvatarRingColor] = useState(user?.avatarRingColor || DEFAULT_AVATAR_RING_COLOR);
  const [bannerUri, setBannerUri] = useState<string | null>(user?.banner || null);
  const [saving, setSaving] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

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
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAvatarUri(asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : asset.uri);
        showSuccess("Photo selected!", "Save your profile to apply the change.");
      }
    } catch {
      showError("Failed to pick photo", "Please try again.");
    }
  };

  const handlePickBanner = async () => {
    if (Platform.OS === "web") {
      showInfo("Banner upload", "Banner picking works best on the mobile app.");
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
        aspect: [3, 1],
        quality: 0.75,
        base64: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setBannerUri(asset.base64 ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}` : asset.uri);
        showSuccess("Banner selected!", "Save your profile to apply the change.");
      }
    } catch {
      showError("Failed to pick banner", "Please try again.");
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      showError("Name required", "Please enter a display name.");
      return;
    }
    const normalizedRingColor = isValidHexColor(avatarRingColor) ? avatarRingColor.trim().toUpperCase() : DEFAULT_AVATAR_RING_COLOR;
    setSaving(true);
    await updateUser({
      displayName: displayName.trim(),
      bio: bio.trim(),
      year,
      interests: selectedInterests,
      avatar: avatarUri,
      avatarRingColor: normalizedRingColor,
      banner: bannerUri,
    });
    setAvatarRingColor(normalizedRingColor);
    setSaving(false);
    showSuccess("Profile updated!", "Your changes have been saved.");
    router.back();
  };

  const initials = displayName?.charAt(0)?.toUpperCase() || user?.username?.charAt(0)?.toUpperCase() || "U";
  const previewRingColor = isValidHexColor(avatarRingColor) ? avatarRingColor : DEFAULT_AVATAR_RING_COLOR;

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
          <TouchableOpacity onPress={handlePickBanner} activeOpacity={0.85} style={[styles.bannerPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={styles.bannerImage} resizeMode="cover" />
            ) : (
              <View style={[styles.bannerFallback, { backgroundColor: colors.primary + "16" }]}>
                <Feather name="image" size={20} color={colors.primary} />
                <Text style={[styles.bannerText, { color: colors.primary }]}>Add profile banner</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickPhoto} style={styles.avatarTap} activeOpacity={0.85}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={[styles.avatarImg, { borderColor: previewRingColor }]} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: previewRingColor + "20", borderColor: previewRingColor }]}>
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

          <View style={{ gap: 8 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Profile Photo Ring Color</Text>
            <View style={[styles.colorInputWrap, { backgroundColor: colors.input, borderColor: isValidHexColor(avatarRingColor) ? avatarRingColor : colors.border }]}>
              <View style={[styles.colorPreview, { backgroundColor: isValidHexColor(avatarRingColor) ? avatarRingColor : "transparent", borderColor: colors.border }]} />
              <TextInput
                value={avatarRingColor}
                onChangeText={setAvatarRingColor}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="#6366F1"
                placeholderTextColor={colors.placeholder}
                style={[styles.colorInput, { color: colors.foreground }]}
              />
            </View>
            <View style={styles.colorSwatches}>
              {RING_SWATCHES.map((swatch) => (
                <TouchableOpacity
                  key={swatch}
                  onPress={() => setAvatarRingColor(swatch)}
                  style={[styles.swatchBtn, { backgroundColor: swatch, borderColor: avatarRingColor.toLowerCase() === swatch.toLowerCase() ? colors.foreground : "transparent" }]}
                />
              ))}
            </View>
            <Text style={[styles.helperText, { color: colors.mutedForeground }]}>Use any HEX color (example: #22C55E). This ring will be visible on your public profile.</Text>
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

          <View style={{ gap: 6 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Year</Text>
            <TouchableOpacity
              onPress={() => setShowYearPicker((v) => !v)}
              style={[styles.pickerBtn, { backgroundColor: colors.input, borderColor: year ? colors.primary + "80" : colors.border }]}
            >
              <Feather name="calendar" size={15} color={year ? colors.primary : colors.mutedForeground} style={{ marginRight: 8 }} />
              <Text style={[styles.pickerBtnText, { color: year ? colors.foreground : colors.placeholder }]}>{year || "Select your year"}</Text>
              <Feather name={showYearPicker ? "chevron-up" : "chevron-down"} size={15} color={colors.mutedForeground} />
            </TouchableOpacity>
            {showYearPicker && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {YEARS.map((y) => (
                  <TouchableOpacity
                    key={y}
                    onPress={() => { setYear(y); setShowYearPicker(false); }}
                    style={[styles.dropdownItem, { borderBottomColor: colors.border, backgroundColor: year === y ? colors.primary + "10" : "transparent" }]}
                  >
                    <Text style={[styles.dropdownText, { color: year === y ? colors.primary : colors.foreground }]}>{y}</Text>
                    {year === y && <Feather name="check" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={{ gap: 10 }}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Interests ({selectedInterests.length} selected)</Text>
            <View style={styles.interestGrid}>
              {ALL_INTERESTS.map((interest) => {
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
  bannerPicker: { borderRadius: 14, borderWidth: 1, overflow: "hidden", height: 120 },
  bannerImage: { width: "100%", height: "100%" },
  bannerFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  bannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  avatarSection: { alignItems: "center", gap: 12 },
  avatarTap: { position: "relative" },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5 },
  avatarText: { fontSize: 38, fontFamily: "Inter_700Bold" },
  cameraOverlay: { position: "absolute", bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: "#fff" },
  changePhotoBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
  changePhotoText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  colorInputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  colorPreview: { width: 20, height: 20, borderRadius: 10, borderWidth: 1 },
  colorInput: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  colorSwatches: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 2 },
  swatchBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  helperText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bioWrap: { borderRadius: 12, borderWidth: 1.5, padding: 12 },
  bioInput: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, minHeight: 80, textAlignVertical: "top" },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  readonlyField: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 13, gap: 0 },
  readonlyText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  verifiedText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pickerBtn: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 13 },
  pickerBtnText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  dropdown: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginTop: 4 },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },
  dropdownText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  interestChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  interestText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
