/**
 * Root application component.
 *
 * Navigation structure (to be implemented):
 *  - HomeScreen       — dashboard with upcoming flights
 *  - FlightStatusScreen — real-time status & gate info
 *  - CheckInScreen    — guided check-in flow
 *  - NotificationsScreen — alert history
 */

import React from "react";
import { SafeAreaView, StyleSheet, Text } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function App(): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>✈️ flightdad</Text>
      <Text style={styles.subtitle}>Your virtual travel dad</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
});
