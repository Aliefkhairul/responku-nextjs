import type { Prisma } from "@/prisma/generated/prisma/client"
import { ResearchStatus } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"

/* ========== Konstanta ========== */

/** How many rows of each kind a page returns when the caller does not say. */
export const SEARCH_DEFAULT_LIMIT = 10

/** The most rows of each kind one page may ask for. */
export const SEARCH_MAX_LIMIT = 100

/** The shortest term the endpoint accepts, after trimming. */
export const SEARCH_MIN_QUERY_LENGTH = 2

/* ========== Select ========== */

/** What a research suggestion carries: enough for a card, no more. */
const SEARCH_RESEARCH_SELECT = {
    id: true,
    title: true,
    description: true,
    category: true,
    researcher: { select: { name: true } },
} satisfies Prisma.ResearchSelect

/** What a respondent suggestion carries: a name and a face. */
const SEARCH_RESPONDENT_SELECT = {
    id: true,
    name: true,
    image: true,
} satisfies Prisma.UserSelect

type SearchResearchRow = Prisma.ResearchGetPayload<{ select: typeof SEARCH_RESEARCH_SELECT }>
type SearchRespondentRow = Prisma.UserGetPayload<{ select: typeof SEARCH_RESPONDENT_SELECT }>

/* ========== Mapper ========== */

function toResearchSuggestion(research: SearchResearchRow) {
    return {
        id: research.id,
        title: research.title,
        description: research.description,
        category: research.category,
        researcherName: research.researcher.name,
    }
}

function toRespondentSuggestion(respondent: SearchRespondentRow) {
    return {
        id: respondent.id,
        name: respondent.name,
        image: respondent.image,
    }
}

/* ========== Service ========== */

/**
 * Searches published research and respondents by a keyword.
 *
 * The match is a partial, case-insensitive `LIKE` (`contains`), which is case-insensitive
 * because the MySQL columns use a `_ci` collation — no `mode: "insensitive"` is needed, and
 * MySQL does not support it anyway. The term is trimmed by the route before it reaches here.
 *
 * Both lists are read with `skip`/`take`, so a page never pulls the whole table, and a
 * matching `count` gives the caller the total without fetching the rows. The two reads and
 * their counts run together.
 *
 * Ordering is a stable, deterministic one rather than a relevance score: ranking by how well
 * a row matches would need full-text search, which this project deliberately does not carry.
 * Research is newest-first (the same order the feed uses); respondents are alphabetical.
 */
export async function searchService({ q, page, limit }: { q: string; page: number; limit: number }) {
    const skip = (page - 1) * limit

    const researchWhere: Prisma.ResearchWhereInput = {
        deletedAt: null,
        status: ResearchStatus.PUBLISHED,
        OR: [{ title: { contains: q } }, { description: { contains: q } }],
    }

    const respondentWhere: Prisma.UserWhereInput = {
        deletedAt: null,
        // Only accounts that actually hold the respondent role, so the list is respondents
        // rather than every account whose name happens to match.
        roles: { array_contains: "respondent" },
        name: { contains: q },
    }

    const [researches, respondents, researchTotal, respondentTotal] = await Promise.all([
        prisma.research.findMany({
            where: researchWhere,
            orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
            skip,
            take: limit,
            select: SEARCH_RESEARCH_SELECT,
        }),
        prisma.user.findMany({
            where: respondentWhere,
            orderBy: [{ name: "asc" }, { id: "asc" }],
            skip,
            take: limit,
            select: SEARCH_RESPONDENT_SELECT,
        }),
        prisma.research.count({ where: researchWhere }),
        prisma.user.count({ where: respondentWhere }),
    ])

    return {
        q,
        page,
        limit,
        researches: researches.map(toResearchSuggestion),
        respondents: respondents.map(toRespondentSuggestion),
        totals: { researches: researchTotal, respondents: respondentTotal },
    }
}
