import { router } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function CreateTab() {
  const colors = useColors();
  useEffect(() => {
    router.replace("/create-post" as any);
  }, []);
  return <View style={{ flex: 1, backgroundColor: colors.background }} />;
}
