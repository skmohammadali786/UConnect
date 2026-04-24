import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Feather.glyphMap;
  rightIcon?: keyof typeof Feather.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export function AppInput({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...props
}: AppInputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.input,
            borderColor: error ? colors.destructive : focused ? colors.primary : colors.border,
            borderRadius: colors.radius + 2,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: focused ? 0.16 : 0.06,
            shadowRadius: focused ? 20 : 12,
            elevation: focused ? 3 : 1,
          },
        ]}
      >
        {leftIcon && (
          <Feather name={leftIcon} size={18} color={focused ? colors.primary : colors.mutedForeground} style={styles.leftIcon} />
        )}
        <TextInput
          {...props}
          style={[
            styles.input,
            {
              color: colors.foreground,
              fontFamily: "Inter_400Regular",
              flex: 1,
            },
            style,
          ]}
          placeholderTextColor={colors.placeholder}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            <Feather name={rightIcon} size={18} color={focused ? colors.primary : colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginLeft: 4 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  leftIcon: { marginRight: 8 },
  rightIcon: { padding: 4 },
  input: { fontSize: 15, paddingVertical: 12 },
  error: { fontSize: 12, fontFamily: "Inter_400Regular", marginLeft: 4 },
});
