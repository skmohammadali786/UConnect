import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, FlatList, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useSocial } from "@/context/SocialContext";
import { useToast } from "@/components/Toast";
import { useColors } from "@/hooks/useColors";
import { supabase } from "@/lib/supabase";

const ND = Platform.OS !== "web";

type ConnectionItem = {
  id: string;
  username: string;
  displayName: string;
  college: string;
  followers: number;
  avatar: string | null;
};

function FadeSlideItem({ children, index, delay = 0 }: { children: React.ReactNode; index: number; delay?: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: ND }),
        Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, useNativeDriver: ND }),
      ]).start();
    }, delay + index * 55);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

export default function ConnectionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isFollowing, toggleFollow } = useSocial();
  const { showSuccess, showError } = useToast();
  const params = useLocalSearchParams<{ userId?: string; mode?: string; username?: string }>();

  const targetUserId = typeof params.userId === "string" ? params.userId : user?.id || "";
  const targetUsernameParam = typeof params.username === "string" ? params.username : "";
  const mode = params.mode === "following" ? "following" : "followers";
  const title = mode === "followers" ? "Followers" : "Following";

  const [list, setList] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetUsername, setTargetUsername] = useState(targetUsernameParam);

  const loadConnections = useCallback(async () => {
    if (!targetUserId) {
      setList([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      if (!targetUsernameParam) {
        const { data: target } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", targetUserId)
          .maybeSingle();
        setTargetUsername(target?.username ?? "");
      }

      const sourceField = mode === "followers" ? "follower_id" : "following_id";
      const filterField = mode === "followers" ? "following_id" : "follower_id";

      const { data: edges, error: edgeError } = await supabase
        .from("following")
        .select(sourceField)
        .eq(filterField, targetUserId);
      if (edgeError) throw edgeError;

      const ids = Array.from(
        new Set(
          (edges ?? [])
            .map((edge: unknown) => {
              if (typeof edge === 'object' && edge !== null && sourceField in edge) {
                return (edge as Record<string, unknown>)[sourceField];
              }
              return undefined;
            })
            .filter((id: unknown): id is string => typeof id === "string")
        )
      );

      if (ids.length === 0) {
        setList([]);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, college, followers, avatar")
        .in("id", ids);
      if (profileError) throw profileError;

      const byId = new Map(
        (profiles ?? []).map((p: unknown) => {
          if (
            p &&
            typeof p === 'object' &&
            'id' in p &&
            typeof (p as { id: unknown }).id === 'string'
          ) {
            return [(p as { id: string }).id, p];
          }
          throw new Error('Invalid profile object: ' + JSON.stringify(p));
        })
      );
    } catch {
      setList([]);
      showError("Could not load list", `Failed to load ${title.toLowerCase()}. Please try again.`);
    } finally {
      setLoading(false);
    }
  }, [mode, showError, targetUserId, targetUsernameParam, title]);

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  const handleFollow = (item: ConnectionItem) => {
    const following = isFollowing(item.id);
    toggleFollow(item.id);
    showSuccess(following ? `Unfollowed @${item.username}` : `Now following @${item.username}!`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title}</Text>
          {targetUsername ? (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>@{targetUsername}</Text>
          ) : null}
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 100 }}
          renderItem={({ item, index }) => {
            const following = isFollowing(item.id);
            const canFollow = !!user && item.id !== user.id;
            return (
              <FadeSlideItem index={index}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/user/[username]", params: { username: item.username } })}
                  activeOpacity={0.88}
                  style={[styles.personCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.avatarImg} />
                  ) : (
                    <View style={[styles.personAvatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.personInitial, { color: colors.primary }]}>
                        {(item.displayName || item.username).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.personName, { color: colors.foreground }]}>{item.displayName || item.username}</Text>
                    <Text style={[styles.personUsername, { color: colors.mutedForeground }]}>@{item.username}</Text>
                    <View style={styles.personMeta}>
                      <Feather name="book" size={10} color={colors.mutedForeground} />
                      <Text style={[styles.personMetaText, { color: colors.mutedForeground }]}>{item.college || "College not set"}</Text>
                      <Text style={[styles.personDot, { color: colors.border }]}>·</Text>
                      <Text style={[styles.personMetaText, { color: colors.mutedForeground }]}>{item.followers} followers</Text>
                    </View>
                  </View>
                  {canFollow ? (
                    <TouchableOpacity
                      onPress={() => handleFollow(item)}
                      style={[
                        styles.followBtn,
                        following
                          ? { backgroundColor: colors.secondary, borderColor: colors.border }
                          : { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[styles.followBtnText, { color: following ? colors.foreground : "#FFF" }]}>
                        {following ? "Following" : "Follow"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </TouchableOpacity>
              </FadeSlideItem>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <Feather name="users" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No {title.toLowerCase()} yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                {mode === "followers" ? "When people follow this profile, they’ll appear here." : "Accounts followed will appear here."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  personCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  personAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 46, height: 46, borderRadius: 23 },
  personInitial: { fontSize: 20, fontFamily: "Inter_700Bold" },
  personName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  personUsername: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  personMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  personMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  personDot: { fontSize: 11 },
  followBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 6 },
});
