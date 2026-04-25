import { Feather } from "@expo/vector-icons";
import { Image } from "react-native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";
import {
  Animated, Easing, FlatList, Platform, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PostCard } from "@/components/PostCard";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import type { Post } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/components/Toast";
import { TypewriterText } from "@/components/TypewriterText";
import { useSocial } from "@/context/SocialContext";
import { useChat } from "@/context/ChatContext";
import { useTheme } from "@/context/ThemeContext";
import { supabase } from "@/lib/supabase";
import { setTabBarVisible } from "@/utils/tabBarVisibility";

type FilterKey = "Latest" | "Trending" | "Following";

const FILTERS: Array<{ key: FilterKey; label: FilterKey }> = [
  { key: "Latest", label: "Latest" },
  { key: "Trending", label: "Trending" },
  { key: "Following", label: "Following" },
];

const SHORTCUTS = [
  { icon: "message-circle", label: "Confessions", route: "/confessions" },
  { icon: "briefcase", label: "Internships", route: "/internships" },
  { icon: "calendar", label: "Events", route: "/events" },
  { icon: "users", label: "Teams", route: "/teams" },
  { icon: "book-open", label: "Notes", route: "/notes" },
  { icon: "send", label: "Chats", route: "/chat" },
];

interface ProfileRow {
  id: string;
  username: string;
}

function FilterIcon({ tab, color }: { tab: FilterKey; color: string }) {
  if (tab === "Latest") {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
        <Path d="M12 7.8V12.2L14.8 14.6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (tab === "Trending") {
    return (
      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <Path d="M3.5 16L9.2 10.3L13.3 14.4L20.5 7.2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16.5 7.2H20.5V11.2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Circle cx="8.5" cy="8" r="3.1" stroke={color} strokeWidth="2" />
      <Path d="M3.8 17.2C4.8 14.8 6.4 13.4 8.6 13.4C10.8 13.4 12.4 14.8 13.4 17.2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M14.1 11.3L16.1 13.3L20.2 9.2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AnimatedPostCard({ post, index, currentUserId, onDelete }: any) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(56)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    const delay = Math.min(index * 90, 500);
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.spring(slideAnim, {
          toValue: 0, friction: 8, tension: 80,
          useNativeDriver: false,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1, friction: 7, tension: 90,
          useNativeDriver: false,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}>
      <PostCard post={post} currentUserId={currentUserId} onDelete={onDelete} index={index} />
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const { themeMode } = useTheme();
  const scheme = useColorScheme();
  const isDarkTheme = themeMode === "dark" || (themeMode === "system" && (scheme ?? "dark") === "dark");
  const insets = useSafeAreaInsets();
  const { posts, refreshPosts, deletePost } = usePosts();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { conversations } = useChat();
  const { showSuccess } = useToast();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("Latest");
  const [refreshing, setRefreshing] = useState(false);
  const [feedReposts, setFeedReposts] = useState<Array<{ post_id: string; user_id: string; created_at: string; username?: string }>>([]);
  const [filterTrackWidth, setFilterTrackWidth] = useState(0);
  const totalUnreadMessages = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const lastScrollY = useRef(0);
  const lastDirectionAt = useRef(0);

  const headerSlide = useRef(new Animated.Value(-60)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const shortcutFade = useRef(new Animated.Value(0)).current;
  const shortcutSlide = useRef(new Animated.Value(24)).current;
  const activeFilterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1, duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(headerSlide, {
        toValue: 0, duration: 380,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: false,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(shortcutFade, {
          toValue: 1, duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(shortcutSlide, {
          toValue: 0, duration: 360,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, []);

  const activeFilterIndex = useMemo(
    () => FILTERS.findIndex((item) => item.key === activeFilter),
    [activeFilter],
  );

  useEffect(() => {
    Animated.timing(activeFilterAnim, {
      toValue: activeFilterIndex,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [activeFilterIndex, activeFilterAnim]);

  const loadFeedReposts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("reposts")
        .select("post_id, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      const repostRows = (data ?? []) as { post_id: string; user_id: string; created_at: string }[];
      const userIds = Array.from(new Set(repostRows.map((r) => r.user_id)));
      const { data: profileRows } = userIds.length > 0
        ? await supabase.from("profiles").select("id,username").in("id", userIds)
        : { data: [] as ProfileRow[] };
      const userMap = new Map((profileRows ?? []).map((p) => [p.id, p.username]));
      setFeedReposts(repostRows.map((r) => ({ ...r, username: userMap.get(r.user_id) ?? "unknown" })));
    } catch {
      setFeedReposts([]);
    }
  }, []);

  useEffect(() => {
    loadFeedReposts();
  }, [loadFeedReposts]);

  useEffect(() => {
    setTabBarVisible(true);
    return () => setTabBarVisible(true);
  }, []);

  const { followingIds } = useSocial();

  const postsById = useMemo(() => new Map(posts.map((p) => [p.id, p])), [posts]);
  const repostFeedPosts: Post[] = feedReposts
    .map((r) => {
      const original = postsById.get(r.post_id);
      if (!original) return null;
      return {
        ...original,
        repostedByUserId: r.user_id,
        repostedByUsername: r.username,
        repostedAt: r.created_at,
        feedItemKey: `repost:${r.user_id}:${r.post_id}`,
      };
    })
    .filter(Boolean) as Post[];
  const combinedPosts = [...posts, ...repostFeedPosts];

  const filteredPosts = combinedPosts.filter((p) => {
    if (!settings.showSensitiveContent && p.tag === "Confession" && p.isAnonymous) return false;
    if (activeFilter === "Following") {
      return followingIds.has(p.authorId) || (!!p.repostedByUserId && followingIds.has(p.repostedByUserId));
    }
    return true;
  });

  const getFeedTimestamp = (post: Post) => new Date(post.repostedAt ?? post.createdAt).getTime();

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (activeFilter === "Trending") return (b.upvotes + b.commentCount) - (a.upvotes + a.commentCount);
    return getFeedTimestamp(b) - getFeedTimestamp(a);
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshPosts(), loadFeedReposts()]);
    setTimeout(() => setRefreshing(false), 600);
  }, [refreshPosts, loadFeedReposts]);

  const handleDelete = useCallback((id: string) => {
    deletePost(id);
    showSuccess("Post deleted");
  }, [deletePost, showSuccess]);

  const segmentedTrackColor = isDarkTheme ? "#14251c" : "#f0faf4";
  const segmentedTrackBorderColor = isDarkTheme ? "#2a3f33" : "#e2f0e8";
  const activePillColor = isDarkTheme ? "#1b2b22" : "#ffffff";
  const activePillTextColor = isDarkTheme ? "#62d48d" : "#1a8a4a";
  const inactivePillTextColor = isDarkTheme ? "#7f9488" : "#9aaf9e";
  const segmentedPillWidth = filterTrackWidth > 0 ? (filterTrackWidth - 16) / FILTERS.length : 0;
  const segmentStep = segmentedPillWidth + 4;
  const activePillLeft = activeFilterAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [4, 4 + segmentStep, 4 + segmentStep * 2],
  });

  const headerComponent = (
    <View>
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 4,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.border,
            opacity: headerFade,
            transform: [{ translateY: headerSlide }],
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.logoSmall, isDarkTheme ? { backgroundColor: "#111827", borderColor: "#374151" } : { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }]}>
            <Image source={isDarkTheme ? require("@/assets/images/logo-dark.png") : require("@/assets/images/logo.png")} style={styles.logoImg} resizeMode="contain" />
          </View>
          <View>
            <TypewriterText
              text="UConnect"
              style={[styles.headerTitle, { color: colors.foreground }]}
              delay={350}
              speed={65}
            />
            {user?.college && (
              <Text style={[styles.headerCollege, { color: colors.mutedForeground }]}>{user.college}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={[styles.headerIconBtn, { backgroundColor: colors.input, borderColor: colors.border }]}
        >
          <Feather name="settings" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={{
          opacity: shortcutFade,
          transform: [{ translateY: shortcutSlide }],
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.shortcuts, { borderBottomColor: colors.border }]}
        >
          {SHORTCUTS.map((s) => (
            <TouchableOpacity key={s.label} onPress={() => router.push(s.route as any)} style={styles.shortcut} activeOpacity={0.7}>
              <View style={[styles.shortcutIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name={s.icon as any} size={20} color={colors.primary} />
                {s.label === "Chats" && totalUnreadMessages > 0 && (
                  <View style={[styles.chatBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.chatBadgeText}>{totalUnreadMessages > 99 ? "99+" : totalUnreadMessages}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.shortcutLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={[styles.filterRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <View
            style={[styles.segmentTrack, { backgroundColor: segmentedTrackColor, borderColor: segmentedTrackBorderColor }]}
            onLayout={(event) => setFilterTrackWidth(event.nativeEvent.layout.width)}
          >
            {segmentedPillWidth > 0 && (
              <Animated.View
                style={[
                  styles.activeSegmentPill,
                  {
                    width: segmentedPillWidth,
                    transform: [{ translateX: activePillLeft }],
                    backgroundColor: activePillColor,
                  },
                ]}
              />
            )}
            {FILTERS.map((f) => {
              const isActive = activeFilter === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setActiveFilter(f.key)}
                  style={[
                    styles.segmentPressable,
                    segmentedPillWidth > 0 ? { width: segmentedPillWidth } : { flex: 1 },
                  ]}
                  activeOpacity={0.9}
                >
                  <View style={styles.segmentLabelWrap}>
                    <FilterIcon tab={f.key} color={isActive ? activePillTextColor : inactivePillTextColor} />
                    <Text
                      style={[
                        styles.segmentLabel,
                        {
                          color: isActive ? activePillTextColor : inactivePillTextColor,
                          fontFamily: isActive ? "DMSans_700Bold" : "DMSans_500Medium",
                          fontWeight: isActive ? "700" : "500",
                        },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sortedPosts}
        keyExtractor={(item) => item.feedItemKey ?? item.id}
        renderItem={({ item, index }) => (
          <AnimatedPostCard
            post={item}
            currentUserId={user?.id || ""}
            onDelete={handleDelete}
            index={index}
          />
        )}
        ListHeaderComponent={headerComponent}
        onScroll={(event) => {
          const y = event.nativeEvent.contentOffset.y;
          const delta = y - lastScrollY.current;
          const timestamp = Date.now();
          if (Math.abs(delta) < 8) {
            lastScrollY.current = y;
            return;
          }
          if (delta > 0 && y > 72) {
            if (timestamp - lastDirectionAt.current > 100) {
              setTabBarVisible(false);
              lastDirectionAt.current = timestamp;
            }
          } else if (delta < 0) {
            if (timestamp - lastDirectionAt.current > 100) {
              setTabBarVisible(true);
              lastDirectionAt.current = timestamp;
            }
          }
          lastScrollY.current = y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.card }]}>
              <Feather name={activeFilter === "Following" ? "user-plus" : "wind"} size={36} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {activeFilter === "Following" ? "No posts yet" : "No posts yet"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {activeFilter === "Following"
                ? followingIds.size === 0
                  ? "Follow people to see their posts here"
                  : "People you follow haven't posted yet"
                : "Be the first to post something!"}
            </Text>
            {activeFilter !== "Following" && (
              <TouchableOpacity
                onPress={() => router.push("/create-post")}
                style={[styles.createBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="plus" size={16} color="#FFF" />
                <Text style={styles.createBtnText}>Create Post</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoSmall: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  logoImg: { width: 32, height: 32 },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerCollege: { fontSize: 11, fontFamily: "Inter_400Regular" },
  headerIconBtn: {
    width: 38, height: 38, borderRadius: 10, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  shortcuts: { paddingHorizontal: 12, paddingVertical: 14, gap: 6 },
  shortcut: { alignItems: "center", gap: 6, marginHorizontal: 6 },
  shortcutIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  chatBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  chatBadgeText: { color: "#FFF", fontSize: 10, fontFamily: "Inter_700Bold" },
  shortcutLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  filterRow: { borderBottomWidth: 1, paddingHorizontal: 16, paddingBottom: 12 },
  segmentTrack: {
    width: "100%",
    borderRadius: 100,
    borderWidth: 1.5,
    padding: 4,
    flexDirection: "row",
    gap: 4,
    position: "relative",
  },
  activeSegmentPill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  segmentPressable: {
    height: 42,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  segmentLabelWrap: { flexDirection: "row", alignItems: "center", gap: 7 },
  segmentLabel: { fontSize: 13, lineHeight: 16 },
  emptyState: { alignItems: "center", gap: 14, paddingTop: 64, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  createBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8,
  },
  createBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
