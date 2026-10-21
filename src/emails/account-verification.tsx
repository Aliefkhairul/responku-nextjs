import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components"
import type { CSSProperties } from "react"

type AccountVerificationEmailProps = {
    name: string
    code: string
    expiresInMinutes: number
}

/**
 * Sent after registration. Carries the 6-digit OTP the user must submit to
 * activate the account.
 */
export function AccountVerificationEmail({ name, code, expiresInMinutes }: AccountVerificationEmailProps) {
    return (
        <Html lang="en">
            <Head />
            <Preview>Verify your Responku email address</Preview>
            <Body style={body}>
                <Container style={container}>
                    <Heading style={heading}>Verify your email</Heading>
                    <Text style={paragraph}>Hi {name},</Text>
                    <Text style={paragraph}>Thanks for signing up to Responku. Enter the verification code below to activate your account.</Text>
                    <Section style={codeBox}>
                        <Text style={codeText}>{code}</Text>
                    </Section>
                    <Text style={paragraph}>
                        This code expires in {expiresInMinutes} minutes. If you did not create a Responku account, you can safely ignore this email.
                    </Text>
                    <Hr style={divider} />
                    <Text style={footer}>Responku</Text>
                </Container>
            </Body>
        </Html>
    )
}

export default AccountVerificationEmail

/* ========== Styles ========== */

const body: CSSProperties = {
    backgroundColor: "#f4f4f5",
    fontFamily: "Helvetica, Arial, sans-serif",
    padding: "32px 12px",
}

const container: CSSProperties = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "480px",
    padding: "32px",
}

const heading: CSSProperties = {
    color: "#18181b",
    fontSize: "22px",
    fontWeight: 700,
    margin: "0 0 16px",
}

const paragraph: CSSProperties = {
    color: "#3f3f46",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 16px",
}

const codeBox: CSSProperties = {
    backgroundColor: "#f4f4f5",
    borderRadius: "8px",
    margin: "24px 0",
    padding: "16px 0",
    textAlign: "center",
}

const codeText: CSSProperties = {
    color: "#18181b",
    fontSize: "32px",
    fontWeight: 700,
    letterSpacing: "8px",
    margin: 0,
}

const divider: CSSProperties = {
    borderColor: "#e4e4e7",
    margin: "24px 0 16px",
}

const footer: CSSProperties = {
    color: "#a1a1aa",
    fontSize: "13px",
    margin: 0,
}
