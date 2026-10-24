import { headers } from "next/headers"
import type { ReactNode } from "react"
import type { HighlightResearch } from "@/lib/api-types"
import { cn } from "@/lib/cn"
import { RESEARCH_CATEGORY_ITEMS } from "@/lib/research-category"
import Link from "next/link"

/** A small pill, matching the badge look without pulling a client component into the page. */
function Pill({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                "inline-flex h-5 w-fit shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-secondary-foreground",
                className,
            )}
        >
            {children}
        </span>
    )
}

function categoryLabel(category: string | null) {
    return RESEARCH_CATEGORY_ITEMS.find((item) => item.value === category)?.label ?? "Tanpa kategori"
}

/** The card's frame, shared by the loaded card and its placeholder so the two line up. */
const CARD_CLASS = "absolute right-4 bottom-4 w-60 rounded-xl bg-card p-4 shadow-lg ring-1 ring-foreground/10 sm:right-8 sm:bottom-8 sm:w-72"

/**
 * Reads the featured research from this app's own endpoint.
 *
 * The request is made on the server, against the same origin the page was requested on, so the
 * card is rendered from the API's answer rather than a client fetch after paint.
 */
async function readHighlight(): Promise<HighlightResearch | null> {
    const requestHeaders = await headers()
    const host = requestHeaders.get("host")

    if (host === null) return null

    const protocol = requestHeaders.get("x-forwarded-proto") ?? "http"

    try {
        const response = await fetch(`${protocol}://${host}/api/research/highlight`, { cache: "no-store" })
        const payload = (await response.json()) as { ok?: boolean; data?: { research: HighlightResearch | null } }

        return payload.ok === true ? (payload.data?.research ?? null) : null
    } catch {
        // The card is decoration: a failed read hides it rather than breaking the page.
        return null
    }
}

/**
 * The landing page's floating highlight card.
 *
 * A server component: it reads the featured research from `GET /api/research/highlight` on the
 * server, so the card is part of the streamed HTML rather than a client fetch after paint. The
 * endpoint is the same published pool the feed reads, so it is public.
 */
export default async function HighlightCard() {
    const research = await readHighlight()

    if (research === null) return null

    return (
        <Link href={`/research/${research.id}`}>
            <div className={`${CARD_CLASS}`}>
                <div className="flex items-center justify-between gap-2">
                    <Pill>{categoryLabel(research.category)}</Pill>
                    <span className="text-xs text-muted-foreground">{research.daysLeft} hari lagi</span>
                </div>

                <p className="mt-3 text-sm leading-snug font-semibold">{research.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">oleh {research.researcherName}</p>
            </div>
        </Link>
    )
}

/** The placeholder shown while the card's read is in flight. */
export function HighlightCardSkeleton() {
    return (
        <div className={`${CARD_CLASS}`} aria-hidden="true">
            <div className="flex items-center justify-between gap-2">
                <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            </div>

            <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
    )
}
