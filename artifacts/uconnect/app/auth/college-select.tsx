import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";

const COLLEGES = [
  "IIT Delhi", "IIT Bombay", "IIT Madras", "IIT Kanpur", "IIT Kharagpur",
  "IIT Roorkee", "IIT Guwahati", "IIT Hyderabad", "NIT Trichy", "NIT Warangal",
  "NIT Surathkal", "BITS Pilani", "BITS Hyderabad", "BITS Goa", "Delhi University",
  "Jadavpur University", "Anna University", "VIT Vellore", "SRM Chennai",
  "Manipal Institute", "Amity University", "Christ University", "Symbiosis Pune",
  "NMIMS Mumbai", "XLRI Jamshedpur", "IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta",
  "Other",
];

export default function CollegeSelectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");

  const filtered = COLLEGES.filter((c) => c.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Text style={[styles.backText, { color: colors.mutedForeground }]}>← Back</Text>
      </Pressable>
      <Text style={[styles.title, { color: colors.foreground }]}>Select your{"\n"}college</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>This helps verify your college identity</Text>

      <View style={[styles.searchWrapper, { backgroundColor: colors.input, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search colleges..."
          placeholderTextColor={colors.placeholder}
          style={[styles.searchInput, { color: colors.foreground }]}
          autoFocus
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelected(item)}
            style={[
              styles.collegeItem,
              {
                backgroundColor: selected === item ? colors.primary + "15" : colors.card,
                borderColor: selected === item ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.collegeName, { color: selected === item ? colors.primary : colors.foreground }]}>{item}</Text>
            {selected === item && <Feather name="check" size={16} color={colors.primary} />}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <AppButton
          title="Continue"
          onPress={() => router.push({ pathname: "/auth/username", params: { email, college: selected } })}
          disabled={!selected}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { marginBottom: 20, paddingHorizontal: 24 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 36, letterSpacing: -0.5, paddingHorizontal: 24, marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", paddingHorizontal: 24, marginBottom: 20 },
  searchWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 10, marginHorizontal: 24, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  collegeItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 24, marginBottom: 6, padding: 14, borderRadius: 10, borderWidth: 1 },
  collegeName: { fontSize: 15, fontFamily: "Inter_500Medium" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
});
