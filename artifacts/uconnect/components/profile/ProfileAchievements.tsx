import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Badge = {
  id?: string;
  label?: string;
  category?: string;
  earned?: boolean;
};

const FALLBACK_BADGES: Badge[] = [
  { id: "campus-explorer", label: "Campus Explorer", category: "Explorer", earned: true },
  { id: "top-contributor", label: "Top Contributor", category: "Contributor" },
  { id: "early-member", label: "Early Member", category: "Member", earned: true },
  { id: "knowledge-builder", label: "Knowledge Builder", category: "Builder" },
  { id: "verified-student", label: "Verified Student", category: "Verified", earned: true },
  { id: "community-leader", label: "Community Leader", category: "Leader" },
];

const PALETTE = ["#16A34A", "#F59E0B", "#8B5CF6", "#0EA5E9", "#22C55E", "#FBBF24"];

export function ProfileAchievements({ badges, colors, onViewAll }: { badges?: Badge[] | null; colors: any; onViewAll?: () => void }) {
  const items = (badges?.length ? badges : FALLBACK_BADGES).slice(0, 6);

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.kicker, { color: colors.primary }]}>ACHIEVEMENTS</Text>
        {onViewAll ? (
          <TouchableOpacity onPress={onViewAll} activeOpacity={0.85}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
        {items.map((badge, index) => {
          const tint = PALETTE[index % PALETTE.length];
          const earned = badge.earned ?? index === 0;
          return (
            <View key={badge.id ?? `${badge.label}-${index}`} style={[styles.badgeCard, { backgroundColor: colors.profileCard ?? colors.card, borderColor: colors.profileCardBorder ?? colors.border, shadowColor: colors.profileShadow ?? colors.shadow }]}> 
              <LinearGradient colors={[`${tint}22`, `${tint}0F`]} style={[styles.badgeIcon, { borderColor: `${tint}55` }]}> 
                <Feather name={earned ? "check" : "star"} size={20} color={tint} />
              </LinearGradient>
              <Text style={[styles.badgeLabel, { color: colors.foreground }]} numberOfLines={2}>{badge.label ?? badge.category ?? "Vault Badge"}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 14 },
  headerRow: { paddingHorizontal: 18, marginBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kicker: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.8 },
  viewAll: { fontSize: 12, fontFamily: "Inter_700Bold" },
  badgeRow: { paddingHorizontal: 16, gap: 10 },
  badgeCard: { width: 86, minHeight: 104, borderRadius: 18, borderWidth: 1, padding: 9, alignItems: "center", justifyContent: "center", gap: 7, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 2 },
  badgeIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  badgeLabel: { fontSize: 10, lineHeight: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
});
