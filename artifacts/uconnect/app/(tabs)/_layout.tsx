import { BlurView } from "expo-blur";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Animated, Platform, StyleSheet, TouchableOpacity, View, useColorScheme, useWindowDimensions } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useTheme } from "@/context/ThemeContext";
import { useNotifications } from "@/context/NotificationsContext";
import { TABLET_BREAKPOINT, getResponsiveContentMaxWidth } from "@/utils/responsiveLayout";
import { setTabBarVisible, subscribeTabBarVisibility } from "@/utils/tabBarVisibility";

const ND = Platform.OS !== "web";

function CreateTabButton() {
  const colors = useColors();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.82, tension: 380, friction: 7, useNativeDriver: false }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 180, friction: 7, useNativeDriver: false }).start();
  };

  const onPress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.75, tension: 400, friction: 5, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1.08, tension: 200, friction: 6, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 8, useNativeDriver: false }),
    ]).start();
    router.push("/create-post");
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      style={styles.createTabWrap}
    >
      <Animated.View
        style={[
          styles.createBtn,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Feather name="plus" size={24} color="#FFF" />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { width } = useWindowDimensions();
  const colors = useColors();
  const { themeMode } = useTheme();
  const scheme = useColorScheme();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const contentMaxWidth = getResponsiveContentMaxWidth(width);
  const tabBarHeight = isWeb ? (width >= TABLET_BREAKPOINT ? 88 : 74) : 70;
  const tabBarBottomPadding = isWeb ? (width >= TABLET_BREAKPOINT ? 12 : 6) : 12;
  const isDarkTheme = themeMode === "dark" || (themeMode === "system" && (scheme ?? "dark") === "dark");
  const { unreadCount } = useNotifications();
  const [isTabBarVisible, setIsTabBarVisible] = React.useState(true);
  const tabBarSlide = React.useRef(new Animated.Value(0)).current;
  const tabBarOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => subscribeTabBarVisibility(setIsTabBarVisible), []);

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(tabBarSlide, {
        toValue: isTabBarVisible ? 0 : tabBarHeight + 26,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(tabBarOpacity, {
        toValue: isTabBarVisible ? 1 : 0.15,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isTabBarVisible, tabBarHeight, tabBarSlide, tabBarOpacity]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "fade",
        sceneStyle: {
          backgroundColor: colors.background,
          width: "100%",
          alignSelf: "center",
          ...(contentMaxWidth ? { maxWidth: contentMaxWidth } : {}),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.tabBar,
          borderTopWidth: 0,
          elevation: 0,
          height: tabBarHeight,
          borderRadius: 22,
          marginHorizontal: 10,
          marginBottom: isWeb ? 8 : 10,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          paddingBottom: tabBarBottomPadding,
          width: "100%",
          alignSelf: "center",
          ...(contentMaxWidth ? { maxWidth: contentMaxWidth } : {}),
          transform: [{ translateY: tabBarSlide }],
          opacity: tabBarOpacity,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint={isDarkTheme ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.tabBar, borderRadius: 22, borderWidth: 1, borderColor: colors.border }]} />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
        },
      }}
      screenListeners={{
        state: () => {
          setTabBarVisible(true);
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Feather name={focused ? "home" : "home"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Feather name="search" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarButton: () => <CreateTabButton />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: "Vault",
          tabBarIcon: ({ color, focused }) => <Feather name={(focused ? "shield" : "hexagon") as any} size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => <Feather name="bell" size={22} color={color} />,
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            color: "#fff",
            fontFamily: "Inter_600SemiBold",
            fontSize: 10,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createTabWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 4,
  },
  createBtn: {
    width: 76,
    height: 44,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
});
