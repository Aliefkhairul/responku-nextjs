import { NextRequest, NextResponse } from "next/server"

/** use service folder */
/** by default user have a roles -> ["user"] */
/** see lib/utils folders for helper function, example: otp verification */
/** see lib/http-exeptions for helper */

/** login */
async function loginHandler(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json({ message: "Login", body })
}

/** register and send otp verification */
async function registerHandler(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json({ message: "Register", body })
}

/** logout */
async function logoutHandler(req: NextRequest) {
  return NextResponse.json({ message: "Logout" })
}

export async function POST(req: NextRequest) {
  const pathname = req.nextUrl.pathname.replace(/^\/api\/auth\/?/, "")

  switch (pathname) {
    case "login":
      return loginHandler(req)
    case "register":
      return registerHandler(req)
    case "logout":
      return logoutHandler(req)
    default:
      return NextResponse.json({ message: "Not Found" }, { status: 404 })
  }
}
