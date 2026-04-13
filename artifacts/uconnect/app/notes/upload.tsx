import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { AppInput } from "@/components/AppInput";
import { useColors } from "@/hooks/useColors";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Computer Science", "Data Structures", "Algorithms", "DBMS", "Operating Systems",
  "Computer Networks", "Machine Learning", "AI", "Cloud Computing", "Cybersecurity", "Software Engineering", "Web Development",
  "Mobile Development", "Electrical", "Electronics", "Digital Electronics", "Signal Processing", "Control Systems", "Mechanical",
  "Thermodynamics", "Fluid Mechanics", "Manufacturing", "Civil", "Structural Engineering", "Transportation", "Environmental Science",
  "Economics", "Statistics", "Linear Algebra", "Discrete Mathematics", "Probability", "Business Studies", "Finance", "Marketing",
  "MBA", "BSc Physics", "BSc Chemistry", "BSc Mathematics", "BSc Computer Science", "Biology", "Biotechnology", "Microbiology",
  "Psychology", "Sociology", "English", "History", "Geography", "Law", "Other",
];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Postgraduate"];

export default function UploadNotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrlsRaw, setImageUrlsRaw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!title.trim() || !subject || !year) {
      showError("Missing fields", "Please fill in the title, subject, and year.");
      return;
    }
    if (!user) {
      showError("Not logged in", "Please sign in to upload notes.");
      return;
    }
    setLoading(true);
    try {
      const imageUrls = imageUrlsRaw
        .split(/[\n,]/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 10);
      const payload = {
        title: title.trim(),
        subject,
        year,
        college: user.college || "All Colleges",
        uploader_id: user.id,
        uploader_username: user.username,
        description: description.trim(),
        file_url: "",
        file_type: imageUrls.length > 0 ? "images" : "pdf",
        image_urls: imageUrls,
        downloads: 0,
        saves: 0,
      };
      let { error } = await supabase.from("notes").insert(payload as any);
      if (error && String(error.message || "").toLowerCase().includes("image_urls")) {
        const fallbackPayload: any = { ...payload };
        delete fallbackPayload.image_urls;
        ({ error } = await supabase.from("notes").insert(fallbackPayload));
      }

      if (error) throw error;
      showSuccess("Notes shared!", "Your notes are now available for your college community.");
      router.back();
    } catch (err: any) {
      showError("Error", err?.message ?? "Failed to upload notes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Share Notes</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.infoBanner, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Feather name="info" size={15} color={colors.primary} />
            <Text style={[styles.infoBannerText, { color: colors.primary }]}>
              Share your notes with your college community. File upload coming soon.
            </Text>
          </View>

          <AppInput label="Title *" placeholder="e.g. Laplace Transform Chapter Notes" value={title} onChangeText={setTitle} />

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Subject *</Text>
            <View style={styles.chips}>
              {SUBJECTS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setSubject(s)}
                  style={[styles.chip, {
                    backgroundColor: subject === s ? colors.primary : colors.card,
                    borderColor: subject === s ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[styles.chipText, { color: subject === s ? "#FFF" : colors.foreground }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Year *</Text>
            <View style={styles.chips}>
              {YEARS.map((y) => (
                <TouchableOpacity
                  key={y}
                  onPress={() => setYear(y)}
                  style={[styles.chip, {
                    backgroundColor: year === y ? colors.primary : colors.card,
                    borderColor: year === y ? colors.primary : colors.border,
                  }]}
                >
                  <Text style={[styles.chipText, { color: year === y ? "#FFF" : colors.foreground }]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <AppInput
            label="Description (optional)"
            placeholder="What topics are covered in these notes?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={{ height: 80, textAlignVertical: "top", paddingTop: 10 }}
          />

          <AppInput
            label="Image URLs (optional, up to 10)"
            placeholder="Paste image links separated by comma or new line"
            value={imageUrlsRaw}
            onChangeText={setImageUrlsRaw}
            multiline
            numberOfLines={4}
            style={{ height: 100, textAlignVertical: "top", paddingTop: 10 }}
          />

          <View style={[styles.guideline, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <Text style={[styles.guidelineText, { color: colors.mutedForeground }]}>
              Only share notes you own or have rights to share. Plagiarised content will be removed.
            </Text>
          </View>

          <AppButton title="Share Notes" onPress={handleUpload} fullWidth size="lg" loading={loading} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  infoBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  infoBannerText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  field: { gap: 8 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  guideline: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  guidelineText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
});
