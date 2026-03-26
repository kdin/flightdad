/**
 * CheckInScreen — guided check-in flow.
 * TODO: walk the user through check-in steps and surface the boarding pass.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function CheckInScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check In</Text>
      <Text style={styles.placeholder}>Check-in flow will be available here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  placeholder: { color: "#999" },
});
