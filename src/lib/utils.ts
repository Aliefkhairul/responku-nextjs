import { createHmac, randomBytes, randomInt } from "crypto"
export { cn } from "cn"

const authSecret = process.env.AUTH_SECRET

export function generateTokenWithHash() {
  if (authSecret === undefined) throw new Error("authSecret not found")
  const rawToken = randomBytes(32).toString("base64url")
  const hashedToken = createHmac("sha256", authSecret).update(rawToken).digest("hex")
  return { rawToken, hashedToken }
}

export function hashToken(rawToken: string) {
  if (authSecret === undefined) throw new Error("authSecret not found")
  return createHmac("sha256", authSecret).update(rawToken).digest("hex")
}

export function generateOTP(): string {
  return randomInt(100000, 1000000).toString()
}
