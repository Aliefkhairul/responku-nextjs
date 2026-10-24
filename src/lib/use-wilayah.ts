"use client"

import { useEffect, useState } from "react"
import { getJson } from "@/lib/api-client"
import type { WilayahOption } from "@/lib/api-types"

/**
 * Domicile lists for the profile form.
 *
 * The lists come from this app's own `/api/wilayah` endpoints, which keep the third-party region
 * API off the client and normalize the names. Each hook reports whether it is still loading and
 * whether it failed, so the field can fall back to free text instead of silently offering
 * nothing to pick from.
 */

export type WilayahState = {
    options: WilayahOption[]
    /** A request is in flight. */
    loading: boolean
    /**
     * No usable list: the request failed or came back empty. The field reads this as "type it
     * yourself" rather than showing an empty dropdown.
     */
    failed: boolean
}

/** A settled state carrying `options`. */
function ready(options: WilayahOption[]): WilayahState {
    return { options, loading: false, failed: options.length === 0 }
}

/** The provinces a domicile may be set to. Fetched once per mount. */
export function useWilayahProvinces(): WilayahState {
    const [state, setState] = useState<WilayahState>({ options: [], loading: true, failed: false })

    useEffect(() => {
        let cancelled = false

        void getJson<{ provinces: WilayahOption[] }>("/api/wilayah/provinces").then((result) => {
            if (cancelled) return

            setState(result.ok && result.data ? ready(result.data.provinces) : { options: [], loading: false, failed: true })
        })

        return () => {
            cancelled = true
        }
    }, [])

    return state
}

/** The regencies of `province`. Refetched whenever the province changes; empty when none is chosen. */
export function useWilayahRegencies(province: string): WilayahState {
    const [state, setState] = useState<WilayahState>({ options: [], loading: province.length > 0, failed: false })

    useEffect(() => {
        if (province.length === 0) {
            setState({ options: [], loading: false, failed: false })
            return
        }

        let cancelled = false
        setState({ options: [], loading: true, failed: false })

        void getJson<{ regencies: WilayahOption[] }>(`/api/wilayah/regencies?province=${encodeURIComponent(province)}`).then((result) => {
            if (cancelled) return

            setState(result.ok && result.data ? ready(result.data.regencies) : { options: [], loading: false, failed: true })
        })

        return () => {
            cancelled = true
        }
    }, [province])

    return state
}
