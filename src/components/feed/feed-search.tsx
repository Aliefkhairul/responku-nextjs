"use client"

import { Loader2, Search } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { getJson } from "@/lib/api-client"
import type { SearchResults } from "@/lib/api-types"
import { useDebounce } from "@/lib/use-debounce"

/** Where a submitted search lands. */
const SEARCH_PATH = "/search"

/** How many suggestions of each kind the dropdown asks for. */
const SUGGESTION_LIMIT = 5

/** The shortest term worth asking the API about, matching the endpoint's own rule. */
const MIN_QUERY_LENGTH = 2

/** How long typing must pause before a suggestion request goes out. */
const DEBOUNCE_MS = 300

type SuggestionsState = { status: "idle" } | { status: "loading" } | { status: "ready"; results: SearchResults } | { status: "error" }

/**
 * The search box shared by the feed and search headers.
 *
 * Typing does not filter anything in place. It debounces the term and asks `/api/search` for a
 * few suggestions, shown in a dropdown; submitting the form — Enter, or the browser's own
 * search affordance — sends the visitor to `/search?q=`, where the full results live. The term
 * is kept in the URL rather than in component state, so a search can be shared as a link and
 * the back button works.
 */
export default function FeedSearch() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [value, setValue] = useState(searchParams.get("q") ?? "")
    const [open, setOpen] = useState(false)
    const [suggestions, setSuggestions] = useState<SuggestionsState>({ status: "idle" })

    const term = value.trim()
    const debouncedTerm = useDebounce(term, DEBOUNCE_MS)
    const containerRef = useRef<HTMLDivElement>(null)

    // Keep the box in step with the URL when it changes from elsewhere (e.g. the back button).
    useEffect(() => {
        setValue(searchParams.get("q") ?? "")
    }, [searchParams])

    // Ask for suggestions once the typing pauses, so a burst of keystrokes is one request.
    useEffect(() => {
        if (debouncedTerm.length < MIN_QUERY_LENGTH) {
            setSuggestions({ status: "idle" })
            return
        }

        let cancelled = false
        setSuggestions({ status: "loading" })

        void getJson<SearchResults>(`/api/search?q=${encodeURIComponent(debouncedTerm)}&limit=${SUGGESTION_LIMIT}`).then((result) => {
            if (cancelled) return
            setSuggestions(result.ok && result.data !== null ? { status: "ready", results: result.data } : { status: "error" })
        })

        return () => {
            cancelled = true
        }
    }, [debouncedTerm])

    // Close the panel when a click lands outside the box.
    useEffect(() => {
        function onPointerDown(event: MouseEvent) {
            if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) setOpen(false)
        }

        document.addEventListener("mousedown", onPointerDown)

        return () => document.removeEventListener("mousedown", onPointerDown)
    }, [])

    /** Sends the current term to the search page, where the full, paged results live. */
    function goToSearch() {
        setOpen(false)

        const params = new URLSearchParams()
        if (term !== "") params.set("q", term)

        const query = params.toString()
        router.push(query === "" ? SEARCH_PATH : `${SEARCH_PATH}?${query}`)
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        goToSearch()
    }

    const showPanel = open && debouncedTerm.length >= MIN_QUERY_LENGTH
    const results = suggestions.status === "ready" ? suggestions.results : null
    const isEmpty = results !== null && results.researches.length === 0 && results.respondents.length === 0

    return (
        <div ref={containerRef} className="relative w-36 sm:w-64">
            <form onSubmit={submit} role="search" className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                    type="search"
                    value={value}
                    onChange={(event) => {
                        setValue(event.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") setOpen(false)
                    }}
                    placeholder="Cari riset…"
                    aria-label="Cari riset"
                    aria-expanded={showPanel}
                    aria-controls="search-suggestions"
                    autoComplete="off"
                    className="rounded-full pl-9"
                />
            </form>

            {showPanel && (
                <div
                    id="search-suggestions"
                    className="absolute top-full right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lg"
                >
                    {suggestions.status === "loading" && (
                        <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" />
                            Mencari…
                        </p>
                    )}

                    {suggestions.status === "error" && (
                        <p className="px-4 py-3 text-sm text-muted-foreground">Tidak dapat memuat saran. Tekan Enter untuk mencari.</p>
                    )}

                    {isEmpty && <p className="px-4 py-3 text-sm text-muted-foreground">Tidak ada hasil untuk “{debouncedTerm}”.</p>}

                    {results !== null && !isEmpty && (
                        <div className="max-h-96 overflow-y-auto py-2">
                            {results.researches.length > 0 && (
                                <div className="px-2">
                                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Riset</p>

                                    {results.researches.map((research) => (
                                        <Link
                                            key={research.id}
                                            href={`/research/${research.id}`}
                                            onClick={() => setOpen(false)}
                                            className="flex flex-col gap-0.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                                        >
                                            <span className="line-clamp-1 text-sm font-medium">{research.title}</span>
                                            <span className="line-clamp-1 text-xs text-muted-foreground">oleh {research.researcherName}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {results.respondents.length > 0 && (
                                <div className="px-2">
                                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">Responden</p>

                                    {results.respondents.map((respondent) => (
                                        <Link
                                            key={respondent.id}
                                            href={`${SEARCH_PATH}?q=${encodeURIComponent(respondent.name)}`}
                                            onClick={() => setOpen(false)}
                                            className="flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                                        >
                                            <Avatar className="size-6">
                                                <AvatarImage src={respondent.image ?? undefined} alt={respondent.name} />
                                                <AvatarFallback>{respondent.name.trim().charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="line-clamp-1 text-sm">{respondent.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={goToSearch}
                        className="w-full border-t px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted"
                    >
                        Lihat semua hasil untuk “{term}”
                    </button>
                </div>
            )}
        </div>
    )
}
