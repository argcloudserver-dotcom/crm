/**
 * Profile / Settings — Mobile.
 *
 * User details + language toggle + theme toggle + sign out. Styled with
 * native tokens from `@workspace/ui/tokens`, labelled via `useI18n`.
 */
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";

import { buildNativeTheme } from "@workspace/ui/tokens";
import { useI18n } from "@workspace/i18n";

import { ScreenHeader } from "@/components/ScreenHeader";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

const ROLE_COLORS: Record<string, string> = {
  ceo: "#7C3AED",
  admin: "#DC2626",
  director: "#0891B2",
  team_leader: "#2563EB",
  sales: "#16A34A",
};

export default function ProfileScreen(): React.ReactElement | null {
  const router = useRouter();
  const { t } = useI18n();
  const { isDark, toggleTheme } = useAppTheme();
  const { language, toggleLanguage } = useLanguage();
  const { user, signOut } = useAuthContext();

  const theme = React.useMemo(() => buildNativeTheme(isDark), [isDark]);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role] ?? theme.colors.primary;
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  function handleSignOut() {
    Alert.alert(t("common.confirm"), t("common.confirm_delete"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.yes_delete"),
        style: "destructive",
        onPress: async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await signOut();
          router.replace("/login");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t("profile.title")} subtitle={user.name} noBorder />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.heroCard}>
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          {!!user.title && <Text style={styles.title}>{user.title}</Text>}
          <Text style={styles.email}>{user.email}</Text>
          <View style={[styles.rolePill, { backgroundColor: `${roleColor}18` }]}>
            <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
            <Text style={[styles.roleTxt, { color: roleColor }]}>{user.role.toUpperCase()}</Text>
          </View>
        </View>

        {/* Settings */}
        <Text style={styles.sectionLabel}>{t("common.actions").toUpperCase()}</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.row}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.primary}12` }]}>
              <Feather name={isDark ? "sun" : "moon"} size={16} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>
                {isDark ? "Light Mode" : "Dark Mode"}
              </Text>
            </View>
            <View
              style={[
                styles.togglePill,
                { backgroundColor: isDark ? theme.colors.accent : theme.colors.border },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: isDark ? 16 : 2 }] },
                ]}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await toggleLanguage();
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.primary}12` }]}>
              <Feather name="globe" size={16} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>
                {language === "en" ? "العربية" : "English"}
              </Text>
              <Text style={styles.rowMeta}>
                {language === "en" ? "التبديل إلى العربية" : "Switch to English"}
              </Text>
            </View>
            <View style={styles.langBadge}>
              <Text style={styles.langBadgeTxt}>{language === "en" ? "AR" : "EN"}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <View style={[styles.menuCard, { marginBottom: 80 }]}>
          <TouchableOpacity style={styles.row} onPress={handleSignOut} activeOpacity={0.7}>
            <View style={[styles.rowIcon, { backgroundColor: `${theme.colors.destructive}15` }]}>
              <Feather name="log-out" size={16} color={theme.colors.destructive} />
            </View>
            <Text style={[styles.rowLabel, { color: theme.colors.destructive }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>TIL Real Estate Group CRM · v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof buildNativeTheme>) {
  const c = theme.colors;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16 },

    heroCard: {
      alignItems: "center",
      backgroundColor: c.card,
      borderRadius: theme.radius.xl,
      padding: 28,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: c.border,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: theme.radius.full,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    avatarText: { fontSize: 28, fontWeight: "700", color: "#FFF" },
    name: { fontSize: 20, fontWeight: "700", color: c.foreground },
    title: { fontSize: 13, color: c.mutedForeground, marginTop: 2 },
    email: { fontSize: 12, color: c.mutedForeground, marginTop: 2 },
    rolePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: theme.radius.full,
      marginTop: 12,
    },
    roleDot: { width: 7, height: 7, borderRadius: 7 },
    roleTxt: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },

    sectionLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: c.mutedForeground,
      marginBottom: 8,
      letterSpacing: 0.8,
    },
    menuCard: {
      backgroundColor: c.card,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      marginBottom: 16,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: { fontSize: 15, color: c.foreground, fontWeight: "500" },
    rowMeta: { fontSize: 12, color: c.mutedForeground, marginTop: 1 },
    divider: { height: 1, backgroundColor: c.border, marginLeft: 64 },

    togglePill: { width: 36, height: 22, borderRadius: 11, justifyContent: "center" },
    toggleThumb: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: "#FFF",
    },
    langBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radius.full,
      backgroundColor: `${c.accent}22`,
      borderWidth: 1,
      borderColor: `${c.accent}44`,
    },
    langBadgeTxt: { fontSize: 12, fontWeight: "700", color: c.accent },

    version: {
      textAlign: "center",
      color: c.mutedForeground,
      fontSize: 12,
      marginTop: 8,
      marginBottom: 16,
    },
  });
}
