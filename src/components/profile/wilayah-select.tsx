"use client"

import { Loader2 } from "lucide-react"
import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WilayahOption } from "@/lib/api-types"
import type { WilayahState } from "@/lib/use-wilayah"

/**
 * A domicile field backed by the region API, with a free-text fallback.
 *
 * The list can be unavailable for reasons the user cannot fix — the region API is down, or the
 * account carries a domicile the current list no longer holds. Rather than show an empty
 * dropdown, this drops back to a plain input, so the profile always stays editable. A stored
 * value that is not in the list is kept as an option too, so opening the form never silently
 * blanks a domicile that was already saved.
 */
export default function WilayahSelect({
    id,
    name,
    value,
    onValueChange,
    onBlur,
    state,
    placeholder,
    loadingLabel,
    fallbackPlaceholder,
    invalid,
    disabled,
}: {
    id: string
    name: string
    value: string
    onValueChange: (value: string) => void
    onBlur?: () => void
    state: WilayahState
    placeholder: string
    /** Shown while the list is still loading. */
    loadingLabel: string
    fallbackPlaceholder: string
    invalid?: boolean
    /** Blocks the control before the list it depends on has been chosen, e.g. no province yet. */
    disabled?: boolean
}) {
    const options = useMemo<WilayahOption[]>(() => {
        if (value.length === 0 || state.options.some((option) => option.name === value)) return state.options

        // Keep the stored value selectable so it renders as itself rather than as a blank trigger.
        return [{ id: `current:${value}`, name: value }, ...state.options]
    }, [state.options, value])

    if (state.failed) {
        return (
            <Input
                id={id}
                name={name}
                value={value}
                onBlur={onBlur}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder={fallbackPlaceholder}
                aria-invalid={invalid}
            />
        )
    }

    return (
        <Select value={value} onValueChange={(next) => onValueChange(next ?? "")} disabled={disabled || state.loading}>
            <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
                <SelectValue placeholder={state.loading ? loadingLabel : placeholder} />
                {state.loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </SelectTrigger>

            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.id} value={option.name}>
                        {option.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
