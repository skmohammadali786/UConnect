import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";

const TYPES = ["Hackathon", "Startup", "Research", "Competition", "Project", "Other"];

export default function CreateTeamScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [maxMembers, setMaxMembers] = useState("4");
  const [deadline, setDeadline] = useState("");
  const [skills, setSkills] = useState("");

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
          <AppInput label="What you're looking for *" placeholder="e.g. Need a UI/UX designer for hackathon" value={title} onChangeText={setTitle} />
          <AppInput label="Description *" placeholder="Tell potential teammates about the project..." value={description} onChangeText={setDescription} multiline numberOfLines={4} style={{ height: 100, textAlignVertical: "top", paddingTop: 10 }} />
          <AppInput label="Skills Required" placeholder="e.g. React, Python, Design (comma separated)" value={skills} onChangeText={setSkills} />
          <AppInput label="Deadline" placeholder="e.g. Nov 30, 2025" value={deadline} onChangeText={setDeadline} leftIcon="clock" />
          <AppInput label="Max Team Size" value={maxMembers} onChangeText={setMaxMembers} keyboardType="number-pad" leftIcon="users" />
          <View style={styles.typeSection}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
            <View style={styles.chips}>
              {TYPES.map((t) => (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.chip, { backgroundColor: type === t ? colors.primary : colors.card, borderColor: type === t ? colors.primary : colors.border }]}>
                  <Text style={[styles.chipText, { color: type === t ? "#FFF" : colors.foreground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <AppButton title="Post Request" onPress={() => { if (!title || !description) { Alert.alert("Error", "Title and description are required."); return; } Alert.alert("Posted!", "Your team request is now live.", [{ text: "OK", onPress: () => router.back() }]); }} fullWidth size="lg" />
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
