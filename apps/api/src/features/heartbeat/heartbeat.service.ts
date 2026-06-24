import { markStaleUsersOffline, markUserOnline } from "./heartbeat.repository";
import type { HeartbeatResult } from "./heartbeat.types";
import { logger } from "../../lib/logger";

const lastDbUpdate = new Map<string, number>();
const DB_SYNC_INTERVAL = 5 * 60 * 1000;
const OFFLINE_GRACE_MS = 35_000;
const SWEEP_INTERVAL_MS = 30_000;

export async function recordHeartbeat(userId: string): Promise<HeartbeatResult> {
  const now = Date.now();
  const lastUpdate = lastDbUpdate.get(userId) ?? 0;
  if (now - lastUpdate > DB_SYNC_INTERVAL) {
    // FIX: heartbeat must always respond — a transient DB failure used to
    // bubble up and the upstream proxy returned 502. Swallow + log instead.
    try {
      await markUserOnline(userId);
      lastDbUpdate.set(userId, now);
    } catch (err) {
      logger.warn({ err, userId }, "[heartbeat] markUserOnline failed");
    }
  }
  return { ok: true, timestamp: now };
}

let sweeperStarted = false;
export function startOfflineSweeper(): void {
  if (sweeperStarted) return;
  sweeperStarted = true;
  setInterval(async () => {
    try {
      await markStaleUsersOffline(new Date(Date.now() - OFFLINE_GRACE_MS));
    } catch (err) {
      logger.warn({ err }, "[heartbeat] sweeper failed");
    }
  }, SWEEP_INTERVAL_MS).unref?.();
}
