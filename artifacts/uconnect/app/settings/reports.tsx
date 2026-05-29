import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSocial } from "@/context/SocialContext";
import { formatRelativeTime } from "@/utils/time";

const STATUS_CONFIG = {
  pending: { label: "Under Review", color: "#F59E0B", icon: "clock" },
  reviewed: { label: "Reviewed", color: "#3B82F6", icon: "eye" },
  resolved: { label: "Resolved", color: "#00A86B", icon: "check-circle" },
} as const;

const ACTION_COPY: Record<
  string,
  {
    label: string;
    body: string;
    color: string;
    icon: keyof typeof Feather.glyphMap;
  }
> = {
  pending: {
    label: "Waiting for review",
    body: "Your report is in the moderation queue. We take every report seriously.",
    color: "#F59E0B",
    icon: "clock",
  },
  reviewed: {
    label: "Reviewed",
    body: "Moderation reviewed your report and logged the result.",
    color: "#3B82F6",
    icon: "eye",
  },
  no_action: {
    label: "No action taken",
    body: "Moderation reviewed this post and did not find a policy action was needed.",
    color: "#64748B",
    icon: "minus-circle",
  },
  post_deleted: {
    label: "Post deleted",
    body: "The reported post was removed after moderation review.",
    color: "#EF4444",
    icon: "trash-2",
  },
  warning_issued: {
    label: "Warning issued",
    body: "The post owner was warned after moderation review.",
    color: "#F97316",
    icon: "alert-triangle",
  },
  other: {
    label: "Resolved",
    body: "Moderation resolved this report with a custom action.",
    color: "#00A86B",
    icon: "check-circle",
  },
};

export default function MyReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reports, refreshReports } = useSocial();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.headerBg,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          My Reports
        </Text>
        <TouchableOpacity
          onPress={refreshReports}
          style={[styles.refreshBtn, { backgroundColor: colors.secondary }]}
        >
          <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather name="flag" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            No reports yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            When you report a post, it will show up here with review status,
            action details, and moderator notes.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.infoBar,
              {
                backgroundColor: colors.primary + "12",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Feather name="shield" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              You will receive a notification whenever moderation updates one of
              your reports.
            </Text>
          </View>

          {reports.map((report, i) => {
            const status =
              STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
            const action = ACTION_COPY[report.action] || ACTION_COPY.pending;
            const canOpenPost = Boolean(
              report.postId &&
              !report.postWasDeleted &&
              report.action !== "post_deleted",
            );
            return (
              <View
                key={`${report.id}-${i}`}
                style={[
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.reasonBadge,
                      { backgroundColor: colors.secondary },
                    ]}
                  >
                    <Feather
                      name="flag"
                      size={12}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[styles.reasonText, { color: colors.foreground }]}
                      numberOfLines={1}
                    >
                      {report.reason}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: status.color + "18" },
                    ]}
                  >
                    <Feather
                      name={status.icon as any}
                      size={12}
                      color={status.color}
                    />
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                {report.postContentPreview ? (
                  <View
                    style={[
                      styles.previewBox,
                      {
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.previewLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Reported post
                    </Text>
                    <Text
                      style={[styles.previewText, { color: colors.foreground }]}
                      numberOfLines={3}
                    >
                      {report.postContentPreview}
                    </Text>
                    {report.postAuthorUsername ? (
                      <Text
                        style={[
                          styles.authorText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        By @{report.postAuthorUsername}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <View
                  style={[
                    styles.actionNote,
                    {
                      backgroundColor: action.color + "10",
                      borderColor: action.color + "30",
                    },
                  ]}
                >
                  <View style={styles.actionHeader}>
                    <Feather
                      name={action.icon}
                      size={14}
                      color={action.color}
                    />
                    <Text style={[styles.actionTitle, { color: action.color }]}>
                      {action.label}
                    </Text>
                  </View>
                  <Text
                    style={[styles.pendingNoteText, { color: action.color }]}
                  >
                    {report.resolutionMessage || action.body}
                  </Text>
                  {report.reviewedAt ? (
                    <Text style={[styles.reviewedAt, { color: action.color }]}>
                      Updated {formatRelativeTime(report.reviewedAt)}
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.postIdRow,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Feather
                    name={report.postWasDeleted ? "trash-2" : "hash"}
                    size={12}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.postIdText,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {report.postWasDeleted
                      ? "Reported post was deleted"
                      : `Post ID: ${report.postId ?? "Unavailable"}`}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.footerMeta}>
                    <Feather
                      name="clock"
                      size={12}
                      color={colors.mutedForeground}
                    />
                    <Text
                      style={[
                        styles.timestamp,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Reported {formatRelativeTime(report.timestamp)}
                    </Text>
                  </View>
                  {canOpenPost ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: "/post/[id]" as any,
                          params: { id: report.postId },
                        })
                      }
                      style={[
                        styles.openBtn,
                        { backgroundColor: colors.primarySoft },
                      ]}
                    >
                      <Text
                        style={[styles.openBtnText, { color: colors.primary }]}
                      >
                        Open post
                      </Text>
                      <Feather
                        name="arrow-right"
                        size={12}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  infoText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    flex: 1,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reasonBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reasonText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  previewBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  previewLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  authorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionNote: { borderRadius: 10, borderWidth: 1, padding: 10, gap: 6 },
  actionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  postIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  postIdText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  footerMeta: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  timestamp: { fontSize: 12, fontFamily: "Inter_400Regular" },
  reviewedAt: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pendingNoteText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openBtnText: { fontSize: 12, fontFamily: "Inter_700Bold" },
});
