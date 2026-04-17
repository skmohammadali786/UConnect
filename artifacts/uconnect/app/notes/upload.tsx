import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
type SelectedImage = { uri: string; mimeType?: string; fileName?: string };

function getImageFileExtension(image: SelectedImage) {
  const fromName = image.fileName?.split(".").pop()?.toLowerCase();
  const fromMime = image.mimeType?.split("/")[1]?.toLowerCase();
  const ext = fromName || fromMime || "jpg";
  if (ext === "jpeg") return "jpg";
  if (["jpg", "png", "webp", "heic", "heif", "gif"].includes(ext)) return ext;
  return "jpg";
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = base64.replace(/=+$/, "");
  let bytes = 0;
  let buffer = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 1) {
    const value = chars.indexOf(clean[i]);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bytes += 6;
    if (bytes >= 8) {
      bytes -= 8;
      out.push((buffer >> bytes) & 0xff);
    }
  }
  return Uint8Array.from(out).buffer;
}

async function uriToUploadBody(uri: string): Promise<Blob | ArrayBuffer> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    return await res.blob();
  }
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return base64ToArrayBuffer(base64);
}

export default function UploadNotesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError, showInfo } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [loading, setLoading] = useState(false);

  const handlePickImages = async () => {
    if (images.length >= 10) {
      showError("Limit reached", "You can upload up to 10 images.");
      return;
    }
    if (Platform.OS === "web") {
      showInfo("Mobile recommended", "Image selection works best on mobile app.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showError("Permission denied", "Allow photo access in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10 - images.length,
      quality: 0.85,
    });
    if (result.canceled) return;
    const next = result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType ?? undefined, fileName: a.fileName ?? undefined }));
    setImages((prev) => [...prev, ...next].slice(0, 10));
  };

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
      const imageUrls: string[] = [];
      for (let imageIndex = 0; imageIndex < images.length; imageIndex += 1) {
        const image = images[imageIndex];
        const path = `${user.id}/${Date.now()}_${imageIndex}.${getImageFileExtension(image)}`;
        let uploadError: unknown = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const fileBody = await uriToUploadBody(image.uri);
          const { error } = await supabase.storage.from("notes").upload(path, fileBody, {
            contentType: image.mimeType ?? undefined,
            upsert: true,
          });
          uploadError = error;
          if (!uploadError) break;
        }
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("notes").getPublicUrl(path);
        if (publicData?.publicUrl) imageUrls.push(publicData.publicUrl);
      }
      const payload = {
        title: title.trim(),
        subject,
        year,
        college: user.college || "All Colleges",
        uploader_id: user.id,
        uploader_username: user.username,
        description: description.trim(),
        file_url: imageUrls[0] ?? "",
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
              Upload real photos of your notes so other students can open and download them.
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

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Note Photos (optional, up to 10)</Text>
            <TouchableOpacity onPress={handlePickImages} style={[styles.pickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="image" size={15} color={colors.primary} />
              <Text style={[styles.pickBtnText, { color: colors.primary }]}>Select Photos</Text>
              <Text style={[styles.pickCount, { color: colors.mutedForeground }]}>{images.length}/10</Text>
            </TouchableOpacity>
            {images.length > 0 && (
              <View style={styles.previewGrid}>
                {images.map((img, i) => (
                  <View key={`${img.uri}_${i}`} style={styles.previewWrap}>
                    <Image source={{ uri: img.uri }} style={styles.previewImg} />
                    <TouchableOpacity
                      onPress={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      style={[styles.removeBtn, { backgroundColor: colors.overlay }]}
                    >
                      <Feather name="x" size={12} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

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
  pickBtn: { height: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  pickBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  pickCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  previewWrap: { width: 72, height: 72, borderRadius: 10, overflow: "hidden" },
  previewImg: { width: "100%", height: "100%" },
  removeBtn: { position: "absolute", top: 3, right: 3, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
});
