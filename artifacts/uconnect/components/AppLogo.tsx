import React from "react";
import { useColorScheme } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useTheme } from "@/context/ThemeContext";

const U_MARK_PATH =
  "M176 342H247V529C247 579 284 615 330 615H392C416 615 432 604 446 583L472 531L511 597L468 653C449 672 425 682 397 685H326C243 685 176 620 176 531V342Z";
const C_MARK_PATH =
  "M823 379V449H647C604 449 576 471 568 508C576 545 604 582 647 582H823V653H643C594 653 552 628 524 591L488 508L524 441C552 405 594 379 643 379H823Z";

type AppLogoProps = {
  size?: number;
  width?: number;
  height?: number;
  isDark?: boolean;
  showBackground?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppLogo({
  size = 1024,
  width,
  height,
  isDark,
  showBackground = true,
  style,
}: AppLogoProps) {
  const { themeMode } = useTheme();
  const scheme = useColorScheme();
  const resolvedIsDark =
    isDark ??
    (themeMode === "dark" ||
      (themeMode === "system" && (scheme ?? "light") === "dark"));
  const gradientId = React.useId().replace(/:/g, "");
  const resolvedWidth = width ?? size;
  const resolvedHeight = height ?? size;

  return (
    <Svg
      width={resolvedWidth}
      height={resolvedHeight}
      viewBox="0 0 1024 1024"
      preserveAspectRatio="xMidYMid meet"
      style={style}
    >
      {showBackground && (
        <Rect
          width="1024"
          height="1024"
          fill={resolvedIsDark ? "#000000" : "#FFFFFF"}
        />
      )}
      <Defs>
        <LinearGradient
          id={gradientId}
          x1="488"
          y1="508"
          x2="823"
          y2="508"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#84F500" />
          <Stop offset="1" stopColor="#A2FF18" />
        </LinearGradient>
      </Defs>
      <Path d={U_MARK_PATH} fill={resolvedIsDark ? "#FFFFFF" : "#121314"} />
      <Path d={C_MARK_PATH} fill={`url(#${gradientId})`} />
    </Svg>
  );
}
