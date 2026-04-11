import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useConfessions } from "@/context/ConfessionsContext";
import { useSettings } from "@/context/SettingsContext";
import { formatRelativeTime } from "@/utils/time";

function ConfessionCard({ item, index, colors, onVote, revealSensitive, onReveal }: any) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {item.hasSensitiveContent && !revealSensitive && !item.userReveal ? (
          <View style={styles.sensitiveBlock}>
            <View style={[styles.sensitiveIcon, { backgroundColor: "#F59E0B20" }]}>
              <Feather name="alert-triangle" size={22} color="#F59E0B" />
            </View>
            <Text style={[styles.sensitiveTitle, { color: colors.foreground }]}>Sensitive Content</Text>
            <Text style={[styles.sensitiveDesc, { color: colors.mutedForeground }]}>This confession may contain sensitive material.</Text>
            <TouchableOpacity onPress={() => onReveal(item.id)} style={[styles.revealBtn, { borderColor: colors.border }]}>
              <Text style={[styles.revealText, { color: colors.mutedForeground }]}>Show anyway</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.content, { color: colors.foreground }]}>{item.content}</Text>
        )}
        <View style={styles.cardFooter}>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => onVote(item.id, "up")} style={[styles.voteBtn, item.userVote === "up" && { backgroundColor: colors.primary + "20" }]}>
              <Feather name="arrow-up" size={15} color={item.userVote === "up" ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.voteCount, { color: item.userVote === "up" ? colors.primary : colors.mutedForeground }]}>{item.upvotes}</Text>
            </TouchableOpacity>
            <View style={styles.voteBtn}>
              <Feather name="message-circle" size={15} color={colors.mutedForeground} />
              <Text style={[styles.voteCount, { color: colors.mutedForeground }]}>{item.commentCount}</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function ConfessionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { confessions, voteConfession } = useConfessions();
  const { settings } = useSettings();
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={{ opacity: headerAnim }}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Confessions</Text>
          <TouchableOpacity onPress={() => router.push("/confessions/create")} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={[styles.banner, { backgroundColor: colors.primary + "0D", borderBottomColor: colors.border }]}>
          <Feather name="shield" size={13} color={colors.primary} />
          <Text style={[styles.bannerText, { color: colors.mutedForeground }]}>100% anonymous · No identity tracking · Safe space</Text>
        </View>
      </Animated.View>

      <FlatList
        data={confessions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ConfessionCard
            item={item}
            index={index}
            colors={colors}
            onVote={voteConfession}
            revealSensitive={settings.showSensitiveContent}
            onReveal={(id: string) => setRevealedIds((prev) => new Set([...prev, id]))}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={44} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No confessions yet</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>Be the first to confess anonymously</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  addBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  bannerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sensitiveBlock: { alignItems: "center", gap: 8, paddingVertical: 16 },
  sensitiveIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sensitiveTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sensitiveDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  revealBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  revealText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  content: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 14 },
  voteBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  voteCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", gap: 8, paddingTop: 80 },
  emptyText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
