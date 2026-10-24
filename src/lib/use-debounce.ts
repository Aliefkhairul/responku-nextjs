"use client"

import { useEffect, useState } from "react"

/**
 * Returns `value` only after it has stopped changing for `delay` milliseconds.
 *
 * Used by the search box so a request is sent once the typing pauses, rather than on every
 * keystroke. The timer is cleared on each change, so only the last value in a burst survives.
 */
export function useDebounce<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay)

        return () => clearTimeout(timer)
    }, [value, delay])

    return debounced
}
