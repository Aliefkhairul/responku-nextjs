"use client"

import { ChevronLeft, ChevronRight, Loader2, RefreshCw, Search } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import BrowseSurveyCard from "@/components/shared/browse-survey-card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getJson } from "@/lib/api-client"
import type { AvailableResearchRow } from "@/lib/api-types"
import { regionItems } from "@/lib/editor-engine/research-editor-schema"
import { RESEARCH_CATEGORY_ITEMS } from "@/lib/research-category"

/** Longest page the feed endpoint will hand back. */
const LIST_LIMIT = 100

/** How many cards a page shows. */
const PAGE_SIZE = 8

/**
 * The pool the search runs over, read in one go and filtered in the browser so the count and
 * the rows agree.
 *
 * The pool endpoint is public — it reads the session only to hide the caller's own research —
 * so the search works for a signed-out visitor with no account read of its own.
 */
type SearchState = { status: "loading" } | { status: "ready"; researches: AvailableResearchRow[] } | { status: "error"; message: string }

async function readSearch(): Promise<SearchState> {
    const available = await getJson<{ researches: AvailableResearchRow[] }>(`/api/research/available?take=${LIST_LIMIT}`)

    if (!available.ok || available.data === null) return { status: "error", message: available.message }

    return { status: "ready", researches: available.data.researches }
}

export default function Page() {
    const searchParams = useSearchParams()
    const rawQuery = searchParams.get("q") ?? ""
    const query = rawQuery.trim().toLowerCase()

    const [state, setState] = useState<SearchState>({ status: "loading" })
    const [category, setCategory] = useState("ALL")
    const [region, setRegion] = useState("ALL")
    const [page, setPage] = useState(1)

    const resultsRef = useRef<HTMLDivElement>(null)

    // Any change to the filters or the search starts the list over at page one.
    // biome-ignore lint/correctness/useExhaustiveDependencies: the filters are triggers for the reset, not values the effect reads.
    useEffect(() => {
        setPage(1)
    }, [category, region, query])

    useEffect(() => {
        let cancelled = false

        void readSearch().then((next) => {
            if (!cancelled) setState(next)
        })

        return () => {
            cancelled = true
        }
    }, [])

    const reload = useCallback(() => {
        setState({ status: "loading" })
        void readSearch().then(setState)
    }, [])

    const researches = state.status === "ready" ? state.researches : []

    // Every category and region is always offered — even when nothing matches right now —
    // so the selects never shift or shrink as the results change.
    const categories = RESEARCH_CATEGORY_ITEMS
    const regions = regionItems

    // The option lists the selects use to render a chosen value as its label rather than its
    // raw key; the "all" entry is included so the default reads as text too.
    const categoryOptions = [{ value: "ALL", label: "Semua kategori" }, ...categories]
    const regionOptions = [{ value: "ALL", label: "Semua domisili" }, ...regions]

    const visible = researches.filter((research) => {
        if (category !== "ALL" && research.category !== category) return false
        if (region !== "ALL" && research.region !== region) return false

        if (query !== "") {
            const haystack = `${research.title} ${research.researcherName} ${research.description}`.toLowerCase()
            if (!haystack.includes(query)) return false
        }

        return true
    })

    const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
    // Clamped, so a page that no longer exists after filtering falls back to the last one.
    const currentPage = Math.min(page, pageCount)
    const paged = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

    function goToPage(next: number) {
        setPage(next)
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    return (
        <main className="container3nd mx-auto mt-15 py-8 pb-16">
            {/* hero — the search page's own look, distinct from the feed's plain header */}
            <section className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-secondary/40 via-background to-background px-6 py-10 sm:px-10 sm:py-14">
                <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-10 size-72 rounded-full bg-primary/10 blur-3xl" />
                <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-16 size-72 rounded-full bg-secondary/40 blur-3xl" />

                <div className="relative max-w-2xl">
                    <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                        <Search className="size-3.5" />
                        Pencarian riset
                    </span>

                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                        {query === "" ? "Jelajahi semua riset" : `Hasil untuk “${rawQuery}”`}
                    </h1>

                    <p className="mt-3 leading-relaxed text-muted-foreground">
                        {query === ""
                            ? "Menampilkan semua riset yang sedang dibuka. Ketik kata kunci untuk mempersempit pencarian."
                            : "Saring hasil sesuai domisili dan kategori untuk mempersempit pencarian."}
                    </p>
                </div>
            </section>

            {/* filters */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                    <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Kategori</span>

                    <Select items={categoryOptions} value={category} onValueChange={(value) => value !== null && setCategory(value)}>
                        <SelectTrigger className="rounded-full" aria-label="Saring berdasarkan kategori">
                            <SelectValue placeholder="Semua kategori" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl w-fit bg-background">
                            <SelectItem value="ALL">Semua kategori</SelectItem>
                            {categories.map((item) => (
                                <SelectItem className="rounded-full" key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                    <span className="hidden text-sm font-medium text-muted-foreground sm:inline">Domisili</span>

                    <Select items={regionOptions} value={region} onValueChange={(value) => value !== null && setRegion(value)}>
                        <SelectTrigger className="rounded-full" aria-label="Saring berdasarkan domisili">
                            <SelectValue placeholder="Semua domisili" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl w-fit bg-background">
                            <SelectItem value="ALL">Semua domisili</SelectItem>
                            {regions.map((item) => (
                                <SelectItem className="rounded-full" key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* results */}
            <div ref={resultsRef} className="mt-8 scroll-mt-20">
                {state.status === "loading" && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Mencari riset…
                    </p>
                )}

                {state.status === "error" && (
                    <div className="space-y-3">
                        <p role="alert" className="text-sm text-destructive">
                            {state.message}
                        </p>

                        <Button variant="outline" size="sm" onClick={reload}>
                            <RefreshCw />
                            Coba lagi
                        </Button>
                    </div>
                )}

                {state.status === "ready" && (
                    <>
                        <p className="text-sm text-muted-foreground">{visible.length} riset ditemukan</p>

                        {visible.length === 0 ? (
                            <p className="mt-4 text-sm text-muted-foreground">
                                {query === "" ? "Belum ada riset yang cocok dengan filter ini." : `Tidak ada riset yang cocok dengan “${rawQuery}”.`}
                            </p>
                        ) : (
                            <>
                                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                    {paged.map((research) => (
                                        <BrowseSurveyCard key={research.id} research={research} respondentId={null} />
                                    ))}
                                </div>

                                {pageCount > 1 && (
                                    <div className="mt-8 flex items-center justify-between gap-3">
                                        <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
                                            <ChevronLeft />
                                            Sebelumnya
                                        </Button>

                                        <span className="text-sm text-muted-foreground">
                                            Halaman {currentPage} dari {pageCount}
                                        </span>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={currentPage >= pageCount}
                                            onClick={() => goToPage(currentPage + 1)}
                                        >
                                            Berikutnya
                                            <ChevronRight />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}
