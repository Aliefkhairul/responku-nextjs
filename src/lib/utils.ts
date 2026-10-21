import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createHmac, randomBytes, randomInt } from "node:crypto"
export { cn } from "cn"

const authSecret = process.env.AUTH_SECRET
if (authSecret === undefined) throw Error("AUTH_SECRET_NOT_FOUND")

/**
 * Generates a random raw token and its corresponding HMAC-SHA256 hash.
 *
 * Useful for creating session tokens and verification hashes.
 */
export function generateTokenWithHash() {
  const rawToken = randomBytes(32).toString("base64url")
  const hashedToken = createHmac("sha256", authSecret as string)
    .update(rawToken)
    .digest("hex")
  return { rawToken, hashedToken }
}

/**
 * Hashes a given raw token using HMAC-SHA256
 * and the application's auth secret.
 */
export function hashToken(rawToken: string) {
  return createHmac("sha256", authSecret as string)
    .update(rawToken)
    .digest("hex")
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateOTP(): string {
  return randomInt(100000, 1000000).toString()
}

type SetSessionCookie = {
  token: string
  cookieName: string
  maxAge: number
}

/**
 * Sets a secure, HTTP-only session cookie.
 *
 * Must be called from a Server Action or Route Handler.
 */
export async function setSessionCookie({ token, cookieName, maxAge }: SetSessionCookie): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge,
    path: "/",
  })
}

/**
 * Clears the session cookie from the client's browser.
 *
 * Must be called from a Server Action or Route Handler.
 */
type ClearSessionCookie = {
  cookieName: string
}

export async function clearSessionCookie({ cookieName }: ClearSessionCookie): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(cookieName, "", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
}

type SuccessResponseOptions<T extends object = Record<string, unknown>> = {
  data?: T
  message?: string
  statusCode?: number
  meta?: Record<string, unknown>
}

type ExceptionResponseOptions = {
  message?: string
  statusCode?: number
  errors?: Record<string, unknown>
}

/**
 * Standardizes a successful API response into a JSON NextResponse.
 *
 * @param options - Options for the response including data, message, statusCode, and meta.
 * @returns A NextResponse formatted as a JSON success response.
 */
export function successResponse<T extends object = Record<string, unknown>>({
  data = {} as T,
  message = "Success",
  statusCode = 200,
  meta = {},
}: SuccessResponseOptions<T> = {}) {
  return NextResponse.json(
    {
      ok: true,
      statusCode,
      message,
      data,
      meta,
    },
    { status: statusCode },
  )
}

/**
 * Standardizes an error API response into a JSON NextResponse.
 *
 * @param options - Options for the response including message, statusCode, and field errors.
 * @returns A NextResponse formatted as a JSON error response.
 */
export function exceptionResponse({ message = "Bad Request", statusCode = 400, errors = {} }: ExceptionResponseOptions = {}) {
  return NextResponse.json(
    {
      ok: false,
      statusCode,
      message,
      errors,
    },
    { status: statusCode },
  )
}
