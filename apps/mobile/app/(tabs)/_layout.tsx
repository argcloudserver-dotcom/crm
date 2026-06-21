import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useAppTheme } from "@/contexts/ThemeContext";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leads">
        <Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        <Label>Leads</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="planner">
        <Icon sf={{ default: "checklist", selected: "checklist" }} />
        <Label>Planner</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clients">
        <Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <Label>Clients</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="employees">
        <Icon sf={{ default: "person.3", selected: "person.3.fill" }} />
        <Label>Team</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <Icon sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }} />
        <Label>More</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const theme = useColors();
  const c = theme.colors;
  const { isDark } = useAppTheme();
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  const TAB_BG = c.tabBarBg;
  const ACTIVE = c.tabBarActive;
  const INACTIVE = c.tabBarInactive;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : TAB_BG,
          borderTopWidth: 0,
          elevation: 0,
          height: isWeb ? 84 : 60,
          paddingBottom: isWeb ? 34 : 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={[StyleSheet.absoluteFill, { backgroundColor: `${TAB_BG}CC` }]}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: TAB_BG }]} />
          ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={size} />
            ) : (
              <Feather name="home" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="leads"
        options={{
          tabBarLabel: "Leads",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="person.2" tintColor={color} size={size} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          tabBarLabel: "Planner",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="checklist" tintColor={color} size={size} />
            ) : (
              <Feather name="check-square" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          tabBarLabel: "Clients",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="person.crop.circle" tintColor={color} size={size} />
            ) : (
              <Feather name="user-check" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="employees"
        options={{
          tabBarLabel: "Team",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="person.3" tintColor={color} size={size} />
            ) : (
              <Feather name="users" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          href: null,
          tabBarLabel: "Projects",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="building.2" tintColor={color} size={size} />
            ) : (
              <Feather name="layers" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarLabel: "More",
          tabBarIcon: ({ color, size }) =>
            isIOS ? (
              <SymbolView name="ellipsis.circle" tintColor={color} size={size} />
            ) : (
              <Feather name="menu" size={22} color={color} />
            ),
        }}
      />
      {/* Hidden screens — keep registered so routing works */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="deals" options={{ href: null }} />
      <Tabs.Screen name="resale" options={{ href: null }} />
      <Tabs.Screen name="reports" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
