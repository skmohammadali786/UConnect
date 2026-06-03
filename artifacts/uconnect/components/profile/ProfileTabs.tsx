import { Feather } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type ProfileTabItem<T extends string> = {
  key: T;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  count?: number;
};

interface ProfileTabColors {
  profileCard?: string;
  card?: string;
  profileCardBorder?: string;
  border?: string;
  primary: string;
  mutedForeground: string;
  secondary: string;
}

export function ProfileTabs<T extends string>({
  items,
  activeKey,
  onChange,
  colors,
}: {
  items: ProfileTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  colors: ProfileTabColors;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.row, { backgroundColor: colors.profileCard ?? colors.card, borderBottomColor: colors.profileCardBorder ?? colors.border }]}
      contentContainerStyle={styles.content}
    >
      {items.map((item) => {
        const active = activeKey === item.key;
        return (
          <TouchableOpacity key={item.key} onPress={() => onChange(item.key)} activeOpacity={0.85} style={styles.btn}>
            <Feather name={item.icon} size={16} color={active ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.label, { color: active ? colors.primary : colors.mutedForeground }]}>{item.label}</Text>
            {typeof item.count === "number" && item.count > 0 ? (
              <View style={[styles.count, { backgroundColor: active ? colors.primary : colors.secondary }]}> 
                <Text style={[styles.countText, { color: active ? "#FFF" : colors.mutedForeground }]}>{item.count}</Text>
              </View>
            ) : null}
            {active ? <View style={[styles.indicator, { backgroundColor: colors.primary }]} /> : null}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { borderBottomWidth: 1 },
  content: { paddingHorizontal: 12 },
  btn: {
    minWidth: 98,
    paddingHorizontal: 10,
    paddingTop: 13,
    paddingBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  label: { fontSize: 13, fontFamily: "Inter_700Bold" },
  count: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7 },
  countText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  indicator: { position: "absolute", left: 12, right: 12, bottom: 0, height: 3, borderRadius: 3 },
});
