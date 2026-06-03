import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import QRCode from "react-native-qrcode-svg";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { buildScanConnectQrValue, extractUsernameFromScanPayload } from "@/utils/scanConnect";

const ND = Platform.OS !== "web";
const SCAN_ERROR_COOLDOWN_MS = 1200;
const SCAN_SUCCESS_COOLDOWN_MS = 1400;

export default function ScanConnectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { username: usernameParam, allowScan: allowScanParam } = useLocalSearchParams<{
    username?: string;
    allowScan?: string;
  }>();
  const { showError } = useToast();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<"my" | "scan">("my");
  const [scanLocked, setScanLocked] = useState(false);
  const [sharingQr, setSharingQr] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const qrRef = useRef<QRCode | null>(null);

  const myUsername = (user?.username || "").trim().toLowerCase();
  const targetUsername = (usernameParam || "").trim().toLowerCase();
  const qrUsername = targetUsername || myUsername;
  const allowScan = allowScanParam !== "0";
  const qrValue = useMemo(() => (qrUsername ? buildScanConnectQrValue(qrUsername) : ""), [qrUsername]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: ND }),
      Animated.spring(slideAnim, { toValue: 0, tension: 90, friction: 14, useNativeDriver: ND }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!allowScan) setMode("my");
  }, [allowScan]);

  const onShare = async () => {
    if (!qrUsername || !qrValue || sharingQr) return;
    setSharingQr(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        if (!qrRef.current) {
          reject(new Error("QR code not ready"));
          return;
        }
        qrRef.current.toDataURL((data: string) => {
          if (!data) reject(new Error("Unable to generate QR image"));
          else resolve(data);
        });
      });

      const message = `Scan this QR to view my UConnect profile instantly.\n${qrValue}`;
      const title = `Connect with @${qrUsername} on UConnect`;

      if (Platform.OS === "android" && FileSystem.cacheDirectory) {
        const fileUri = `${FileSystem.cacheDirectory}uconnect-qr-${qrUsername}.png`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: "base64" });
        await Share.share({ title, message, url: fileUri });
      } else {
        await Share.share({ title, message, url: qrValue });
      }
    } finally {
      setSharingQr(false);
    }
  };

  const handleScanned = (data: string) => {
    if (scanLocked) return;
    setScanLocked(true);
    const scannedUsername = extractUsernameFromScanPayload(data);
    if (!scannedUsername) {
      showError("Invalid QR", "This QR code is not a valid UConnect profile.");
      setTimeout(() => setScanLocked(false), SCAN_ERROR_COOLDOWN_MS);
      return;
    }
    router.push(`/user/${scannedUsername}`);
    setTimeout(() => setScanLocked(false), SCAN_SUCCESS_COOLDOWN_MS);
  };

  return (
    <Animated.View style={[{ flex: 1, backgroundColor: colors.background, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8, backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>{allowScan ? "Scan to Connect" : "Profile QR"}</Text>
        <View style={{ width: 28 }} />
      </View>

      {allowScan && (
        <View style={[styles.modeRow, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => setMode("my")} style={[styles.modeBtn, mode === "my" && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}>
            <MaterialCommunityIcons name="qrcode" size={16} color={mode === "my" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.modeLabel, { color: mode === "my" ? colors.primary : colors.mutedForeground }]}>My QR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode("scan")} style={[styles.modeBtn, mode === "scan" && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 }]}>
            <MaterialCommunityIcons name="qrcode-scan" size={16} color={mode === "scan" ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.modeLabel, { color: mode === "scan" ? colors.primary : colors.mutedForeground }]}>Scan QR</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === "my" ? (
        <View style={styles.centerWrap}>
          <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {qrValue ? (
              <QRCode
                getRef={(c) => {
                  qrRef.current = c;
                }}
                value={qrValue}
                size={220}
                backgroundColor="#FFFFFF"
                color="#111827"
              />
            ) : (
              <Text style={[styles.helper, { color: colors.mutedForeground }]}>Profile username not available.</Text>
            )}
          </View>
          <Text style={[styles.username, { color: colors.foreground }]}>@{qrUsername || "unknown"}</Text>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>Let others scan this code to open this profile instantly.</Text>
          <TouchableOpacity disabled={!qrValue || sharingQr} onPress={onShare} style={[styles.shareBtn, { backgroundColor: qrValue ? colors.primary : colors.border }]}>
            <Feather name="share-2" size={16} color="#FFF" />
            <Text style={styles.shareText}>{sharingQr ? "Preparing..." : "Share QR"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.scanWrap}>
          {Platform.OS === "web" ? (
            <Text style={[styles.helper, { color: colors.mutedForeground, paddingHorizontal: 24 }]}>QR scanning works in the mobile app. You can still share your QR from the My QR tab.</Text>
          ) : !permission?.granted ? (
            <View style={styles.centerWrap}>
              <Text style={[styles.helper, { color: colors.mutedForeground, paddingHorizontal: 24 }]}>Allow camera permission to scan UConnect profile QR codes.</Text>
              <TouchableOpacity onPress={requestPermission} style={[styles.shareBtn, { backgroundColor: colors.primary }]}>
                <Feather name="camera" size={16} color="#FFF" />
                <Text style={styles.shareText}>Allow Camera</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.cameraBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => handleScanned(data)}
              />
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modeRow: { flexDirection: "row", borderBottomWidth: 1 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  modeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  qrCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  username: { fontSize: 19, fontFamily: "Inter_700Bold" },
  helper: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  shareBtn: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  shareText: { color: "#FFF", fontSize: 14, fontFamily: "Inter_700Bold" },
  scanWrap: { flex: 1, padding: 20, justifyContent: "center" },
  cameraBox: { width: "100%", aspectRatio: 1, alignSelf: "center", borderRadius: 18, overflow: "hidden", borderWidth: 1 },
});
