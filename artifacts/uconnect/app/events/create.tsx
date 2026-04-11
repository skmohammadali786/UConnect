import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";

const CATEGORIES = ["Tech", "Cultural", "Sports", "Finance", "Academic", "Social", "Other"];

export default function CreateEventScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Create Event</Text>
          <View style={{ width: 30 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <AppInput label="Event Title *" placeholder="e.g. Tech Talk: Machine Learning" value={title} onChangeText={setTitle} leftIcon="calendar" />
          <AppInput label="Location" placeholder="e.g. LH1, Auditorium, or Online" value={location} onChangeText={setLocation} leftIcon="map-pin" />
          <AppInput label="Date" placeholder="e.g. Nov 20, 2025" value={date} onChangeText={setDate} leftIcon="calendar" />
          <AppInput label="Time" placeholder="e.g. 6:00 PM" value={time} onChangeText={setTime} leftIcon="clock" />
          <AppInput label="Max Attendees" placeholder="e.g. 100" value={maxAttendees} onChangeText={setMaxAttendees} keyboardType="number-pad" leftIcon="users" />
          <View style={styles.categorySection}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, { backgroundColor: category === c ? colors.primary : colors.card, borderColor: category === c ? colors.primary : colors.border }]}>
                  <Text style={[styles.chipText, { color: category === c ? "#FFF" : colors.foreground }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <AppButton title="Create Event" onPress={() => { if (!title) { Alert.alert("Error", "Event title is required."); return; } Alert.alert("Created!", "Your event is now live.", [{ text: "OK", onPress: () => router.back() }]); }} fullWidth size="lg" />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  categorySection: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
