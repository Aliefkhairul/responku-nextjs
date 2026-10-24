import { LayoutDashboard } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { type ReactNode, Suspense } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { hasRole } from "@/lib/server/roles"
import { getSession } from "@/service/auth"

/**
 * Block the route on the role check instead of streaming a placeholder.
 *
 * Reading the session is dynamic data, which `cacheComponents` would otherwise refuse to
 * prerender outside a `<Suspense>` boundary. The gate has to finish before anything renders,
 * so the route opts into a blocking render rather than showing a fallback first.
 */
export const instant = false

/**
 * The admin shell, and the gate in front of it.
 *
 * The role is checked here, on the server, before anything renders: an account without the
 * `admin` role is redirected instead of being shown the back office and then bounced, so no
 * admin panel is ever mounted for them. The proxy above only checks that a session cookie is
 * present — this is where the role itself is enforced for the pages.
 */
export default async function Layout({ children }: { children: ReactNode }) {
    const session = await getSession()

    if (session === null) redirect("/login")
    if (!hasRole(session.user.roles, "admin")) redirect("/dashboard")

    return (
        <div className="w-full overflow-hidden">
            <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
                <nav className="container2nd mx-auto flex h-full items-center justify-between">
                    <div className="flex h-4 items-center space-x-2">
                        <Link href="/" className="whitespace-nowrap text-lg font-bold">
                            Responku
                        </Link>
                        <Separator orientation="vertical" />
                        <span className="leading-relaxed text-muted-foreground">panel admin</span>
                    </div>

                    <Link href="/dashboard">
                        <Button variant="outline">
                            <LayoutDashboard className="size-4" />
                            <span>Dashboard</span>
                        </Button>
                    </Link>
                </nav>
            </header>

            {/* Wider than the app's own container: the queues here are dense lists, not prose. */}
            <main className="container2nd mx-auto mt-20 py-2">
                <Suspense>{children}</Suspense>
            </main>
        </div>
    )
}
