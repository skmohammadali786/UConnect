import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { useGhostMode } from "@/context/GhostModeContext";

export default function PostInternshipScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const ghost = useGhostMode();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stipend, setStipend] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Remote");
  const [duration, setDuration] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!company.trim() || !role.trim()) {
      showError("Missing fields", "Company and role are required.");
      return;
    }
    if (!user) {
      showError("Not logged in", "Please sign in to post an internship.");
      return;
    }
    if (!ghost.canPerformIdentityAction("create_internship")) {
      showError("Ghost Mode active", "Turn off Ghost Mode before posting internships.");
      return;
    }
    setLoading(true);
    try {
      const skillsArray = skills.trim()
        ? skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const { error } = await supabase.from("internships").insert({
        company: company.trim(),
        role: role.trim(),
        stipend: stipend.trim() || "Not specified",
        location: location.trim() || "Not specified",
        type,
        duration: duration.trim() || "Not specified",
        deadline: deadline.trim() || "Not specified",
        description: description.trim(),
        skills: skillsArray,
        poster_id: user.id,
        poster_username: user.username,
        is_verified: false,
      });

      if (error) throw error;
      showSuccess("Posted!", "Your internship listing is now live.");
      router.back();
    } catch (err: any) {
      showError("Error", err?.message ?? "Failed to post internship. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Post Internship</Text>
          <View style={{ width: 30 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <AppInput label="Company Name *" placeholder="e.g. Google, Microsoft, Startup" value={company} onChangeText={setCompany} leftIcon="briefcase" />
          <AppInput label="Role *" placeholder="e.g. Software Engineering Intern" value={role} onChangeText={setRole} leftIcon="user" />
          <AppInput label="Stipend" placeholder="e.g. ₹50,000/month or Unpaid" value={stipend} onChangeText={setStipend} leftIcon="dollar-sign" />
          <AppInput label="Location" placeholder="e.g. Bangalore / Remote" value={location} onChangeText={setLocation} leftIcon="map-pin" />
          <AppInput label="Duration" placeholder="e.g. 3 months" value={duration} onChangeText={setDuration} leftIcon="clock" />
          <AppInput label="Application Deadline" placeholder="e.g. Dec 30, 2025" value={deadline} onChangeText={setDeadline} leftIcon="calendar" />
          <AppInput
            label="Required Skills (comma separated)"
            placeholder="e.g. React, Python, SQL"
            value={skills}
            onChangeText={setSkills}
            leftIcon="code"
          />
          <AppInput
            label="Description"
            placeholder="Describe the role, responsibilities, and requirements..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: "top", paddingTop: 10 }}
          />
          <View style={styles.typeSection}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Work Type</Text>
            <View style={styles.typeRow}>
              {["Remote", "Hybrid", "Onsite"].map((t) => (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.typeChip, { backgroundColor: type === t ? colors.primary : colors.card, borderColor: type === t ? colors.primary : colors.border }]}>
                  <Text style={[styles.typeChipText, { color: type === t ? "#FFF" : colors.foreground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <AppButton title="Post Internship" onPress={handlePost} fullWidth size="lg" loading={loading} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  typeSection: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  typeRow: { flexDirection: "row", gap: 10 },
  typeChip: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  typeChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
