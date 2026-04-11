import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";

export default function PostInternshipScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stipend, setStipend] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Remote");
  const [duration, setDuration] = useState("");
  const [deadline, setDeadline] = useState("");

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
          <AppInput label="Stipend" placeholder="e.g. ₹50,000/month" value={stipend} onChangeText={setStipend} leftIcon="dollar-sign" />
          <AppInput label="Location" placeholder="e.g. Bangalore / Remote" value={location} onChangeText={setLocation} leftIcon="map-pin" />
          <AppInput label="Duration" placeholder="e.g. 3 months" value={duration} onChangeText={setDuration} leftIcon="clock" />
          <AppInput label="Application Deadline" placeholder="e.g. Nov 30, 2025" value={deadline} onChangeText={setDeadline} leftIcon="calendar" />
          <View style={styles.typeSection}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Type</Text>
            <View style={styles.typeRow}>
              {["Remote", "Hybrid", "Onsite"].map((t) => (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.typeChip, { backgroundColor: type === t ? colors.primary : colors.card, borderColor: type === t ? colors.primary : colors.border }]}>
                  <Text style={[styles.typeChipText, { color: type === t ? "#FFF" : colors.foreground }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <AppButton title="Post Internship" onPress={() => { if (!company || !role) { Alert.alert("Error", "Company and role are required."); return; } Alert.alert("Posted!", "Your internship listing is now live.", [{ text: "OK", onPress: () => router.back() }]); }} fullWidth size="lg" />
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
