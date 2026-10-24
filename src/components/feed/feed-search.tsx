"use client"

import { Search } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"

/** Where a submitted search lands. */
const SEARCH_PATH = "/search"

/**
 * The search box shared by the feed and search headers.
 *
 * Typing does not filter anything in place: submitting the form — Enter, or the browser's own
 * search affordance — sends the visitor to `/search?q=`, where the results live. The term is
 * kept in the URL rather than in component state, so a search can be shared as a link and the
 * back button works.
 */
export default function FeedSearch() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [value, setValue] = useState(searchParams.get("q") ?? "")

    // Keep the box in step with the URL when it changes from elsewhere (e.g. the back button).
    useEffect(() => {
        setValue(searchParams.get("q") ?? "")
    }, [searchParams])

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const params = new URLSearchParams()
        if (value.trim() !== "") params.set("q", value)

        const query = params.toString()
        router.push(query === "" ? SEARCH_PATH : `${SEARCH_PATH}?${query}`)
    }

    return (
        <form onSubmit={submit} role="search" className="relative w-36 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
                type="search"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Cari riset…"
                aria-label="Cari riset"
                className="rounded-full pl-9"
            />
        </form>
    )
}
