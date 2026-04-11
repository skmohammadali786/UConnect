import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSocial } from "@/context/SocialContext";
import { useToast } from "@/components/Toast";

const REASONS = [
  { icon: "alert-triangle", label: "Misinformation", desc: "False or misleading content" },
  { icon: "shield-off", label: "Harassment", desc: "Bullying or targeting someone" },
  { icon: "eye-off", label: "Inappropriate", desc: "Explicit or offensive content" },
  { icon: "trash-2", label: "Spam", desc: "Repetitive or promotional content" },
  { icon: "flag", label: "Other", desc: "Something else that violates guidelines" },
];

interface ReportModalProps {
  postId: string;
  visible: boolean;
  onClose: () => void;
}

export function ReportModal({ postId, visible, onClose }: ReportModalProps) {
  const colors = useColors();
  const { reportPost, hasReported } = useSocial();
  const { showSuccess, showInfo } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 10, useNativeDriver: false }).start();
    } else {
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  if (hasReported(postId)) {
    return null;
  }

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    await reportPost(postId, selected);
    setSubmitting(false);
    onClose();
    showSuccess("Report submitted", "Our team will review this post.");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <Animated.View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.foreground }]}>Report Post</Text>
              <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.secondary }]}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>What's wrong with this post?</Text>

            {REASONS.map((r) => (
              <TouchableOpacity
                key={r.label}
                onPress={() => setSelected(r.label)}
                style={[
                  styles.reason,
                  {
                    backgroundColor: selected === r.label ? colors.primary + "12" : colors.secondary,
                    borderColor: selected === r.label ? colors.primary : "transparent",
                  },
                ]}
              >
                <View style={[styles.reasonIcon, { backgroundColor: selected === r.label ? colors.primary + "20" : colors.card }]}>
                  <Feather name={r.icon as any} size={16} color={selected === r.label ? colors.primary : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reasonLabel, { color: colors.foreground }]}>{r.label}</Text>
                  <Text style={[styles.reasonDesc, { color: colors.mutedForeground }]}>{r.desc}</Text>
                </View>
                {selected === r.label && (
                  <View style={[styles.check, { backgroundColor: colors.primary }]}>
                    <Feather name="check" size={11} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!selected || submitting}
              style={[styles.submitBtn, { backgroundColor: selected ? colors.primary : colors.secondary, opacity: selected ? 1 : 0.5 }]}
            >
              <Text style={[styles.submitText, { color: selected ? "#FFF" : colors.mutedForeground }]}>
                {submitting ? "Submitting..." : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", paddingBottom: 0 },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 20, gap: 10 },
  handle: { width: 40, height: 4, backgroundColor: "#3A3A3A", borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 4 },
  reason: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 12 },
  reasonIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  reasonLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reasonDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 6 },
  submitText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
