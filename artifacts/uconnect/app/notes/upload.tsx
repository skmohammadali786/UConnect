import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "CS", "Electrical", "Mechanical", "Economics", "Other"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"];

export default function UploadNotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");

  const handleUpload = () => {
    if (!title || !subject || !year) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }
    Alert.alert("Success", "Notes uploaded successfully!", [{ text: "OK", onPress: () => router.back() }]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Upload Notes</Text>
          <View style={{ width: 30 }} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
          {/* File picker */}
          <TouchableOpacity style={[styles.filePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.fileIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="upload-cloud" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.filePickerTitle, { color: colors.foreground }]}>Tap to select file</Text>
            <Text style={[styles.filePickerSub, { color: colors.mutedForeground }]}>PDF, DOCX, PPTX up to 20MB</Text>
          </TouchableOpacity>

          <AppInput label="Title *" placeholder="e.g. Laplace Transform Chapter Notes" value={title} onChangeText={setTitle} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Subject *</Text>
            <View style={styles.chips}>
              {SUBJECTS.map((s) => (
                <TouchableOpacity key={s} onPress={() => setSubject(s)} style={[styles.chip, { backgroundColor: subject === s ? colors.primary : colors.card, borderColor: subject === s ? colors.primary : colors.border }]}>
                  <Text style={[styles.chipText, { color: subject === s ? "#FFF" : colors.foreground }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Year *</Text>
            <View style={styles.chips}>
              {YEARS.map((y) => (
                <TouchableOpacity key={y} onPress={() => setYear(y)} style={[styles.chip, { backgroundColor: year === y ? colors.primary : colors.card, borderColor: year === y ? colors.primary : colors.border }]}>
                  <Text style={[styles.chipText, { color: year === y ? "#FFF" : colors.foreground }]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <AppInput label="Description (optional)" placeholder="What's covered in these notes?" value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ height: 80, textAlignVertical: "top", paddingTop: 10 }} />

          <AppButton title="Upload Notes" onPress={handleUpload} fullWidth size="lg" />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  filePicker: { borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", padding: 32, alignItems: "center", gap: 10 },
  fileIcon: { width: 60, height: 60, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  filePickerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  filePickerSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  field: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
