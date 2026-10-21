import { cookies } from "next/headers"
import { generateOTP, generateTokenWithHash, hashPassword, hashToken, verifyPassword } from "@/lib/server/crypto"
import { BadRequestException, ConflictException, UnauthorizedException } from "@/lib/server/http-exception"
import { sendAccountVerificationEmail } from "@/lib/server/mail"
import { clearSessionCookie, SESSION_COOKIE_NAME, setSessionCookie } from "@/lib/server/session"
import { VerificationType } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"

/* ========== Konstanta ========== */

/** Sessions stay valid for 30 days. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

/** Verification codes stay valid for 15 minutes. */
const VERIFICATION_TTL_MS = 15 * 60 * 1000

/** Provider id used for email + password accounts. */
const CREDENTIALS_PROVIDER_ID = "credentials"

/** Roles every newly registered user starts with. */
const DEFAULT_ROLES = ["user"]

/* ========== Tipe ========== */

type RegisterInput = {
    name: string
    email: string
    password: string
}

type LoginInput = {
    email: string
    password: string
    ipAddress?: string | null
    userAgent?: string | null
}

/* ========== Helper ========== */

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
}

/* ========== Register ========== */

/**
 * Creates an email + password account and sends the verification OTP.
 *
 * The user, its credentials account, and the verification record are written as
 * one nested write, which Prisma runs in a transaction so a partial account can
 * never be left behind.
 */
export async function registerService({ name, email, password }: RegisterInput) {
    const normalizedEmail = normalizeEmail(email)

    const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
    })
    if (existingUser) throw new ConflictException("Email is already registered")

    const passwordHash = await hashPassword(password)
    const { hashedToken } = generateTokenWithHash()
    const code = generateOTP()
    const expiredAt = new Date(Date.now() + VERIFICATION_TTL_MS)

    const user = await prisma.user.create({
        data: {
            name,
            email: normalizedEmail,
            roles: DEFAULT_ROLES,
            account: {
                create: {
                    accountId: normalizedEmail,
                    providerId: CREDENTIALS_PROVIDER_ID,
                    password: passwordHash,
                },
            },
            verifications: {
                create: {
                    type: VerificationType.ACCOUNT_VERIFICATION,
                    tokenHash: hashedToken,
                    code,
                    expiredAt,
                },
            },
        },
        select: { id: true, name: true, email: true, verifiedAt: true },
    })

    let verificationSent = true
    try {
        await sendAccountVerificationEmail({
            to: user.email,
            name: user.name,
            code,
            expiresInMinutes: VERIFICATION_TTL_MS / 60_000,
        })
    } catch (error) {
        // The account exists regardless, so a delivery failure is surfaced to the
        // caller rather than rolling the registration back.
        verificationSent = false
        console.error("[auth] failed to send account verification email", error)
    }

    return { user, verificationSent }
}

/* ========== Confirm verification ========== */

type ConfirmVerificationInput = {
    email: string
    code: string
}

/**
 * Consumes the account verification OTP and marks the user as verified.
 *
 * The user is not signed in at this point, so the account is identified by the
 * email the code was sent to. Every failure — unknown account, missing
 * verification, expired code, wrong code — reports the same error, so the
 * response cannot be used to probe which accounts exist.
 *
 * Idempotent: confirming an account that is already verified succeeds again,
 * so a double-submitted form does not turn into an error.
 */
export async function confirmVerificationService({ email, code }: ConfirmVerificationInput) {
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true, name: true, email: true, verifiedAt: true, deletedAt: true },
    })

    const invalidCode = new BadRequestException("Invalid or expired verification code", {
        code: "The verification code is invalid or has expired.",
    })

    if (!user || user.deletedAt !== null) throw invalidCode

    if (user.verifiedAt !== null) {
        return {
            user: { id: user.id, name: user.name, email: user.email, verifiedAt: user.verifiedAt },
            alreadyVerified: true,
        }
    }

    const verification = await prisma.verification.findFirst({
        where: { userId: user.id, type: VerificationType.ACCOUNT_VERIFICATION, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { code: true, expiredAt: true },
    })

    if (!verification || verification.code === null) throw invalidCode
    if (verification.expiredAt.getTime() <= Date.now()) throw invalidCode
    if (verification.code !== code) throw invalidCode

    const verifiedAt = new Date()

    // Consuming the code is what makes it single-use: the row is deleted rather
    // than flagged, so the same OTP can never be replayed.
    await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { verifiedAt } }),
        prisma.verification.deleteMany({ where: { userId: user.id, type: VerificationType.ACCOUNT_VERIFICATION } }),
    ])

    return {
        user: { id: user.id, name: user.name, email: user.email, verifiedAt },
        alreadyVerified: false,
    }
}

/* ========== Login ========== */

/**
 * Verifies email + password credentials and starts a new session.
 *
 * The raw session token only ever lives in the HTTP-only cookie; the database
 * stores its hash.
 */
export async function loginService({ email, password, ipAddress, userAgent }: LoginInput) {
    const normalizedEmail = normalizeEmail(email)

    const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
            id: true,
            name: true,
            email: true,
            roles: true,
            verifiedAt: true,
            deletedAt: true,
            account: { select: { password: true } },
        },
    })

    // Same error for unknown account, wrong password, and disabled account so the
    // response cannot be used to enumerate registered emails.
    const invalidCredentials = new UnauthorizedException("Invalid email or password")

    if (!user || user.deletedAt !== null) throw invalidCredentials
    if (!user.account?.password) throw invalidCredentials
    if (!(await verifyPassword(password, user.account.password))) throw invalidCredentials

    const { rawToken, hashedToken } = generateTokenWithHash()
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)

    await prisma.session.create({
        data: {
            userId: user.id,
            token: hashedToken,
            expiresAt,
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
        },
    })

    await setSessionCookie({
        token: rawToken,
        cookieName: SESSION_COOKIE_NAME,
        maxAge: SESSION_TTL_SECONDS,
    })

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            roles: user.roles,
            verifiedAt: user.verifiedAt,
        },
        expiresAt,
    }
}

/* ========== Logout ========== */

/**
 * Revokes the current session and clears the session cookie.
 *
 * Idempotent: signing out without a valid session still succeeds.
 */
export async function logoutService(): Promise<void> {
    const cookieStore = await cookies()
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (rawToken) {
        await prisma.session.deleteMany({ where: { token: hashToken(rawToken) } })
    }

    await clearSessionCookie({ cookieName: SESSION_COOKIE_NAME })
}

/* ========== Session ========== */

/**
 * Resolves the session behind the current request.
 *
 * Returns `null` when the request carries no cookie, an unknown token, an
 * expired session, or a session whose user has since been soft-deleted.
 */
export async function getSession() {
    const cookieStore = await cookies()
    const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!rawToken) return null

    const session = await prisma.session.findUnique({
        where: { token: hashToken(rawToken) },
        select: {
            id: true,
            expiresAt: true,
            deletedAt: true,
            user: {
                select: { id: true, name: true, email: true, image: true, roles: true, verifiedAt: true, createdAt: true, deletedAt: true },
            },
        },
    })

    if (!session || session.deletedAt !== null) return null
    if (session.expiresAt.getTime() <= Date.now()) return null
    if (session.user.deletedAt !== null) return null

    return session
}

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>

/**
 * Same as `getSession`, but throws a 401 instead of returning `null`.
 *
 * Route handlers use this to guard endpoints that need a signed-in user.
 */
export async function requireSession(): Promise<Session> {
    const session = await getSession()
    if (!session) throw new UnauthorizedException("Authentication required")
    return session
}

/* ========== Current user ========== */

/**
 * Public view of a user: identity fields only, without the soft-delete
 * bookkeeping that `getSession` reads internally.
 */
function toCurrentUser({ user }: Session) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        roles: user.roles,
        verifiedAt: user.verifiedAt,
        createdAt: user.createdAt,
    }
}

export type CurrentUser = ReturnType<typeof toCurrentUser>

/**
 * Returns the signed-in user, or `null` when the request has no valid session.
 *
 * Use this where an absent session is an ordinary outcome rather than an error,
 * such as from a server action.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
    const session = await getSession()
    return session === null ? null : toCurrentUser(session)
}

/**
 * Same as `getCurrentUser`, but throws a 401 instead of returning `null`.
 *
 * Route handlers use this to guard endpoints that need a signed-in user.
 */
export async function requireCurrentUser(): Promise<CurrentUser> {
    return toCurrentUser(await requireSession())
}
