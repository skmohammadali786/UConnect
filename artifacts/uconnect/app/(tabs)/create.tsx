import { router } from "expo-router";
import React, { useEffect } from "react";
import { View } from "react-native";

export default function CreateTab() {
  useEffect(() => {
    // Push instead of replace so back button works
    const timer = setTimeout(() => {
      router.push("/create-post");
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return <View style={{ flex: 1 }} />;
}
