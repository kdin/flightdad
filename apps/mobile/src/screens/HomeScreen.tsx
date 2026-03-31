/**
 * HomeScreen — landing screen and dashboard for the app.
 *
 * Currently shows:
 *  - App branding header
 *  - Backend connectivity status (calls GET /health on mount)
 *  - Placeholder flight list and quick-nav links to all other screens
 *
 * TODO: fetch and render the user's upcoming flights from the backend.
 * TODO: replace quick-nav links with real flight card entry points once
 *       FlightStatusScreen, CheckInScreen, and NotificationsScreen are
 *       implemented.
 */

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/AppNavigator";
import { apiClient } from "../services/apiClient";

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

type BackendStatus = "checking" | "connected" | "unreachable";

export default function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [backendStatus, setBackendStatus] = useState<BackendStatus>("checking");

  useEffect(() => {
    const checkBackend = async (): Promise<void> => {
      try {
        await apiClient.get<{ status: string }>("/health");
        setBackendStatus("connected");
      } catch {
        setBackendStatus("unreachable");
      }
    };
    void checkBackend();
  }, []);

  return (
    <View style={styles.container}>
      {/* App header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>✈️ flightdad</Text>
        <Text style={styles.appSubtitle}>Your virtual travel dad</Text>
      </View>

      {/* Backend connectivity indicator */}
      <View style={styles.statusRow}>
        {backendStatus === "checking" ? (
          <ActivityIndicator size="small" style={styles.statusIndicator} />
        ) : (
          <View
            style={[
              styles.statusDot,
              backendStatus === "connected" ? styles.dotGreen : styles.dotRed,
            ]}
          />
        )}
        <Text style={styles.statusText}>
          {backendStatus === "checking"
            ? "Connecting to backend…"
            : backendStatus === "connected"
              ? "Backend connected"
              : "Backend unreachable — is the server running?"}
        </Text>
      </View>

      {/* TODO: replace with real flight cards once the backend returns data */}
      <Text style={styles.sectionHeading}>Upcoming Flights</Text>
      <Text style={styles.placeholder}>No upcoming flights yet.</Text>

      {/* Quick nav — placeholder links until real entry points exist in flight cards */}
      <View style={styles.quickLinks}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() =>
            navigation.navigate("FlightStatus", { flightNumber: "DEMO123" })
          }
        >
          <Text style={styles.linkButtonText}>Flight Status →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("CheckIn", { flightId: "demo-flight-1" })}
        >
          <Text style={styles.linkButtonText}>Check In →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Text style={styles.linkButtonText}>Notifications →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  header: { alignItems: "center", paddingVertical: 24 },
  appTitle: { fontSize: 32, fontWeight: "bold" },
  appSubtitle: { fontSize: 16, color: "#666", marginTop: 4 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 24,
  },
  statusIndicator: { marginRight: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  dotGreen: { backgroundColor: "#34c759" },
  dotRed: { backgroundColor: "#ff3b30" },
  statusText: { fontSize: 14, color: "#333", flexShrink: 1 },
  sectionHeading: { fontSize: 18, fontWeight: "600", marginBottom: 8 },
  placeholder: { color: "#999", marginBottom: 24 },
  quickLinks: { gap: 10 },
  linkButton: {
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  linkButtonText: { fontSize: 16, color: "#007aff" },
});
