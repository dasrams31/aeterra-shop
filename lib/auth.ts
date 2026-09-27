import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { SESSION_COOKIE, type SessionPayload } from "@/lib/session";

function getSecret() {
  const secret = process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || "AeternumSecretKey2026AES256SecureSalt";
  return secret;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function createSessionToken(payload: Omit<SessionPayload, "exp"> & { exp?: number }) {
  const session: SessionPayload = {
    ...payload,
    exp: payload.exp ?? Date.now() + 1000 * 60 * 60 * 24 * 7
  };

  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null) {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
  if (payload.exp < Date.now()) return null;
  return payload;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
