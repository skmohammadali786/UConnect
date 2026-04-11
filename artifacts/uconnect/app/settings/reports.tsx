import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSocial } from "@/context/SocialContext";
import { formatRelativeTime } from "@/utils/time";

const STATUS_CONFIG = {
  pending: { label: "Under Review", color: "#F59E0B", icon: "clock" },
  reviewed: { label: "Reviewed", color: "#3B82F6", icon: "eye" },
  resolved: { label: "Resolved", color: "#00A86B", icon: "check-circle" },
} as const;

export default function MyReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reports } = useSocial();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border, backgroundColor: colors.headerBg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>My Reports</Text>
        <View style={{ width: 30 }} />
      </View>

      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name="flag" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No reports yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            When you report a post, it will show up here with its review status.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoBar, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Our team reviews all reports within 24–48 hours.
            </Text>
          </View>

          {reports.map((report, i) => {
            const status = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
            return (
              <View key={`${report.postId}-${i}`} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.reasonBadge, { backgroundColor: colors.secondary }]}>
                    <Feather name="flag" size={12} color={colors.mutedForeground} />
                    <Text style={[styles.reasonText, { color: colors.foreground }]}>{report.reason}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + "18" }]}>
                    <Feather name={status.icon as any} size={12} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={[styles.postIdRow, { backgroundColor: colors.secondary }]}>
                  <Feather name="hash" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.postIdText, { color: colors.mutedForeground }]} numberOfLines={1}>
                    Post ID: {report.postId}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <Feather name="clock" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
                    Reported {formatRelativeTime(report.timestamp)}
                  </Text>
                </View>

                {report.status === "pending" && (
                  <View style={[styles.pendingNote, { backgroundColor: "#F59E0B10", borderColor: "#F59E0B30" }]}>
                    <Text style={[styles.pendingNoteText, { color: "#F59E0B" }]}>
                      Your report is in the review queue. We take every report seriously.
                    </Text>
                  </View>
                )}
                {report.status === "reviewed" && (
                  <View style={[styles.pendingNote, { backgroundColor: "#3B82F610", borderColor: "#3B82F630" }]}>
                    <Text style={[styles.pendingNoteText, { color: "#3B82F6" }]}>
                      This report has been reviewed by our moderation team.
                    </Text>
                  </View>
                )}
                {report.status === "resolved" && (
                  <View style={[styles.pendingNote, { backgroundColor: "#00A86B10", borderColor: "#00A86B30" }]}>
                    <Text style={[styles.pendingNoteText, { color: "#00A86B" }]}>
                      Action has been taken. Thank you for keeping UConnect safe.
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  infoBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reasonBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  reasonText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  postIdRow: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  postIdText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  timestamp: { fontSize: 12, fontFamily: "Inter_400Regular" },
  pendingNote: { borderRadius: 10, borderWidth: 1, padding: 10 },
  pendingNoteText: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
});
