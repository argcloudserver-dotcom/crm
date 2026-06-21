/**
 * Login screen — Mobile.
 *
 * Validates the form with the shared `LoginSchema` (from
 * `@workspace/api-client/zod/auth`), submits via the shared `useLogin`
 * mutation (from `@workspace/api-client/hooks/auth`), and persists the
 * session token through the shared `useAuth` context
 * (`@workspace/shared/auth`).
 *
 * UI is plain React Native with raw native design tokens — no web CSS, no
 * Tailwind class names.
 */
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  LoginSchema,
  type LoginFormValues,
} from "@workspace/api-client/zod/auth";
import { useLogin } from "@workspace/api-client/hooks/auth";
import { useAuth } from "@workspace/shared/auth";
import { buildNativeTheme } from "@workspace/ui/tokens";

type LoginSuccessPayload = {
  user?: { id?: string };
  token?: string;
  accessToken?: string;
};

export default function LoginScreen(): React.ReactElement {
  const router = useRouter();
  const theme = React.useMemo(() => buildNativeTheme(false), []);
  const styles = React.useMemo(() => makeStyles(theme), [theme]);

  const { setToken, refetch } = useAuth();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data) => {
        const payload = data as unknown as LoginSuccessPayload;
        const token =
          payload.token ??
          payload.accessToken ??
          payload.user?.id ??
          "";
        await setToken(token || null);
        refetch();
        router.replace("/(tabs)");
      },
      onError: (err: unknown) => {
        setServerError(
          err instanceof Error ? err.message : "Login failed. Please try again.",
        );
      },
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    loginMutation.mutate({ data: values });
  });

  const submitting = isSubmitting || loginMutation.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.brand}>TIL Group</Text>
          <View style={styles.rule} />
          <Text style={styles.subtitle}>
            Real Estate Intelligence Platform
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.muted}>Sign in to your account</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@company.com"
                  placeholderTextColor={theme.colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  style={[
                    styles.input,
                    errors.email ? styles.inputError : null,
                  ]}
                />
              )}
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="••••••••"
                  placeholderTextColor={theme.colors.mutedForeground}
                  secureTextEntry
                  textContentType="password"
                  style={[
                    styles.input,
                    errors.password ? styles.inputError : null,
                  ]}
                />
              )}
            />
            {errors.password ? (
              <Text style={styles.errorText}>
                {errors.password.message}
              </Text>
            ) : null}
          </View>

          {serverError ? (
            <View style={styles.serverErrorBox}>
              <Text style={styles.serverErrorText}>{serverError}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting }}
            onPress={onSubmit}
            disabled={submitting}
            style={[styles.button, submitting ? styles.buttonDisabled : null]}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.primaryForeground} />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/register")}
            >
              <Text style={styles.link}>Create account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme: ReturnType<typeof buildNativeTheme>) {
  const c = theme.colors;
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.background },
    scroll: {
      flexGrow: 1,
      padding: theme.spacing[6],
      justifyContent: "center",
    },
    header: { alignItems: "center", marginBottom: theme.spacing[8] },
    brand: {
      color: c.foreground,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.fontSize["3xl"],
      letterSpacing: theme.typography.letterSpacing.tight,
    },
    rule: {
      width: 48,
      height: 2,
      backgroundColor: c.accent,
      marginVertical: theme.spacing[3],
      borderRadius: theme.radius.full,
    },
    subtitle: {
      color: c.mutedForeground,
      fontFamily: theme.typography.fontFamily.sans,
      fontSize: theme.typography.fontSize.sm,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      padding: theme.spacing[6],
      ...theme.shadows.md,
    },
    title: {
      color: c.foreground,
      fontFamily: theme.typography.fontFamily.semibold,
      fontSize: theme.typography.fontSize["2xl"],
      marginBottom: theme.spacing[1],
    },
    muted: {
      color: c.mutedForeground,
      fontFamily: theme.typography.fontFamily.sans,
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing[5],
    },
    field: { marginBottom: theme.spacing[4] },
    label: {
      color: c.foreground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
      marginBottom: theme.spacing[2],
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing[3],
      paddingVertical: theme.spacing[3],
      color: c.foreground,
      fontFamily: theme.typography.fontFamily.sans,
      fontSize: theme.typography.fontSize.base,
    },
    inputError: { borderColor: c.destructive },
    errorText: {
      marginTop: theme.spacing[1],
      color: c.destructive,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.xs,
    },
    serverErrorBox: {
      backgroundColor: c.destructive,
      borderRadius: theme.radius.md,
      padding: theme.spacing[3],
      marginBottom: theme.spacing[4],
    },
    serverErrorText: {
      color: c.destructiveForeground,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
    button: {
      backgroundColor: c.primary,
      paddingVertical: theme.spacing[4],
      borderRadius: theme.radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
      color: c.primaryForeground,
      fontFamily: theme.typography.fontFamily.semibold,
      fontSize: theme.typography.fontSize.base,
    },
    footerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing[5],
    },
    link: {
      color: c.accent,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.fontSize.sm,
    },
  });
}
