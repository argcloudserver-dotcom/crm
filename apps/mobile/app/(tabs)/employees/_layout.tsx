import { Stack } from "expo-router";
import React from "react";

export default function EmployeesStackLayout(): React.ReactElement {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="pending" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
