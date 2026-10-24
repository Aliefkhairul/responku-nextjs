import { fetchWilayahProvinces, fetchWilayahRegencies, type WilayahOption } from "@/lib/server/wilayah"

/**
 * Domicile lookups, as the API and the UI use them.
 *
 * Each function answers with a plain list; a failure upstream is turned into an empty list
 * rather than an error, so the client can fall back to a free-text field instead of the whole
 * profile form breaking because a third-party region API is down.
 */

/** The provinces a domicile may be set to. Falls back to the built-in list when upstream is down. */
export async function listWilayahProvincesService(): Promise<WilayahOption[]> {
    return fetchWilayahProvinces()
}

/**
 * The regencies of one province, by its canonical name.
 *
 * An unknown province, or a province upstream cannot serve, answers with an empty list.
 */
export async function listWilayahRegenciesService({ province }: { province: string }): Promise<WilayahOption[]> {
    try {
        return await fetchWilayahRegencies(province)
    } catch {
        return []
    }
}
