import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton } from "@/components/AppButton";
import { useColors } from "@/hooks/useColors";

const ND = Platform.OS !== "web";

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
  const [customCollege, setCustomCollege] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: ND }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: ND }),
    ]).start();
  }, []);

  const filtered = COLLEGES.filter((c) => c.toLowerCase().includes(search.toLowerCase()));
  const isOther = selected === "Other";
  const finalCollege = isOther ? customCollege.trim() : selected;
  const canContinue = !!selected && (!isOther || customCollege.trim().length >= 3);

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16, opacity: fadeAnim }]}>
      <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={colors.mutedForeground} />
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>Back</Text>
        </Pressable>

        <View style={styles.titleSection}>
          <View style={[styles.stepBadge, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.stepText, { color: colors.primary }]}>Step 2 of 4</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Select your{"\n"}college</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>This helps verify your college identity</Text>
        </View>
      </Animated.View>

      <View style={[styles.searchWrapper, { backgroundColor: colors.input, borderColor: search ? colors.primary + "80" : colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search colleges..."
          placeholderTextColor={colors.placeholder}
          style={[styles.searchInput, { color: colors.foreground }]}
          autoFocus
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {isOther && (
        <Animated.View style={[styles.customInputWrap, { backgroundColor: colors.input, borderColor: customCollege.trim().length >= 3 ? colors.primary + "80" : colors.border }]}>
          <Feather name="edit-3" size={16} color={colors.mutedForeground} />
          <TextInput
            value={customCollege}
            onChangeText={setCustomCollege}
            placeholder="Enter your college / university name"
            placeholderTextColor={colors.placeholder}
            style={[styles.customInput, { color: colors.foreground }]}
            autoFocus
            maxLength={80}
          />
        </Animated.View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelected(item)}
            style={[
              styles.collegeItem,
              {
                backgroundColor: selected === item ? colors.primary + "12" : colors.card,
                borderColor: selected === item ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={[styles.collegeIcon, { backgroundColor: item === "Other" ? colors.secondary : (selected === item ? colors.primary + "20" : colors.secondary) }]}>
              <Feather name={item === "Other" ? "edit-2" : "book"} size={14} color={selected === item ? colors.primary : colors.mutedForeground} />
            </View>
            <Text style={[styles.collegeName, { color: selected === item ? colors.primary : colors.foreground }]}>{item}</Text>
            {selected === item && (
              <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                <Feather name="check" size={12} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {selected && (
          <View style={[styles.selectedBanner, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
            <Feather name="check-circle" size={14} color={colors.primary} />
            <Text style={[styles.selectedText, { color: colors.primary }]} numberOfLines={1}>
              {finalCollege || "Enter your college name above"}
            </Text>
          </View>
        )}
        <AppButton
          title="Continue"
          onPress={() => router.push({ pathname: "/auth/username", params: { email, college: finalCollege } })}
          disabled={!canContinue}
          fullWidth
          size="lg"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20, paddingHorizontal: 20 },
  backText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  titleSection: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  stepBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  stepText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 36, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  searchWrapper: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, marginHorizontal: 20, paddingHorizontal: 14, height: 48, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  customInputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, marginHorizontal: 20, paddingHorizontal: 14, height: 52, marginBottom: 12 },
  customInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  collegeItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, gap: 12 },
  collegeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  collegeName: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  checkCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, gap: 10 },
  selectedBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  selectedText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
