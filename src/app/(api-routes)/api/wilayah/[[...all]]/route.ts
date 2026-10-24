import type { NextRequest } from "next/server"
import { z } from "zod"
import { exceptionResponse, handleRouteError, parseBody, successResponse } from "@/lib/server/api"
import { listWilayahProvincesService, listWilayahRegenciesService } from "@/service/wilayah"

/**
 * The domicile vocabulary the profile form and the research editor read.
 *
 * Public on purpose — provinces and regencies are not account data, and the sign-up/profile
 * screens are the reason a client may need them before it has a session. Like the app's other
 * endpoints it answers its own `404` for an unknown sub-path rather than redirecting.
 */

/* ========== Validasi ========== */

/** The regency list is scoped to one province, passed by its canonical name. */
const regenciesQuerySchema = z.object({
    province: z.string().trim().min(1, "Province is required").max(100, "Province is too long"),
})

/* ========== Helper ========== */

const PROVINCES_PATH = "provinces"
const REGENCIES_PATH = "regencies"

function notFound() {
    return exceptionResponse({ message: "Not Found", statusCode: 404 })
}

/* ========== Handler ========== */

/** list the provinces a domicile may be set to */
async function listProvincesHandler(_req: NextRequest) {
    try {
        const provinces = await listWilayahProvincesService()

        return successResponse({ message: "Provinces", data: { provinces } })
    } catch (error) {
        return handleRouteError(error)
    }
}

/** list the regencies of one province */
async function listRegenciesHandler(req: NextRequest) {
    try {
        const { province } = parseBody(regenciesQuerySchema, Object.fromEntries(req.nextUrl.searchParams))
        const regencies = await listWilayahRegenciesService({ province })

        return successResponse({ message: "Regencies", data: { regencies } })
    } catch (error) {
        return handleRouteError(error)
    }
}

export async function GET(req: NextRequest) {
    const pathname = req.nextUrl.pathname.replace(/^\/api\/wilayah\/?/, "")

    switch (pathname) {
        case PROVINCES_PATH:
            return listProvincesHandler(req)
        case REGENCIES_PATH:
            return listRegenciesHandler(req)
        default:
            return notFound()
    }
}
