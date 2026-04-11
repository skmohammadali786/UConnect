import { useColorScheme } from "react-native";
import colors from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

export function useColors() {
  const { themeMode } = useTheme();
  const deviceScheme = useColorScheme();
  const effective = themeMode === "system" ? (deviceScheme ?? "dark") : themeMode;
  const palette = effective === "light" ? colors.light : colors.dark;
  return { ...palette, radius: colors.radius };
}
