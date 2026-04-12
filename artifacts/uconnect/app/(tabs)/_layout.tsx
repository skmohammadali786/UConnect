import { BlurView } from "expo-blur";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

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
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : 70,
          paddingBottom: isWeb ? 8 : 12,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ),
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
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
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => <Feather name="bell" size={22} color={color} />,
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
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
});
