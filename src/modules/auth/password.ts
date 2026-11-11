import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

/**
 * Password hashing with Node's built-in scrypt (memory-hard KDF).
 * Chosen over bcrypt to avoid native-build issues on Windows dev machines and
 * in Alpine containers. Stored format: `scrypt$<salt-hex>$<hash-hex>`.
 */

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const derived = await scrypt(password, salt, KEY_LENGTH)
  return `scrypt$${salt}$${derived.toString("hex")}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$")
  if (parts.length !== 3 || parts[0] !== "scrypt") return false
  const [, salt, hashHex] = parts
  const hash = Buffer.from(hashHex, "hex")
  if (hash.length !== KEY_LENGTH) return false
  const derived = await scrypt(password, salt, KEY_LENGTH)
  return derived.length === hash.length && timingSafeEqual(derived, hash)
}
