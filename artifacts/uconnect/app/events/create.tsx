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

const CATEGORIES = ["Tech", "Cultural", "Sports", "Finance", "Academic", "Social", "Other"];

export default function CreateEventScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      showError("Missing field", "Event title is required.");
      return;
    }
    if (!user) {
      showError("Not logged in", "Please sign in to create an event.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("events").insert({
        title: title.trim(),
        description: description.trim() || title.trim(),
        date: date.trim() || "TBD",
        location: location.trim() || "TBD",
        college: user.college || "All Colleges",
        organizer: user.displayName || user.username,
        organizer_id: user.id,
        rsvp_count: 0,
      });

      if (error) throw error;
      showSuccess("Created!", "Your event is now live for your college community.");
      router.back();
    } catch (err: any) {
      showError("Error", err?.message ?? "Failed to create event. Please try again.");
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
          <Text style={[styles.title, { color: colors.foreground }]}>Create Event</Text>
          <View style={{ width: 30 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <AppInput label="Event Title *" placeholder="e.g. Tech Talk: Machine Learning" value={title} onChangeText={setTitle} leftIcon="calendar" />
          <AppInput
            label="Description"
            placeholder="What's this event about? What can attendees expect?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: "top", paddingTop: 10 }}
          />
          <AppInput label="Location" placeholder="e.g. LH1, Auditorium, or Online" value={location} onChangeText={setLocation} leftIcon="map-pin" />
          <AppInput label="Date" placeholder="e.g. Dec 20, 2025" value={date} onChangeText={setDate} leftIcon="calendar" />
          <AppInput label="Time" placeholder="e.g. 6:00 PM" value={time} onChangeText={setTime} leftIcon="clock" />
          <AppInput label="Max Attendees" placeholder="e.g. 100 (optional)" value={maxAttendees} onChangeText={setMaxAttendees} keyboardType="number-pad" leftIcon="users" />
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
          <AppButton title="Create Event" onPress={handleCreate} fullWidth size="lg" loading={loading} />
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
