/**
 * NotificationsScreen — shows the history of flight alerts sent to the user.
 * TODO: load notifications from the backend and render a list.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function NotificationsScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      <Text style={styles.placeholder}>No notifications yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  placeholder: { color: "#999" },
});
