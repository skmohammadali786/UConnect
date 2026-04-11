import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";

export default function CreateConfessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handlePost = () => {
    if (!content.trim()) return;
    if (!agreed) {
      Alert.alert("Guidelines", "Please agree to the community guidelines.");
      return;
    }
    Alert.alert("Confession posted!", "Your confession is live anonymously.", [{ text: "OK", onPress: () => router.back() }]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.container, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Anonymous Confession</Text>
          <View style={{ width: 30 }} />
        </View>
        <View style={[styles.anonBadge, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
          <Feather name="shield" size={16} color={colors.primary} />
          <Text style={[styles.anonText, { color: colors.primary }]}>Completely anonymous. Impossible to trace.</Text>
        </View>
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Share something you've never told anyone..."
          placeholderTextColor={colors.placeholder}
          multiline
          style={[styles.textarea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]}
          autoFocus
          maxLength={600}
        />
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>{content.length}/600</Text>
        <TouchableOpacity onPress={() => setAgreed((v) => !v)} style={styles.agreementRow}>
          <View style={[styles.checkbox, { borderColor: agreed ? colors.primary : colors.border, backgroundColor: agreed ? colors.primary : "transparent" }]}>
            {agreed && <Feather name="check" size={12} color="#FFFFFF" />}
          </View>
          <Text style={[styles.agreementText, { color: colors.mutedForeground }]}>I agree to community guidelines. No threats, harassment, or explicit content.</Text>
        </TouchableOpacity>
        <AppButton title="Post Confession" onPress={handlePost} disabled={!content.trim() || !agreed} fullWidth size="lg" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  anonBadge: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 12 },
  anonText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  textarea: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, textAlignVertical: "top" },
  counter: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  agreementRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  agreementText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
});
