import { BadRequestException } from "@/lib/server/http-exception"
import type { UserProfileModel } from "@/prisma/generated/prisma/models/UserProfile"
import { prisma } from "@/prisma/prisma"

/* ========== Kosakata domain ========== */

/** Values the profile UI offers, kept here so request and stored data agree. */
export const GENDERS = ["male", "female"] as const
export const EDUCATIONS = ["high_school", "diploma", "bachelor", "master", "doctorate"] as const
export const RELIGIONS = ["islam", "protestant", "catholic", "hindu", "buddhist", "confucian"] as const

export type Gender = (typeof GENDERS)[number]
export type Education = (typeof EDUCATIONS)[number]
export type Religion = (typeof RELIGIONS)[number]

/* ========== Tipe ========== */

export type UpdateUserProfileInput = {
    userId: string
    gender?: Gender | null
    education?: Education | null
    province?: string | null
    city?: string | null
    latitude?: number | null
    longitude?: number | null
    occupation?: string | null
    religion?: Religion | null
    religionConsent?: boolean
}

type ReligionStateInput = {
    currentReligion: string | null
    currentConsentAt: Date | null
    religion: Religion | null | undefined
    religionConsent: boolean | undefined
}

/* ========== Helper ========== */

/**
 * Resolves the `religion` / `religionConsentAt` pair for a patch.
 *
 * Religion is sensitive data under UU PDP No. 27/2022, so it may only be stored
 * while explicit consent is on record. That gives three cases:
 *
 * - consent withdrawn: the stored religion is cleared along with the consent,
 *   because the data can no longer be processed;
 * - consent granted: the timestamp is only stamped the first time, so repeat
 *   saves do not rewrite the consent audit trail;
 * - otherwise: a religion that would end up without consent is refused.
 */
function resolveReligionState({ currentReligion, currentConsentAt, religion, religionConsent }: ReligionStateInput) {
    if (religionConsent === false) {
        if (religion !== null && religion !== undefined) {
            throw new BadRequestException("Religion cannot be stored without consent", {
                religionConsent: "Clear the religion in the same request when withdrawing consent.",
            })
        }

        return { religion: null, religionConsentAt: null }
    }

    const religionConsentAt = religionConsent === true ? (currentConsentAt ?? new Date()) : currentConsentAt
    const nextReligion = religion === undefined ? currentReligion : religion

    if (nextReligion !== null && religionConsentAt === null) {
        throw new BadRequestException("Consent is required to store religion data", {
            religionConsent: "Explicit consent is required to process religion data.",
        })
    }

    return { religion: nextReligion, religionConsentAt }
}

/**
 * Maps the stored profile onto the vocabulary the client uses, so request and
 * response speak the same field names.
 */
function toUserProfileResponse(profile: UserProfileModel) {
    return {
        gender: profile.gender,
        education: profile.education,
        province: profile.domicileProvince,
        city: profile.domicileCity,
        latitude: profile.domicileLat === null ? null : Number(profile.domicileLat),
        longitude: profile.domicileLng === null ? null : Number(profile.domicileLng),
        occupation: profile.occupation,
        religion: profile.religion,
        religionConsent: profile.religionConsentAt !== null,
        religionConsentAt: profile.religionConsentAt,
        domicileVerified: profile.domicileVerifiedAt !== null,
        domicileVerifiedAt: profile.domicileVerifiedAt,
        updatedAt: profile.updatedAt,
    }
}

/* ========== Update profile ========== */

/**
 * Creates or updates the profile of `userId` with PATCH semantics: a field that
 * is absent is left untouched, while an explicit `null` clears it.
 *
 * Registration does not create a profile, so the first write inserts the row.
 * `domicileVerifiedAt` is deliberately not writable here: clients cannot declare
 * their own domicile verification.
 */
export async function updateUserProfileService({
    userId,
    gender,
    education,
    province,
    city,
    latitude,
    longitude,
    occupation,
    religion,
    religionConsent,
}: UpdateUserProfileInput) {
    const current = await prisma.userProfile.findUnique({
        where: { userId },
        select: { religion: true, religionConsentAt: true },
    })

    const religionState = resolveReligionState({
        currentReligion: current?.religion ?? null,
        currentConsentAt: current?.religionConsentAt ?? null,
        religion,
        religionConsent,
    })

    const profile = await prisma.userProfile.upsert({
        where: { userId },
        create: {
            userId,
            gender,
            education,
            domicileProvince: province,
            domicileCity: city,
            domicileLat: latitude,
            domicileLng: longitude,
            occupation,
            ...religionState,
        },
        update: {
            gender,
            education,
            domicileProvince: province,
            domicileCity: city,
            domicileLat: latitude,
            domicileLng: longitude,
            occupation,
            ...religionState,
        },
    })

    return toUserProfileResponse(profile)
}
