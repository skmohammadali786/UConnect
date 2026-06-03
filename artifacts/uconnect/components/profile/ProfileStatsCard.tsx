import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type StatItem = {
  label: string;
  value: string | number;
  icon?: React.ComponentProps<typeof Feather>["name"];
  onPress?: () => void;
};

type Colors = {
  profileShadow?: string;
  shadow: string;
  profileCard?: string;
  card: string;
  profileCardBorder?: string;
  border: string;
  primary: string;
  mutedForeground: string;
  profileDivider?: string;
};

export function ProfileStatsCard({
  items,
  colors,
  attachedTile,
}: {
  items: StatItem[];
  colors: Colors;
  attachedTile?: { label: string; value: string | number; icon?: React.ComponentProps<typeof Feather>["name"] };
}) {
  const shadowColor = colors.profileShadow ?? colors.shadow;
  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.profileCard ?? colors.card,
            borderColor: colors.profileCardBorder ?? colors.border,
            shadowColor,
          },
          attachedTile ? styles.cardAttached : null,
        ]}
      >
        {items.map((item, index) => {
          const Content = item.onPress ? TouchableOpacity : View;
          return (
            <React.Fragment key={item.label}>
              <Content onPress={item.onPress} activeOpacity={0.85} style={styles.item}>
                {item.icon ? <Feather name={item.icon} size={13} color={colors.primary} /> : null}
                <Text style={[styles.value, { color: colors.primary }]}>{item.value}</Text>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>{item.label}</Text>
              </Content>
              {index < items.length - 1 ? <View style={[styles.divider, { backgroundColor: colors.profileDivider ?? colors.border }]} /> : null}
            </React.Fragment>
          );
        })}
      </View>
      {attachedTile ? (
        <View
          style={[
            styles.tile,
            {
              backgroundColor: colors.profileCard ?? colors.card,
              borderColor: colors.profileCardBorder ?? colors.border,
              shadowColor,
            },
          ]}
        >
          <View style={styles.tileTop}>
            <Text style={[styles.tileValue, { color: colors.primary }]}>{attachedTile.value}</Text>
            {attachedTile.icon ? <Feather name={attachedTile.icon} size={14} color={colors.warning} /> : null}
          </View>
          <Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>{attachedTile.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", marginHorizontal: 16, marginBottom: 14, gap: 0 },
  card: {
    flex: 1,
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  cardAttached: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 4 },
  value: { fontSize: 19, fontFamily: "Inter_700Bold" },
  label: { fontSize: 10.5, fontFamily: "Inter_600SemiBold" },
  divider: { width: 1, height: 34 },
  tile: {
    width: 112,
    minHeight: 72,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  tileTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  tileValue: { fontSize: 19, fontFamily: "Inter_700Bold" },
  tileLabel: { fontSize: 10.5, fontFamily: "Inter_700Bold", marginTop: 2 },
});
