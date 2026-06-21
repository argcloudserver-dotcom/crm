import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SessionStorageAdapter } from "@workspace/shared/auth";

const MIGRATED_FLAG = "__secure_migrated_v1";
const KEYS = ["accessToken", "refreshToken", "user"] as const;

async function migrateOnce() {
  const done = await AsyncStorage.getItem(MIGRATED_FLAG);
  if (done) return;
  for (const k of KEYS) {
    const v = await AsyncStorage.getItem(k);
    if (v != null) {
      await SecureStore.setItemAsync(k, v);
      await AsyncStorage.removeItem(k);
    }
  }
  await AsyncStorage.setItem(MIGRATED_FLAG, "1");
}

export const secureSessionAdapter: SessionStorageAdapter = {
  async getItem(key) {
    await migrateOnce();
    return SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async removeItem(key) {
    await SecureStore.deleteItemAsync(key);
  },
};