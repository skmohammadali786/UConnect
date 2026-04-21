import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { Message } from "@/context/ChatContext";
import { formatRelativeTime } from "@/utils/time";

interface ChatBubbleProps {
  message: Message;
  isMe: boolean;
}

export function ChatBubble({ message, isMe }: ChatBubbleProps) {
  const colors = useColors();

  return (
    <View style={[styles.wrapper, isMe ? styles.meWrapper : styles.otherWrapper]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMe ? colors.primary : colors.surface,
            borderRadius: 18,
            borderBottomRightRadius: isMe ? 4 : 18,
            borderBottomLeftRadius: isMe ? 18 : 4,
          },
        ]}
      >
        <Text style={[styles.text, { color: isMe ? "#FFFFFF" : colors.foreground }]}>
          {message.content}
        </Text>
      </View>
      <View style={[styles.metaRow, { alignSelf: isMe ? "flex-end" : "flex-start" }]}>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {formatRelativeTime(message.createdAt)}
        </Text>
        {isMe && (
          <Text style={[styles.status, { color: message.isRead ? "#10B981" : colors.mutedForeground }]}>
            {message.isRead ? "Seen" : "Unseen"}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { maxWidth: "78%", marginBottom: 16 },
  meWrapper: { alignSelf: "flex-end", alignItems: "flex-end" },
  otherWrapper: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  text: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 21 },
  time: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 3, marginHorizontal: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  status: { fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 3 },
});
