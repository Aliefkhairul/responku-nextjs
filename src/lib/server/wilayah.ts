import { env } from "@/env"
import { INDONESIA_PROVINCES } from "@/lib/indonesia-provinces"

/**
 * The Indonesian domicile ("wilayah") client.
 *
 * The domicile vocabularies the profile and the research editor offer have to agree, and a
 * hand-maintained list of every regency would drift. So provinces and regencies are read from
 * a public region API instead, and normalized here so a value chosen in the UI matches what the
 * profile and the screening rules store.
 *
 * Two decisions shape this module:
 *
 * 1. **Names are canonical, not upstream.** The upstream dataset spells provinces in capitals
 *    ("DKI JAKARTA"), while the app stores them as the names in `INDONESIA_PROVINCES`
 *    ("DKI Jakarta"). Every province is mapped back to that vocabulary, and any upstream entry
 *    that does not map is dropped — a value the profile cannot be screened against is not worth
 *    offering.
 * 2. **The list is complete even when upstream is not.** The dataset lags behind the newest
 *    province splits, so the provinces it does not carry are appended from the local list.
 *
 * A failed fetch never throws past the callers in `@/service/wilayah`: provinces fall back to
 * the local list and regencies come back empty, which the UI reads as "type it yourself".
 */

export type WilayahOption = {
    id: string
    name: string
}

/* ========== Konfigurasi ========== */

/** The upstream dataset, e.g. `https://www.emsifa.com/api-wilayah-indonesia/api`. */
const BASE_URL = env.WILAYAH_API_BASE_URL

/** A slow upstream must not hold a request open; the UI falls back instead. */
const REQUEST_TIMEOUT_MS = 5_000

/**
 * How long a fetched list may be reused. Provinces and regencies change a few times a decade,
 * so a day is generous and keeps the upstream from being hit on every profile visit.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/* ========== Tipe upstream ========== */

type ApiProvince = { id: string; name: string }
type ApiRegency = { id: string; province_id?: string; name: string }

/* ========== Normalisasi ========== */

/** Canonical province name for an upstream name, case-insensitively; `null` when unknown. */
const CANONICAL_PROVINCE_BY_UPPER = new Map(INDONESIA_PROVINCES.map((name) => [name.toUpperCase(), name]))

function canonicalProvinceName(apiName: string): string | null {
    return CANONICAL_PROVINCE_BY_UPPER.get(apiName.trim().toUpperCase()) ?? null
}

/** `"KABUPATEN SIMEULUE"` → `"Kabupaten Simeulue"`, `"KOTA BANDUNG"` → `"Kota Bandung"`. */
function toTitleCase(value: string): string {
    return value
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 0)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
}

/* ========== HTTP ========== */

async function getJson<T>(path: string): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            headers: { accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
        })

        if (!response.ok) throw new Error(`wilayah upstream responded ${response.status}`)

        return (await response.json()) as T
    } finally {
        clearTimeout(timeout)
    }
}

/* ========== Cache ========== */

type CacheEntry<T> = { at: number; value: T }

let provinceCache: CacheEntry<WilayahOption[]> | null = null
const regencyCache = new Map<string, CacheEntry<WilayahOption[]>>()

function fresh<T>(entry: CacheEntry<T> | null): T | null {
    if (entry === null) return null

    return Date.now() - entry.at < CACHE_TTL_MS ? entry.value : null
}

/* ========== Provinsi ========== */

/**
 * The provinces the profile and the editor offer.
 *
 * Read from upstream and mapped back onto the canonical vocabulary, then completed with the
 * provinces upstream has not caught up with. When upstream is unreachable the local list is
 * returned as-is, so the profile form still works offline.
 */
export async function fetchWilayahProvinces(): Promise<WilayahOption[]> {
    const cached = fresh(provinceCache)
    if (cached !== null) return cached

    try {
        const upstream = await getJson<ApiProvince[]>("/provinces.json")
        const options: WilayahOption[] = []
        const seen = new Set<string>()

        for (const province of upstream) {
            const name = canonicalProvinceName(province.name)

            if (name === null || seen.has(name)) continue

            seen.add(name)
            options.push({ id: province.id, name })
        }

        // The dataset predates the newest splits (Papua Selatan and friends); keep offering them.
        for (const name of INDONESIA_PROVINCES) {
            if (seen.has(name)) continue

            seen.add(name)
            options.push({ id: name, name })
        }

        provinceCache = { at: Date.now(), value: options }
        return options
    } catch {
        // Not cached: a transient outage must not pin this answer for a day.
        return INDONESIA_PROVINCES.map((name) => ({ id: name, name }))
    }
}

/* ========== Kota / Kabupaten ========== */

/**
 * The regencies (kota/kabupaten) of `province`, named as in the upstream dataset.
 *
 * An unknown province, or one that only exists locally (a new split upstream cannot serve),
 * comes back empty. Unlike provinces this is cached only on success, so a failed run is retried
 * on the next request rather than remembered as "no regencies".
 */
export async function fetchWilayahRegencies(province: string): Promise<WilayahOption[]> {
    const cached = fresh(regencyCache.get(province) ?? null)
    if (cached !== null) return cached

    const provinces = await fetchWilayahProvinces()
    const match = provinces.find((option) => option.name === province)

    if (match === undefined) return []
    // A locally appended province carries its name as its id; upstream has nothing for it.
    if (!/^\d+$/.test(match.id)) return []

    const upstream = await getJson<ApiRegency[]>(`/regencies/${match.id}.json`)
    const options = upstream.map((regency) => ({ id: regency.id, name: toTitleCase(regency.name) })).filter((option) => option.name.length > 0)

    regencyCache.set(province, { at: Date.now(), value: options })
    return options
}
