import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";

const BRANCHES = [
  "Computer Science Engineering",
  "Information Technology",
  "Computer Engineering",
  "Software Engineering",
  "Artificial Intelligence",
  "Data Science",
  "Cybersecurity",
  "Electronics and Communication",
  "Electrical Engineering",
  "Electrical and Electronics",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "Aerospace Engineering",
  "Automobile Engineering",
  "Biotechnology Engineering",
  "Biomedical Engineering",
  "Production Engineering",
  "Industrial Engineering",
  "Marine Engineering",
  "Mining Engineering",
  "Petroleum Engineering",
  "Metallurgical Engineering",
  "Textile Engineering",
  "Agricultural Engineering",
  "Food Technology",
  "Environmental Engineering",
  "Instrumentation Engineering",
  "Mechatronics",
  "Power Engineering",
  "BSc Computer Science",
  "BSc Information Technology",
  "BSc Physics",
  "BSc Chemistry",
  "BSc Mathematics",
  "BSc Statistics",
  "BSc Data Science",
  "BSc Biotechnology",
  "BSc Microbiology",
  "BSc Zoology",
  "BSc Botany",
  "BSc Economics",
  "BSc Psychology",
  "BSc Geography",
  "BSc Environmental Science",
  "BSc Forensic Science",
  "BSc Electronics",
  "BSc Nursing",
  "BSc Hospitality",
  "MBA",
  "MBA Finance",
  "MBA Marketing",
  "MBA HR",
  "MBA Operations",
  "MBA Business Analytics",
  "MCA",
  "MTech",
  "MSc",
  "BBA",
  "BCA",
  "BCom",
  "BA",
  "Other",
];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Postgraduate", "PhD", "Alumni"];

export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email, college, username, referralCode: incomingReferralCode } = useLocalSearchParams<{ email: string; college: string; username: string; referralCode?: string }>();
  const [displayName, setDisplayName] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [bio, setBio] = useState("");
  const [referralCode, setReferralCode] = useState((incomingReferralCode || "").toUpperCase());
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.foreground }]}>Set up your{"\n"}profile</Text>

        {/* Avatar placeholder */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="user" size={32} color={colors.mutedForeground} />
          </View>
          <TouchableOpacity>
            <Text style={[styles.uploadText, { color: colors.primary }]}>Upload photo</Text>
          </TouchableOpacity>
        </View>

        <AppInput label="Display Name" placeholder="How should we call you?" value={displayName} onChangeText={setDisplayName} leftIcon="user" />

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Branch</Text>
          <TouchableOpacity onPress={() => { setShowBranchPicker(true); setShowYearPicker(false); }} style={[styles.picker, { backgroundColor: colors.input, borderColor: branch ? colors.primary : colors.border }]}>
            <Text style={[styles.pickerText, { color: branch ? colors.foreground : colors.placeholder }]}>{branch || "Select your branch"}</Text>
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {showBranchPicker && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {BRANCHES.map((b) => (
                <TouchableOpacity key={b} onPress={() => { setBranch(b); setShowBranchPicker(false); }} style={[styles.dropdownItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.dropdownText, { color: branch === b ? colors.primary : colors.foreground }]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Year</Text>
          <TouchableOpacity onPress={() => { setShowYearPicker(true); setShowBranchPicker(false); }} style={[styles.picker, { backgroundColor: colors.input, borderColor: year ? colors.primary : colors.border }]}>
            <Text style={[styles.pickerText, { color: year ? colors.foreground : colors.placeholder }]}>{year || "Select your year"}</Text>
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          {showYearPicker && (
            <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {YEARS.map((y) => (
                <TouchableOpacity key={y} onPress={() => { setYear(y); setShowYearPicker(false); }} style={[styles.dropdownItem, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.dropdownText, { color: year === y ? colors.primary : colors.foreground }]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <AppInput label="Bio (optional)" placeholder="Tell your college what you're about..." value={bio} onChangeText={setBio} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: "top", paddingTop: 12 }} />
        <AppInput
          label="Referral code (optional)"
          placeholder="UCON-XXXXXX-XXXX"
          value={referralCode}
          onChangeText={(t) => setReferralCode(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          leftIcon="gift"
        />

        <AppButton
          title="Continue"
          onPress={() => router.push({ pathname: "/auth/interests", params: { email, college, username, displayName, branch, year, bio, referralCode: referralCode.trim() } })}
          disabled={!displayName.trim() || !branch || !year}
          fullWidth
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24, gap: 18 },
  backBtn: {},
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 36, letterSpacing: -0.5, textAlign: "center" },
  avatarSection: { alignItems: "center", gap: 10 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  uploadText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  picker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderRadius: 10, height: 48, paddingHorizontal: 12 },
  pickerText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  dropdown: { borderRadius: 10, borderWidth: 1, overflow: "hidden", maxHeight: 200 },
  dropdownItem: { padding: 12, borderBottomWidth: 1 },
  dropdownText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
