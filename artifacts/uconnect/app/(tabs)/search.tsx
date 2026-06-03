import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Easing, FlatList, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { usePosts } from "@/context/PostsContext";
import { useAuth } from "@/context/AuthContext";
import { useSocial } from "@/context/SocialContext";
import { useToast } from "@/components/Toast";
import { PostCard } from "@/components/PostCard";
import { AuraRingAvatar } from "@/components/AuraRingAvatar";
import { TypewriterText } from "@/components/TypewriterText";
import { supabase } from "@/lib/supabase";
import { getItem, removeItem, setItem, STORAGE_KEYS } from "@/utils/storage";
import { DEFAULT_AURA_RING, normalizeAuraRingValue } from "@/utils/auraRing";

const ND = Platform.OS !== "web";
const MAX_RECENT_SEARCHES = 8;
const OFFICIAL_UCONNECT_BADGE_COLOR = "#EE4B2B";
const DEFAULT_VERIFIED_BADGE_COLOR = "#16A34A";

const SAMPLE_PEOPLE = [
  { id: "user_cs_nerd", username: "cs_nerd", displayName: "CS Nerd", college: "IIT Bombay", branch: "Computer Science", followers: 342, bio: "ICPC World Finalist. Algorithms & Coffee." },
  { id: "user_startup_girl", username: "startup_girl", displayName: "Startup Girl", college: "IIM Ahmedabad", branch: "MBA", followers: 891, bio: "Building the next big thing. Failed 2x, learning forever." },
  { id: "user_shreya", username: "shreya_ee24", displayName: "Shreya EE", college: "IIT Delhi", branch: "Electrical", followers: 124, bio: "Circuit wizard. Loves robotics." },
  { id: "user_arjun", username: "arjun_mech22", displayName: "Arjun Mech", college: "IIT Delhi", branch: "Mechanical", followers: 89, bio: "Mech + coding." },
  { id: "user_priya", username: "priya_cs23", displayName: "Priya CS", college: "IIT Delhi", branch: "Computer Science", followers: 210, bio: "Full-stack dev. Open source enthusiast." },
];

const DISCOVER = [
  { id: "confessions", icon: "message-circle", label: "Confessions", route: "/confessions", color: "#EF4444", desc: "Anonymous secrets" },
  { id: "internships", icon: "briefcase", label: "Internships", route: "/internships", color: "#8B5CF6", desc: "Find opportunities" },
  { id: "events", icon: "calendar", label: "Events", route: "/events", color: "#F59E0B", desc: "Campus events" },
  { id: "teams", icon: "users", label: "Teams", route: "/teams", color: "#00A86B", desc: "Find your squad" },
  { id: "notes", icon: "book-open", label: "Notes", route: "/notes", color: "#3B82F6", desc: "Study materials" },
  { id: "vault", icon: "shield", label: "Vault", route: "(/tabs)/vault", color: "#7C3AED", desc: "Campus intelligence" },
  { id: "ghost", icon: "cloud-snow", label: "Ghost Mode", route: "/settings/ghost-mode", color: "#64748B", desc: "Anonymous mode" },
  { id: "chat", icon: "send", label: "Chats", route: "/chat", color: "#06B6D4", desc: "Direct messages" },
];

type SearchTab = "posts" | "people" | "tags";
type TrendingTag = { tag: string; posts: number; hot: boolean };
type SearchPostRow = { tag: string | null; content: string | null };

function extractHashtags(content: string): string[] {
  const out: string[] = [];
  const regex = /(^|\s)#([a-zA-Z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const tag = (match[2] ?? "").trim();
    if (tag) out.push(tag.toLowerCase());
  }
  return out;
}

function FadeSlideItem({ children, index, delay = 0, style }: { children: React.ReactNode; index: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(slideAnim, {
          toValue: 0, duration: 380,
          easing: Easing.out(Easing.back(1.15)),
          useNativeDriver: false,
        }),
      ]).start();
    }, delay + index * 60);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, style]}>
      {children}
    </Animated.View>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { posts } = usePosts();
  const { user } = useAuth();
  const { isFollowing, toggleFollow } = useSocial();
  const { showSuccess } = useToast();

  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SearchTab>("posts");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [focused, setFocused] = useState(false);
  const [people, setPeople] = useState<{ id: string; username: string; displayName: string; college: string; branch: string; followers: number; bio: string; avatar: string | null; avatarRingColor: string | null; isVerified: boolean }[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [suggestedPeople, setSuggestedPeople] = useState<{ id: string; username: string; displayName: string; college: string; followers: number; avatar: string | null; avatarRingColor: string | null; isVerified: boolean }[]>([]);
  const [showPeopleDirectory, setShowPeopleDirectory] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const barScaleAnim = useRef(new Animated.Value(1)).current;
  const tabIndicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, tension: 90, friction: 14, useNativeDriver: ND }).start();
    (async () => {
      try {
        const savedSearches = await getItem<unknown>(STORAGE_KEYS.SEARCH_HISTORY);
        if (Array.isArray(savedSearches)) {
          setRecentSearches(savedSearches.filter((v): v is string => typeof v === "string").slice(0, MAX_RECENT_SEARCHES));
        }
      } catch {}

      try {
        const { data: postRows } = await supabase
          .from("posts")
          .select("tag, content")
          .order("created_at", { ascending: false })
          .limit(250);

        if (postRows && postRows.length > 0) {
          const tagCounts = new Map<string, number>();
          const hashCounts = new Map<string, number>();

          (postRows as SearchPostRow[]).forEach((row) => {
            const rowTag = (row.tag ?? "").trim().toLowerCase().replace(/\s+/g, "");
            if (rowTag) tagCounts.set(rowTag, (tagCounts.get(rowTag) ?? 0) + 1);
            extractHashtags(row.content ?? "").forEach((hash) => {
              hashCounts.set(hash, (hashCounts.get(hash) ?? 0) + 1);
            });
          });

          const combined = new Map<string, number>(tagCounts);
          hashCounts.forEach((count, tag) => {
            combined.set(tag, (combined.get(tag) ?? 0) + count);
          });
          const ranked = Array.from(combined.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 24)
            .map(([tag, count], i) => ({ tag, posts: count, hot: i < 4 }));
          setTrendingTags(ranked);
        } else {
          setTrendingTags([]);
        }
      } catch {
        setTrendingTags([]);
      }

      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, college, followers, avatar, avatar_ring_color, is_verified")
          .neq("id", user?.id ?? "")
          .order("followers", { ascending: false })
          .limit(8);
        if (data && data.length > 0) {
          setSuggestedPeople(data.map((r: {
            id: string;
            username: string;
            display_name: string;
            college: string;
            followers?: number;
            avatar?: string | null;
            avatar_ring_color?: string;
            is_verified?: boolean;
          }) => ({
            id: r.id, username: r.username, displayName: r.display_name,
            college: r.college, followers: r.followers ?? 0,
            avatar: r.avatar ?? null,
            avatarRingColor: normalizeAuraRingValue(r.avatar_ring_color ?? DEFAULT_AURA_RING),
            isVerified: Boolean(r.is_verified),
          })));
        } else {
          setSuggestedPeople(SAMPLE_PEOPLE.map((p) => ({ id: p.id, username: p.username, displayName: p.displayName, college: p.college, followers: p.followers, avatar: null, avatarRingColor: DEFAULT_AURA_RING, isVerified: false })));
        }
      } catch {
        setSuggestedPeople(SAMPLE_PEOPLE.map((p) => ({ id: p.id, username: p.username, displayName: p.displayName, college: p.college, followers: p.followers, avatar: null, avatarRingColor: DEFAULT_AURA_RING, isVerified: false })));
      }
    })();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setItem(STORAGE_KEYS.SEARCH_HISTORY, recentSearches.slice(0, MAX_RECENT_SEARCHES));
    }, 200);
    return () => clearTimeout(timer);
  }, [recentSearches]);

  useEffect(() => {
    const q = query.trim();
    if (!q && !showPeopleDirectory) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }
    setPeopleLoading(true);
    const timer = setTimeout(async () => {
      try {
        let request = supabase
          .from("profiles")
          .select("id, username, display_name, college, branch, followers, bio, avatar, avatar_ring_color, is_verified")
          .neq("id", user?.id ?? "");
        if (q) {
          request = request.or(`username.ilike.%${q}%,display_name.ilike.%${q}%,college.ilike.%${q}%`).limit(20);
        } else {
          request = request.order("followers", { ascending: false }).limit(60);
        }
        const { data } = await request;
        setPeople((data ?? []).map((r: unknown) => {
          const rec = r as {
            id: string;
            username: string;
            display_name: string;
            college: string;
            branch: string;
            followers?: number;
            bio?: string;
            avatar?: string | null;
            avatar_ring_color?: string;
            is_verified?: boolean;
          };
          return {
            id: rec.id,
            username: rec.username,
            displayName: rec.display_name,
            college: rec.college,
            branch: rec.branch,
            followers: rec.followers ?? 0,
            bio: rec.bio ?? "",
            avatar: rec.avatar ?? null,
            avatarRingColor: normalizeAuraRingValue(rec.avatar_ring_color ?? DEFAULT_AURA_RING),
            isVerified: Boolean(rec.is_verified),
          };
        }));
      } catch { setPeople([]); }
      setPeopleLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, showPeopleDirectory, user?.id]);

  const onFocus = () => {
    setFocused(true);
    Animated.spring(barScaleAnim, { toValue: 1.015, tension: 200, friction: 10, useNativeDriver: ND }).start();
  };

  const onBlur = () => {
    Animated.spring(barScaleAnim, { toValue: 1, tension: 200, friction: 10, useNativeDriver: ND }).start();
  };

  const elevatedCard = {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 2,
  };

  const handleSearch = (text: string) => {
    setShowPeopleDirectory(false);
    setSelectedTag(null);
    setQuery(text);
  };

  const selectQuery = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setShowPeopleDirectory(false);
    setQuery(trimmed);
    setRecentSearches((prev) => {
      const deduped = prev.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
      return [trimmed, ...deduped].slice(0, MAX_RECENT_SEARCHES);
    });
    setFocused(false);
    inputRef.current?.blur();
  };

  const openTagPosts = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase().replace(/^#/, "");
    if (!normalizedTag) return;
    setSelectedTag(normalizedTag);
    setShowPeopleDirectory(false);
    setQuery(`#${normalizedTag}`);
    switchTab("posts");
    setFocused(false);
    inputRef.current?.blur();
    setRecentSearches((prev) => {
      const deduped = prev.filter((item) => item.toLowerCase() !== normalizedTag);
      return [normalizedTag, ...deduped].slice(0, MAX_RECENT_SEARCHES);
    });
  };

  const clearRecent = () => {
    setRecentSearches([]);
    removeItem(STORAGE_KEYS.SEARCH_HISTORY);
  };

  const handleFollowPerson = (personId: string, username: string) => {
    const wasFollowing = isFollowing(personId);
    toggleFollow(personId);
    showSuccess(wasFollowing ? `Unfollowed @${username}` : `Now following @${username}!`);
  };

  const switchTab = (tab: SearchTab) => {
    const idx = ["posts", "people", "tags"].indexOf(tab);
    Animated.spring(tabIndicatorAnim, { toValue: idx, tension: 120, friction: 14, useNativeDriver: ND }).start();
    setActiveTab(tab);
  };

  const searchTabs: { key: SearchTab; icon: string; label: string }[] = [
    { key: "posts", icon: "file-text", label: "Posts" },
    { key: "people", icon: "users", label: "People" },
    { key: "tags", icon: "hash", label: "Tags" },
  ];

  const filteredPosts = query
    ? posts.filter((p) => {
        if (selectedTag) {
          const normalizedPostTag = (p.tag ?? "").trim().toLowerCase().replace(/\s+/g, "");
          if (normalizedPostTag === selectedTag) return true;
          return extractHashtags(p.content ?? "").includes(selectedTag);
        }
        const q = query.toLowerCase().trim();
        const normalizedHashQuery = q.startsWith("#") ? q.replace(/^#+/, "").replace(/\s+/g, "") : null;
        if (normalizedHashQuery) {
          const normalizedPostTag = (p.tag ?? "").trim().toLowerCase().replace(/\s+/g, "");
          if (normalizedPostTag === normalizedHashQuery) return true;
          return extractHashtags(p.content ?? "").includes(normalizedHashQuery);
        }
        return (
          p.content.toLowerCase().includes(q) ||
          p.tag.toLowerCase().includes(q) ||
          p.authorUsername?.toLowerCase().includes(q)
        );
      })
    : [];

  const filteredPeople = people;

  const filteredTags = query
    ? trendingTags.filter((t) => t.tag.toLowerCase().includes(query.toLowerCase()))
    : trendingTags;

  type Person = {
    id: string;
    avatarRingColor?: string;
    username?: string;
    displayName: string;
    isVerified?: boolean;
    avatar?: string;
  };

  const renderPeopleCard = ({ item, index }: { item: Person; index: number }) => {
    const following = isFollowing(item.id);
    const ringColor = item.avatarRingColor || colors.primary;
    const userType = item.username?.toLowerCase() === "uconnect" ? "official" : "default";
    const badgeColorMap = {
      official: OFFICIAL_UCONNECT_BADGE_COLOR,
      default: DEFAULT_VERIFIED_BADGE_COLOR
    };
    const badgeColor = badgeColorMap[userType];
    return (
      <FadeSlideItem index={index}>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/user/[username]", params: { username: item.username } })}
          activeOpacity={0.88}
          style={[styles.personCard, { backgroundColor: colors.card, borderColor: colors.border }, elevatedCard]}
        >
          <AuraRingAvatar
            avatarUri={item.avatar}
            initials={item.displayName.charAt(0).toUpperCase()}
            ringValue={ringColor}
            size={46}
            ringWidth={2}
            textSize={20}
          />
            <View style={{ flex: 1 }}>
              <View style={styles.personNameRow}>
                <Text style={[styles.personName, { color: colors.foreground }]}>{item.displayName}</Text>
                {item.isVerified && (
                  <View style={[styles.verifiedBadge, { backgroundColor: badgeColor }]}> 
                    <Feather name="check" size={9} color="#FFF" />
                  </View>
                )}
              </View>
              <Text style={[styles.personUsername, { color: colors.mutedForeground }]}>@{item.username}</Text>
            <View style={styles.personMeta}>
              <Feather name="book" size={10} color={colors.mutedForeground} />
              <Text style={[styles.personMetaText, { color: colors.mutedForeground }]}>{item.college}</Text>
              <Text style={[styles.personDot, { color: colors.border }]}>·</Text>
              <Text style={[styles.personMetaText, { color: colors.mutedForeground }]}>{item.followers} followers</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleFollowPerson(item.id, item.username)}
            style={[
              styles.followBtn,
              following
                ? { backgroundColor: colors.secondary, borderColor: colors.border }
                : { backgroundColor: colors.primary },
            ]}
          >
            <Text style={[styles.followBtnText, { color: following ? colors.foreground : "#FFF" }]}>
              {following ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </FadeSlideItem>
    );
  };

  const renderTagCard = ({ item, index }: { item: { tag: string; posts: number; hot?: boolean; }; index: number; }) => (
    <FadeSlideItem index={index}>
      <TouchableOpacity
        onPress={() => openTagPosts(item.tag)}
        style={[styles.tagCard, { backgroundColor: colors.card, borderColor: colors.border }, elevatedCard]}
        activeOpacity={0.88}
      >
        <View style={[styles.tagIconWrap, { backgroundColor: colors.primary + "15" }]}>  
          <Text style={[styles.tagHash, { color: colors.primary }]}>#</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.tagNameRow}>
            <Text style={[styles.tagName, { color: colors.foreground }]}>#{item.tag}</Text>
            {item.hot && (
              <View style={[styles.hotPill, { backgroundColor: "#EF444420", borderColor: "#EF444440" }]}>  
                <Text style={styles.hotText}>Hot</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tagCount, { color: colors.mutedForeground }]}>  
            {item.posts.toLocaleString()} posts
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
    </FadeSlideItem>
  );

  const renderEmptySearch = () => (
    <View style={styles.emptyWrap}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
        <Feather name="search" size={28} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
      <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Try a different keyword or hashtag</Text>
    </View>
  );

  const hasQuery = query.trim().length > 0 || showPeopleDirectory;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.border,
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
          },
        ]}
      >
        <View style={styles.headerTop}>
          <TypewriterText
            text="Search"
            style={[styles.headerTitle, { color: colors.foreground }]}
            delay={360}
            speed={70}
          />
        </View>
        <Animated.View style={[styles.searchBarWrap, { transform: [{ scale: barScaleAnim }] }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: focused ? colors.primary + "80" : colors.border }]}>
            <Feather name="search" size={18} color={focused ? colors.primary : colors.mutedForeground} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={handleSearch}
              onFocus={onFocus}
              onBlur={onBlur}
              placeholder="Posts, people, #hashtags..."
              placeholderTextColor={colors.placeholder}
              style={[styles.searchInput, { color: colors.foreground }]}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={() => query && selectQuery(query)}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={[styles.clearBtn, { backgroundColor: colors.mutedForeground + "30" }]}>
                  <Feather name="x" size={10} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            )}
          </View>
          {focused && (
            <TouchableOpacity
              onPress={() => { setFocused(false); inputRef.current?.blur(); }}
              style={styles.cancelSearchBtn}
            >
              <Text style={[styles.cancelSearchText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {hasQuery && (
          <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
            {searchTabs.map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => switchTab(t.key)}
                style={[styles.tab, activeTab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}
              >
                <Feather name={t.icon as React.ComponentProps<typeof Feather>['name']} size={14} color={activeTab === t.key ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.tabText, { color: activeTab === t.key ? colors.primary : colors.mutedForeground }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Content */}
      {hasQuery ? (
        <View style={{ flex: 1 }}>
          {activeTab === "posts" && (
            <FlatList
              data={filteredPosts}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <FadeSlideItem index={index}>
                  <PostCard post={item} currentUserId={user?.id || ""} />
                </FadeSlideItem>
              )}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptySearch()}
            />
          )}
          {activeTab === "people" && (
            <FlatList
              data={filteredPeople}
              keyExtractor={(item) => item.id}
              renderItem={renderPeopleCard}
              contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={peopleLoading ? (
                <View style={styles.emptyWrap}>
                  <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Loading people...</Text>
                </View>
              ) : renderEmptySearch()}
            />
          )}
          {activeTab === "tags" && (
            <FlatList
              data={filteredTags}
              keyExtractor={(item) => item.tag}
              renderItem={renderTagCard}
              contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptySearch()}
            />
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <FadeSlideItem index={0}>
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent</Text>
                  <TouchableOpacity onPress={clearRecent}>
                    <Text style={[styles.sectionAction, { color: colors.primary }]}>Clear all</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {recentSearches.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => selectQuery(s)}
                      style={[styles.recentChip, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <Feather name="clock" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.recentChipText, { color: colors.foreground }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </FadeSlideItem>
          )}

          {/* Trending Hashtags */}
          <FadeSlideItem index={1} delay={60}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Trending</Text>
              </View>
              <View style={styles.trendingGrid}>
                {trendingTags.slice(0, 6).map((item, i) => (
                  <FadeSlideItem key={item.tag} index={i} delay={100} style={{ width: "31%" }}>
                    <TouchableOpacity
                      onPress={() => openTagPosts(item.tag)}
                      style={[styles.trendCard, { backgroundColor: colors.card, borderColor: colors.border }, elevatedCard]}
                      activeOpacity={0.82}
                    >
                      <View style={styles.trendTop}>
                        <Text style={[styles.trendHash, { color: colors.primary }]}>#</Text>
                      </View>
                      <Text style={[styles.trendTagName, { color: colors.foreground }]}>{item.tag}</Text>
                      <Text style={[styles.trendPostCount, { color: colors.mutedForeground }]}>{item.posts.toLocaleString()} posts</Text>
                    </TouchableOpacity>
                  </FadeSlideItem>
                ))}
              </View>
              {trendingTags.length === 0 && (
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>No trending tags yet</Text>
              )}
            </View>
          </FadeSlideItem>

          {/* People to Follow */}
          <FadeSlideItem index={2} delay={120}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>People to Follow</Text>
                <TouchableOpacity onPress={() => {
                  setShowPeopleDirectory(true);
                  setFocused(false);
                  inputRef.current?.blur();
                  switchTab("people");
                }}>
                  <Text style={[styles.sectionAction, { color: colors.primary }]}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
                {suggestedPeople.slice(0, 4).map((person, i) => {
                  const following = isFollowing(person.id);
                  const ringColor = person.avatarRingColor || colors.primary;
                  const isOfficial = person.username?.toLowerCase() === "uconnect";
                  const badgeColor = isOfficial ? OFFICIAL_UCONNECT_BADGE_COLOR : DEFAULT_VERIFIED_BADGE_COLOR;
                  return (
                    <FadeSlideItem key={person.id} index={i} delay={140}>
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: "/user/[username]", params: { username: person.username } })}
                        style={[styles.personHorizontalCard, { backgroundColor: colors.card, borderColor: colors.border }, elevatedCard]}
                        activeOpacity={0.85}
                      >
                        <AuraRingAvatar
                          avatarUri={person.avatar}
                          initials={(person.displayName ?? person.username).charAt(0).toUpperCase()}
                          ringValue={ringColor}
                          size={54}
                          ringWidth={2}
                          textSize={22}
                        />
                        <View style={styles.personHorizontalNameRow}>
                          <Text style={[styles.personHorizontalName, { color: colors.foreground }]}>{person.displayName}</Text>
                          {person.isVerified && (
                            <View style={[styles.verifiedBadgeSmall, { backgroundColor: badgeColor }]}>
                              <Feather name="check" size={8} color="#FFF" />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.personHorizontalUsername, { color: colors.mutedForeground }]}>@{person.username}</Text>
                        <Text style={[styles.personHorizontalCollege, { color: colors.mutedForeground }]} numberOfLines={1}>{person.college}</Text>
                        <TouchableOpacity
                          onPress={() => handleFollowPerson(person.id, person.username)}
                          style={[
                            styles.personHorizontalBtn,
                            following ? { backgroundColor: colors.secondary, borderColor: colors.border } : { backgroundColor: colors.primary },
                          ]}
                        >
                          <Text style={[styles.personHorizontalBtnText, { color: following ? colors.foreground : "#FFF" }]}>
                            {following ? "Following" : "Follow"}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </FadeSlideItem>
                  );
                })}
              </ScrollView>
            </View>
          </FadeSlideItem>

          {/* Discover */}
          <FadeSlideItem index={3} delay={160}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Explore</Text>
              <View style={styles.discoverGrid}>
                {DISCOVER.map((s, i) => (
                  <FadeSlideItem key={s.id} index={i} delay={180} style={{ width: "47.5%" }}>
                    <TouchableOpacity
                      onPress={() => router.push(s.route as string)}
                      style={[styles.discoverCard, { backgroundColor: colors.card, borderColor: colors.border }, elevatedCard]}
                      activeOpacity={0.82}
                    >
                      <View style={[styles.discoverIcon, { backgroundColor: s.color + "18" }]}>
                        <Feather name={s.icon as string} size={22} color={s.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.discoverLabel, { color: colors.foreground }]}>{s.label}</Text>
                        <Text style={[styles.discoverDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  </FadeSlideItem>
                ))}
              </View>
            </View>
          </FadeSlideItem>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1 },
  headerTop: { marginBottom: 12 },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  searchBarWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, height: 50, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  clearBtn: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cancelSearchBtn: { paddingVertical: 4 },
  cancelSearchText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  tabRow: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  section: { paddingHorizontal: 16, paddingTop: 20, gap: 14 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionAction: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  recentChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  recentChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  trendingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  trendCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  trendTop: { flexDirection: "row", alignItems: "center", gap: 2 },
  trendHash: { fontSize: 20, fontFamily: "Inter_700Bold" },
  trendTagName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  trendPostCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  personHorizontalCard: { width: 150, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  personHorizontalAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  personHorizontalAvatarImg: { width: 52, height: 52, borderRadius: 26, borderWidth: 2 },
  personHorizontalInitial: { fontSize: 22, fontFamily: "Inter_700Bold" },
  personHorizontalNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  personHorizontalName: { fontSize: 14, fontFamily: "Inter_700Bold", textAlign: "center" },
  personHorizontalUsername: { fontSize: 12, fontFamily: "Inter_400Regular" },
  personHorizontalCollege: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  personHorizontalBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1, marginTop: 4 },
  personHorizontalBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  discoverGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  discoverCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  discoverIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  discoverLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  discoverDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  personCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  personNameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  personName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  verifiedBadge: { width: 15, height: 15, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  verifiedBadgeSmall: { width: 13, height: 13, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  personUsername: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  personMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  personMetaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  personDot: { fontSize: 11 },
  followBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  followBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tagCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  tagIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tagHash: { fontSize: 22, fontFamily: "Inter_700Bold" },
  tagNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tagName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  hotPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  hotText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  tagCount: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  emptyWrap: { alignItems: "center", gap: 12, paddingTop: 60 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
