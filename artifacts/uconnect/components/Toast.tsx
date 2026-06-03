import { Feather } from "@expo/vector-icons";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  subtitle?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, subtitle?: string) => void;
  showSuccess: (message: string, subtitle?: string) => void;
  showError: (message: string, subtitle?: string) => void;
  showInfo: (message: string, subtitle?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: "check-circle",
  error: "x-circle",
  info: "info",
  warning: "alert-triangle",
};

const COLORS: Record<ToastType, string> = {
  success: "#00A86B",
  error: "#EF4444",
  info: "#3B82F6",
  warning: "#F59E0B",
};

function ToastBanner({ item }: { item: ToastItem }) {
  const anim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const colors = useColors();

  React.useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
    return () => { anim.setValue(0); };
  }, []);

  const color = COLORS[item.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
        },
      ]}
    >
      <View style={[styles.inner, { borderColor: color + "40", backgroundColor: colors.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
          <Feather name={ICONS[item.type]} size={18} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.message, { color: colors.foreground }]}>{item.message}</Text>
          {item.subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{item.subtitle}</Text> : null}
        </View>
        <View style={[styles.bar, { backgroundColor: color }]} />
      </View>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timerRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const showToast = useCallback((message: string, type: ToastType = "success", subtitle?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev.slice(-1), { id, message, type, subtitle }]);
    timerRefs.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const showSuccess = useCallback((msg: string, sub?: string) => showToast(msg, "success", sub), [showToast]);
  const showError = useCallback((msg: string, sub?: string) => showToast(msg, "error", sub), [showToast]);
  const showInfo = useCallback((msg: string, sub?: string) => showToast(msg, "info", sub), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((t) => <ToastBanner key={t.id} item={t} />)}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be within ToastProvider");
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "web" ? 90 : 90,
  },
  toast: { width: "100%", maxWidth: 500, alignSelf: "center" },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  message: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  bar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: 3 },
});
