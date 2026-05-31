import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useTeams } from "@/context/TeamsContext";
import { useToast } from "@/components/Toast";
import { useGhostMode } from "@/context/GhostModeContext";

const TYPES = ["Hackathon", "Startup", "Research", "Competition", "Project", "Other"];

export default function CreateTeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createTeam } = useTeams();
  const { showSuccess, showError } = useToast();
  const ghost = useGhostMode();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [maxMembers, setMaxMembers] = useState("4");
  const [deadline, setDeadline] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!title.trim()) { showError("Title required", "Please add a title for your team post."); return; }
    if (!description.trim()) { showError("Description required", "Please describe what you're looking for."); return; }
    if (!type) { showError("Type required", "Please select a team type."); return; }
    if (!user) { showError("Sign in required", "Please sign in to create a team post."); return; }
    if (!ghost.canPerformIdentityAction("create_team")) { showError("Ghost Mode active", "Turn off Ghost Mode before creating teams."); return; }

    setLoading(true);
    try {
      const skillsList = skills.split(",").map((s) => s.trim()).filter(Boolean);
      const newTeam = await createTeam({
        title: title.trim(),
        description: description.trim(),
        type,
        skills: skillsList,
        maxMembers: parseInt(maxMembers) || 4,
        deadline: deadline.trim() || "Open",
        poster: user?.username || "anonymous",
        posterId: user?.id || "",
      });
      showSuccess("Team post created!", "Your team request is now live.");
      router.replace("/teams");
    } catch {
      showError("Failed to post", "Please try again.");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Find Teammates</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={[styles.infoCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
            <Feather name="users" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>Your post will be visible to all students. Interested members can send join requests which you can approve from your profile.</Text>
          </View>

          <AppInput
            label="What you're looking for *"
            placeholder="e.g. Need a UI/UX designer for hackathon"
            value={title}
            onChangeText={setTitle}
          />
          <AppInput
            label="Description *"
            placeholder="Tell potential teammates about the project, expectations, and time commitment..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ height: 110, textAlignVertical: "top", paddingTop: 10 }}
          />
          <AppInput
            label="Skills Required"
            placeholder="e.g. React, Python, Figma (comma separated)"
            value={skills}
            onChangeText={setSkills}
          />
          <AppInput
            label="Deadline"
            placeholder="e.g. Nov 30, 2025 or Open"
            value={deadline}
            onChangeText={setDeadline}
            leftIcon="clock"
          />
          <AppInput
            label="Max Team Size"
            value={maxMembers}
            onChangeText={setMaxMembers}
            keyboardType="number-pad"
            leftIcon="users"
          />

          <View style={styles.typeSection}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Team Type *</Text>
            <View style={styles.chips}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: type === t ? colors.primary : colors.card,
                      borderColor: type === t ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: type === t ? "#FFF" : colors.foreground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <AppButton title="Post Team Request" onPress={handlePost} loading={loading} fullWidth size="lg" />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoCard: { flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "flex-start" },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
  typeSection: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
