import { router } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

// This tab just opens the create post modal
export default function CreateTab() {
  useEffect(() => {
    router.replace("/create-post");
  }, []);
  return <View style={{ flex: 1 }} />;
}
