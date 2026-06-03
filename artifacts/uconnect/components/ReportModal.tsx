import { Feather } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { useSocial } from "@/context/SocialContext";
import { useToast } from "@/components/Toast";

const ND = Platform.OS !== "web";

const REASONS = [
  {
    icon: "alert-triangle",
    label: "Misinformation",
    desc: "False or misleading content",
  },
  {
    icon: "shield-off",
    label: "Harassment",
    desc: "Bullying or targeting someone",
  },
  {
    icon: "eye-off",
    label: "Inappropriate",
    desc: "Explicit or offensive content",
  },
  { icon: "trash-2", label: "Spam", desc: "Repetitive or promotional content" },
  {
    icon: "flag",
    label: "Other",
    desc: "Something else that violates guidelines",
  },
];

interface ReportModalProps {
  postId: string;
  visible: boolean;
  onClose: () => void;
}

export function ReportModal({ postId, visible, onClose }: ReportModalProps) {
  const colors = useColors();
  const { reportPost, hasReported } = useSocial();
  const { showError, showSuccess } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: ND,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 80,
          friction: 12,
          useNativeDriver: ND,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: ND,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 160,
          useNativeDriver: ND,
        }),
      ]).start();
      setSelected(null);
    }
  }, [visible]);

  if (hasReported(postId)) return null;

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    try {
      await reportPost(postId, selected);
      onClose();
      showSuccess(
        "Report submitted",
        "Moderators were notified and you'll see updates in My Reports.",
      );
    } catch (error: unknown) {
      let message = "Please try again in a moment.";
      if (error instanceof Error && error.message) {
        message = error.message;
      }
      showError(
        "Report failed",
        message,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.backdrop,
          { backgroundColor: "rgba(0,0,0,0.6)", opacity: backdropAnim },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        <View style={styles.headerRow}>
          <View style={[styles.iconWrap, { backgroundColor: "#EF444418" }]}>
            <Feather name="flag" size={18} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Report Post
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              What's wrong with this post?
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
          >
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <View style={styles.reasonList}>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.label}
              onPress={() => setSelected(r.label)}
              style={[
                styles.reason,
                {
                  backgroundColor:
                    selected === r.label
                      ? colors.primary + "12"
                      : colors.secondary,
                  borderColor:
                    selected === r.label ? colors.primary : "transparent",
                },
              ]}
            >
              <View
                style={[
                  styles.reasonIcon,
                  {
                    backgroundColor:
                      selected === r.label
                        ? colors.primary + "20"
                        : colors.card,
                  },
                ]}
              >
                <Feather
                  name={r.icon as React.ComponentProps<typeof Feather>["name"]}
                  size={16}
                  color={
                    selected === r.label
                      ? colors.primary
                      : colors.mutedForeground
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.reasonLabel, { color: colors.foreground }]}
                >
                  {r.label}
                </Text>
                <Text
                  style={[styles.reasonDesc, { color: colors.mutedForeground }]}
                >
                  {r.desc}
                </Text>
              </View>
              {selected === r.label && (
                <View
                  style={[
                    styles.checkCircle,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Feather name="check" size={11} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity
            onPress={onClose}
            style=[
              styles.cancelBtn,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]
          >
            <Text style={[styles.cancelText, { color: colors.foreground }]}>}
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!selected || submitting}
            style={[
              styles.submitBtn,
              {
                backgroundColor: selected ? "#EF4444" : colors.secondary,
                opacity: selected ? 1 : 0.5,
              },
            ]}
          >
            <Feather
              name="flag"
              size={15}
              color={selected ? "#FFF" : colors.mutedForeground}
            />
            <Text
              style={[
                styles.submitText,
                { color: selected ? "#FFF" : colors.mutedForeground },
              ]}
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonList: { gap: 8 },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
  },
  reasonIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reasonDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 14,
    borderRadius: 12,
  },
  submitText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
