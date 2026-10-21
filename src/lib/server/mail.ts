import { Resend } from "resend"
import { AccountVerificationEmail } from "@/emails/account-verification"
import { env } from "@/env"

export const resend = new Resend(env.RESEND_API_KEY)

/**
 * Sender used for transactional mail.
 *
 * `APP_MAIL_NAME` holds the sending domain suffix (e.g. `"@email.pickblue.cloud"`),
 * so mail goes out from `no-reply@email.pickblue.cloud` unless an explicit
 * `MAIL_FROM_ADDRESS` overrides it. The domain must be verified in Resend.
 */
const MAIL_FROM = env.MAIL_FROM_ADDRESS ?? `no-reply${env.APP_MAIL_NAME ?? "@resend.dev"}`

type SendAccountVerificationEmail = {
    to: string
    name: string
    code: string
    expiresInMinutes: number
}

/**
 * Sends the account verification OTP.
 *
 * Resend resolves with an `error` object rather than rejecting, so a failed
 * delivery is re-thrown here to let callers decide what to do about it.
 */
export async function sendAccountVerificationEmail({ to, name, code, expiresInMinutes }: SendAccountVerificationEmail) {
    const { error } = await resend.emails.send({
        from: MAIL_FROM,
        to,
        subject: "Your Responku verification code",
        react: AccountVerificationEmail({ name, code, expiresInMinutes }),
    })

    if (error) throw new Error(`RESEND_SEND_FAILED: ${error.message}`)
}
