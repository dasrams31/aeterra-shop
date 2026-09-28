import { SESSION_COOKIE, type SessionPayload } from "@/lib/session";

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || "AeternumSecretKey2026AES256SecureSalt";
}

function base64UrlToText(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(base64);
}

function base64Url(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return base64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
}

export async function verifyEdgeSessionToken(token: string | undefined | null) {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  if ((await sign(body)) !== signature) return null;

  try {
    const payload = JSON.parse(base64UrlToText(body)) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
