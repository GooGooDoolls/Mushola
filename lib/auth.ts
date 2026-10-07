import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "mushola_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function getConfig() {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;
  if (!password || !secret) throw new Error("Missing ADMIN_PASSWORD or AUTH_SECRET");
  return { password, secret };
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function verifyAdminPassword(password: string) {
  const { password: expected } = getConfig();
  const actual = Buffer.from(password);\n  const target = Buffer.from(expected);\n  return actual.length === target.length && timingSafeEqual(actual, target);
}

export function createSessionToken() {
  const { secret } = getConfig();
  const issuedAt = Date.now().toString();
  return issuedAt + "." + sign(issuedAt, secret);
}

export function isValidSessionToken(token: string | undefined) {
  if (!token) return false;
  const { secret } = getConfig();
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;
  const age = Date.now() - Number(issuedAt);
  if (!Number.isFinite(age) || age < 0 || age > SESSION_TTL_MS) return false;
  const expected = sign(issuedAt, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export { COOKIE_NAME, SESSION_TTL_MS };
