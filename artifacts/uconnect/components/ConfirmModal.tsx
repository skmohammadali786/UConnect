import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

const ND = Platform.OS !== "web";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_MAP = {
  danger: { icon: "trash-2" as const, color: "#EF4444" },
  warning: { icon: "alert-triangle" as const, color: "#F59E0B" },
  info: { icon: "info" as const, color: "#3B82F6" },
};

export function ConfirmModal({ visible, title, message, confirmText = "Confirm", cancelText = "Cancel", variant = "danger", onConfirm, onCancel }: ConfirmModalProps) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const { icon, color } = VARIANT_MAP[variant];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 140, friction: 10, useNativeDriver: ND }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: ND }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0.85, tension: 200, friction: 12, useNativeDriver: ND }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: ND }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[styles.overlay, { backgroundColor: colors.overlay, opacity: opacityAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onCancel} />
        <Animated.View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.iconWrap, { backgroundColor: color + "15" }]}>
            <Feather name={icon} size={28} color={color} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>
          <View style={styles.buttons}>
            <TouchableOpacity onPress={onCancel} style={[styles.cancelBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Text style={[styles.cancelText, { color: colors.foreground }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={[styles.confirmBtn, { backgroundColor: color }]}>
              <Feather name={icon} size={15} color="#FFF" />
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  modal: { width: "100%", maxWidth: 380, borderRadius: 24, borderWidth: 1, padding: 28, alignItems: "center", gap: 14 },
  iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  message: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  buttons: { flexDirection: "row", gap: 12, width: "100%", marginTop: 6 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  confirmBtn: { flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14, borderRadius: 14 },
  confirmText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFF" },
});
