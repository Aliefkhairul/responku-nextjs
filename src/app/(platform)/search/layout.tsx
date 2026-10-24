import Link from "next/link"
import { type ReactNode, Suspense } from "react"
import FeedSearch from "@/components/feed/feed-search"
import AuthNav from "@/components/shared/auth-nav"
import { Separator } from "@/components/ui/separator"

/**
 * The search shell: the same fixed header the feed uses, with the search box that reads and
 * writes `?q=`. The box and the page below both read the URL, so each gets its own Suspense
 * boundary.
 */
export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="w-full">
            <header className="fixed inset-x-0 top-0 z-10 h-15 border-b bg-background px-2 md:px-0">
                <nav className="container3nd mx-auto flex h-full items-center justify-between gap-3">
                    <div className="flex h-4 items-center space-x-2">
                        <Link href="/" className="whitespace-nowrap text-lg font-semibold">
                            Responku
                        </Link>
                        <Separator orientation="vertical" />
                        <span className="leading-relaxed text-muted-foreground">pencarian</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Suspense fallback={<div className="h-9 w-36 sm:w-64" />}>
                            <FeedSearch />
                        </Suspense>

                        <AuthNav />
                    </div>
                </nav>
            </header>

            <Suspense>{children}</Suspense>
        </div>
    )
}
