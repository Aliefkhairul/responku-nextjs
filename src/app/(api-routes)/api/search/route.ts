import type { NextRequest } from "next/server"
import { z } from "zod"
import { HttpException } from "@/lib/server/http-exception"
import { handleRouteError, successResponse } from "@/lib/server/api"
import { SEARCH_DEFAULT_LIMIT, SEARCH_MAX_LIMIT, SEARCH_MIN_QUERY_LENGTH, searchService } from "@/service/search"

/* ========== Validasi ========== */

/**
 * The search query string.
 *
 * `q` is trimmed first, so a term that is only spaces counts as empty, and must then be at
 * least two characters — a one-letter term matches almost everything and is not worth a
 * round trip. `page` and `limit` are coerced from their string form, defaulted, and capped.
 */
const searchQuerySchema = z.object({
    q: z.string({ error: "Kata kunci wajib diisi" }).trim().min(SEARCH_MIN_QUERY_LENGTH, `Kata kunci minimal ${SEARCH_MIN_QUERY_LENGTH} karakter`),
    page: z.coerce.number().int("Halaman harus bilangan bulat").min(1, "Halaman minimal 1").default(1),
    limit: z.coerce
        .number()
        .int("Limit harus bilangan bulat")
        .min(1, "Limit minimal 1")
        .max(SEARCH_MAX_LIMIT, `Limit maksimal ${SEARCH_MAX_LIMIT}`)
        .default(SEARCH_DEFAULT_LIMIT),
})

/**
 * Validates the query string, answering `400` on a bad one.
 *
 * This endpoint reports a bad query as `400` rather than the `422` the body-parsing helper
 * uses, because a malformed search is a bad request in the plain HTTP sense. The envelope and
 * the field-level `errors` are the same shape every other endpoint returns.
 */
function parseSearchQuery(searchParams: URLSearchParams) {
    const result = searchQuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!result.success) {
        const errors = Object.fromEntries(result.error.issues.map((issue) => [issue.path.join(".") || "_root", issue.message]))
        throw new HttpException(400, { message: result.error.issues[0]?.message ?? "Invalid search query", errors })
    }

    return result.data
}

/* ========== Handler ========== */

/**
 * Searches published research and respondents.
 *
 * Public on purpose — the search page is open to signed-out visitors, and the pool it reads
 * (published research, account names) is already visible elsewhere.
 */
export async function GET(req: NextRequest) {
    // Reading the URL is a dynamic access. Doing it before the try/catch lets Next.js's
    // prerender bailout propagate instead of being swallowed as a 500 — the same reason the
    // other routes read `req.nextUrl.pathname` up front.
    const searchParams = req.nextUrl.searchParams

    try {
        const query = parseSearchQuery(searchParams)
        const result = await searchService(query)

        return successResponse({ message: "Search results", data: result })
    } catch (error) {
        return handleRouteError(error)
    }
}
