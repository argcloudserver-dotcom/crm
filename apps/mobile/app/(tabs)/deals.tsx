import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function DealsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deals</Text>
      <Text style={styles.subtitle}>Active and closed deals will appear here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, opacity: 0.7, textAlign: "center" },
});
