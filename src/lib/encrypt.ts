import crypto from "crypto";

// AES-256-GCM for secrets at rest (e.g. the Google Drive refresh token), and a
// salted IP hash for rate-limit correlation without storing raw IPs (Law 25).
// Key is 32 bytes, provided as 64 hex chars in ENCRYPTION_KEY.
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? "", "hex");

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function decrypt(b64: string): string {
  const b = Buffer.from(b64, "base64");
  const d = crypto.createDecipheriv("aes-256-gcm", KEY, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return d.update(b.subarray(28)) + d.final("utf8");
}

export function hashIp(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + KEY.toString("hex"))
    .digest("hex");
}
