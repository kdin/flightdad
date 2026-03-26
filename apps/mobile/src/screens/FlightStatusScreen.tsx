/**
 * FlightStatusScreen — shows real-time status for a specific flight.
 * TODO: poll backend for status updates; display gate, delay, etc.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function FlightStatusScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flight Status</Text>
      <Text style={styles.placeholder}>Status information will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  placeholder: { color: "#999" },
});
