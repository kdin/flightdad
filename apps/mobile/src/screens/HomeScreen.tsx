/**
 * HomeScreen — displays upcoming flights for the user.
 * TODO: fetch flights from the backend and render a list.
 */

import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Flights</Text>
      <Text style={styles.placeholder}>No upcoming flights yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 12 },
  placeholder: { color: "#999" },
});
