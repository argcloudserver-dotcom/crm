export function getAppUrl(req: { headers: { host?: string } }): string {
  // AUDIT FIX: env schema defines PUBLIC_APP_URL; the old code read APP_URL,
  // which was always undefined and broke OAuth callback URLs.
  const fromEnv = process.env["PUBLIC_APP_URL"] ?? process.env["APP_URL"];
  if (fromEnv) return fromEnv;
  const protocol = process.env["NODE_ENV"] === "production" ? "https" : "http";
  return `${protocol}://${req.headers.host ?? "localhost"}`;
}
