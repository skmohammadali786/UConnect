import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useConfessions } from "@/context/ConfessionsContext";
import { useSettings } from "@/context/SettingsContext";
import { formatRelativeTime } from "@/utils/time";
import { TypewriterText } from "@/components/TypewriterText";

const ND = Platform.OS !== "web";

function ConfessionCard({ item, index, colors, onVote, globalReveal, revealedIds, onReveal }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  const voteAnim = useRef(new Animated.Value(1)).current;
  const isRevealed = globalReveal || revealedIds.has(item.id);

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 380, delay: index * 55, useNativeDriver: ND }).start();
  }, []);

  const handleVote = (vote: "up" | "down") => {
    Animated.sequence([
      Animated.spring(voteAnim, { toValue: 1.3, tension: 250, friction: 5, useNativeDriver: ND }),
      Animated.spring(voteAnim, { toValue: 1, tension: 250, friction: 5, useNativeDriver: ND }),
    ]).start();
    onVote(item.id, vote);
  };

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      <TouchableOpacity
        onPress={() => router.push({ pathname: "/confessions/[id]" as any, params: { id: item.id } })}
        activeOpacity={0.85}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {item.hasSensitiveContent && !isRevealed ? (
          <View style={styles.sensitiveBlock}>
            <View style={[styles.sensitiveIcon, { backgroundColor: "#F59E0B15" }]}>
              <Feather name="alert-triangle" size={22} color="#F59E0B" />
            </View>
            <Text style={[styles.sensitiveTitle, { color: colors.foreground }]}>Sensitive Content</Text>
            <Text style={[styles.sensitiveDesc, { color: colors.mutedForeground }]}>This confession may contain sensitive material.</Text>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); onReveal(item.id); }}
              style={[styles.revealBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Feather name="eye" size={14} color={colors.mutedForeground} />
              <Text style={[styles.revealText, { color: colors.mutedForeground }]}>Show anyway</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={[styles.content, { color: colors.foreground }]}>{item.content}</Text>
        )}

        <View style={styles.cardFooter}>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{formatRelativeTime(item.createdAt)}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation?.(); handleVote("up"); }}
              style={[styles.actionBtn, item.userVote === "up" && { backgroundColor: colors.primary + "20" }]}
            >
              <Animated.View style={{ transform: [{ scale: item.userVote === "up" ? voteAnim : new Animated.Value(1) }] }}>
                <Feather name="arrow-up" size={15} color={item.userVote === "up" ? colors.primary : colors.mutedForeground} />
              </Animated.View>
              <Text style={[styles.actionCount, { color: item.userVote === "up" ? colors.primary : colors.mutedForeground }]}>{item.upvotes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/confessions/[id]" as any, params: { id: item.id } })}
              style={styles.actionBtn}
            >
              <Feather name="message-circle" size={15} color={colors.mutedForeground} />
              <Text style={[styles.actionCount, { color: colors.mutedForeground }]}>{item.commentCount}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
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
    Animated.timing(headerAnim, { toValue: 1, duration: 300, useNativeDriver: ND }).start();
  }, []);

  const handleReveal = (id: string) => {
    setRevealedIds((prev) => new Set([...prev, id]));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={{ opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }] }}>
        <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View>
            <TypewriterText
              text="Confessions"
              style={[styles.title, { color: colors.foreground }]}
              delay={300}
              speed={55}
            />
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{confessions.length} anonymous confessions</Text>
          </View>
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
            globalReveal={settings.showSensitiveContent}
            revealedIds={revealedIds}
            onReveal={handleReveal}
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
  backBtn: { padding: 2 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  bannerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  sensitiveBlock: { alignItems: "center", gap: 10, paddingVertical: 12 },
  sensitiveIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  sensitiveTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  sensitiveDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  revealBtn: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  revealText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  content: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actions: { flexDirection: "row", gap: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  actionCount: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", gap: 10, paddingTop: 80 },
  emptyText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySubText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
