import { RELIGIONS, type Education, type Gender, type Religion } from "@/lib/profile-vocabulary"
import type { ResearchCategory } from "@/lib/research-category"
import type { Role } from "@/lib/roles"
import { hashPassword } from "@/lib/server/crypto"
import { QuestionType, TokenTransactionType } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"
import {
    createResearchDraftService,
    publishResearchService,
    type ResearchCriterionInput,
    type ResearchQuestionInput,
    replaceResearchQuestionsService,
    updateResearchService,
} from "@/service/research"
import { updateUserProfileService } from "@/service/user"

/**
 * LOCAL DEVELOPMENT ONLY — seeds sixteen researchers, an admin, thirty respondents, and twenty
 * published researches, each with its own questionnaire.
 *
 *   bun run src/prisma/seed.ts
 *
 * The accounts cover the three sides of the app and read like real people rather than fixtures:
 *
 *   1. Researchers        — role `researcher`; each owns one or two of the seeded researches
 *   2. The admin          — role `admin`, can open `/admin`
 *   3. Respondents        — role `respondent`, spread across the criteria, so all of them can
 *                           take the seeded researches
 *
 * They all share the password below and are marked verified, so they can be signed into
 * without going through the OTP flow. Each also carries a filled-in demographic profile, so
 * the researches' screening criteria can actually be decided against it.
 *
 * Idempotent: re-running it resets the accounts and their profiles, credits a wallet once,
 * and leaves a research alone once it exists. The researches are built through the real
 * services, so their token reservations and ledger rows are written exactly the way the app
 * writes them.
 */

/* ========== Konstanta ========== */

/** Shared by every seeded account. Development only — never use this anywhere real. */
const SEED_PASSWORD = "password123"

/** Provider id used for email + password accounts, mirroring `registerService`. */
const CREDENTIALS_PROVIDER_ID = "credentials"

/** Enough to cover every seeded research's reservation with room to spare. */
const RESEARCHER_TOKENS = 5_000

const SEED_RESEARCH_TITLE = "Survei Kebiasaan Transaksi Nontunai & Dompet Digital 2026"

const SEED_RESEARCH_DESCRIPTION =
    "Riset ini memetakan kebiasaan transaksi nontunai dan preferensi dompet digital di Indonesia: " +
    "aplikasi yang dipakai, frekuensi transaksi, fitur yang menentukan pilihan, serta kendala yang " +
    "dihadapi pengguna. Jawaban Anda dipakai untuk menyusun rekomendasi produk, bukan untuk pemasaran."

/** Likert scale the editor uses for `SCALE` questions, so the seed matches what it writes. */
const LIKERT_LABELS = ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"]

/** Turns a list of choice texts into the `{ pos, n, choiceText }` shape the API stores. */
function choices(texts: string[]) {
    return texts.map((choiceText, index) => ({
        pos: index + 1,
        n: String.fromCharCode(97 + index),
        choiceText,
    }))
}

/* ========== Pembangun pertanyaan ========== */

/** One question without its position — the position is assigned by `questionnaire`. */
type SeedQuestion = Omit<ResearchQuestionInput, "pos">

/** Numbers the questions in order, so a definition reads top to bottom without juggling `pos`. */
function questionnaire(...questions: SeedQuestion[]): ResearchQuestionInput[] {
    return questions.map((question, index) => ({ ...question, pos: index + 1 }))
}

const scale = (question: string): SeedQuestion => ({ question, questionType: QuestionType.SCALE, choices: choices(LIKERT_LABELS) })
const single = (question: string, options: string[]): SeedQuestion => ({
    question,
    questionType: QuestionType.SINGLE_CHOICE,
    choices: choices(options),
})
const multi = (question: string, options: string[]): SeedQuestion => ({
    question,
    questionType: QuestionType.MULTIPLE_CHOICE,
    choices: choices(options),
})
const open = (question: string): SeedQuestion => ({ question, questionType: QuestionType.TEXT })

/* ========== Akun ========== */

/**
 * The demographics a seeded account carries.
 *
 * Every column the profile marks NOT NULL is here, because the first write has to be
 * complete. `religion` is stored with explicit consent, which is the only way the profile
 * accepts it.
 */
type SeedProfile = {
    gender: Gender
    education: Education
    province: string
    city: string
    latitude: number
    longitude: number
    occupation: string
    phoneNumber: string
    religion: Religion
}

type SeedAccount = {
    name: string
    email: string
    roles: Role[]
    /** Tokens the wallet is credited with, once, on the run that creates it. */
    tokens: number
    profile: SeedProfile
}

/** One person, before the generated fields around them are filled in. */
type SeedPerson = {
    name: string
    email: string
}

/**
 * Where the sixteen seeded researchers are based, spread well beyond the researches' own
 * criteria so the researcher list is not all one city.
 */
const RESEARCHER_PLACES = [
    { province: "DKI Jakarta", city: "Jakarta Selatan", latitude: -6.2615, longitude: 106.8106 },
    { province: "DKI Jakarta", city: "Jakarta Pusat", latitude: -6.1805, longitude: 106.8284 },
    { province: "Jawa Barat", city: "Bandung", latitude: -6.9175, longitude: 107.6191 },
    { province: "DI Yogyakarta", city: "Yogyakarta", latitude: -7.7956, longitude: 110.3695 },
    { province: "Jawa Tengah", city: "Semarang", latitude: -6.9932, longitude: 110.4203 },
    { province: "Jawa Timur", city: "Surabaya", latitude: -7.2575, longitude: 112.7521 },
    { province: "Banten", city: "Tangerang", latitude: -6.1783, longitude: 106.6319 },
    { province: "Bali", city: "Denpasar", latitude: -8.6705, longitude: 115.2126 },
    { province: "Sumatera Utara", city: "Medan", latitude: 3.5952, longitude: 98.6722 },
    { province: "Sulawesi Selatan", city: "Makassar", latitude: -5.1477, longitude: 119.4327 },
    { province: "Aceh", city: "Banda Aceh", latitude: 5.5483, longitude: 95.3238 },
    { province: "Riau", city: "Pekanbaru", latitude: 0.5071, longitude: 101.4478 },
    { province: "Kalimantan Timur", city: "Balikpapan", latitude: -1.2379, longitude: 116.8529 },
    { province: "Nusa Tenggara Barat", city: "Mataram", latitude: -8.5833, longitude: 116.1167 },
    { province: "Papua", city: "Jayapura", latitude: -2.5916, longitude: 140.669 },
    { province: "Kalimantan Tengah", city: "Palangka Raya", latitude: -2.208, longitude: 113.916 },
]

/** The sixteen researchers, one per place above. */
const RESEARCHER_PEOPLE: SeedPerson[] = [
    { name: "Anindya Prasetyo", email: "anindya.prasetyo@example.com" },
    { name: "Budi Hartono", email: "budi.hartono@example.com" },
    { name: "Citra Maharani", email: "citra.maharani@example.com" },
    { name: "Dewi Lestari", email: "dewi.lestari@example.com" },
    { name: "Eko Nugroho", email: "eko.nugroho@example.com" },
    { name: "Fajar Ramadhan", email: "fajar.ramadhan@example.com" },
    { name: "Gita Puspita", email: "gita.puspita@example.com" },
    { name: "Hendra Wijaya", email: "hendra.wijaya@example.com" },
    { name: "Indah Permata Sari", email: "indah.permata@example.com" },
    { name: "Joko Susilo", email: "joko.susilo@example.com" },
    { name: "Kartika Dewi", email: "kartika.dewi@example.com" },
    { name: "Lukman Hakim", email: "lukman.hakim@example.com" },
    { name: "Maya Anggraini", email: "maya.anggraini@example.com" },
    { name: "Nurul Hidayah", email: "nurul.hidayah@example.com" },
    { name: "Rizky Pratama", email: "rizky.pratama@example.com" },
    { name: "Siti Rahmawati", email: "siti.rahmawati@example.com" },
]

const RESEARCHER_OCCUPATIONS = [
    "Peneliti Pasar",
    "Dosen",
    "Analis Riset",
    "Konsultan Riset",
    "Data Scientist",
    "Manajer Produk",
    "Peneliti Senior",
    "Statistisi",
    "Sosiolog",
    "Akademisi",
    "Ekonom",
    "Psikolog",
    "Antropolog",
    "Jurnalis Data",
    "Guru Besar",
    "Perencana Wilayah",
]

/** The three education levels the seeded research screens for, used by every seeded profile. */
const SEED_EDUCATIONS: Education[] = ["bachelor", "master", "doctorate"]

/** Sixteen researchers, each its own account and place. */
const RESEARCHERS: SeedAccount[] = RESEARCHER_PEOPLE.map((person, index) => {
    const place = RESEARCHER_PLACES[index]

    return {
        name: person.name,
        email: person.email,
        roles: ["researcher"],
        tokens: RESEARCHER_TOKENS,
        profile: {
            gender: index % 2 === 0 ? "male" : "female",
            education: SEED_EDUCATIONS[index % SEED_EDUCATIONS.length],
            province: place.province,
            city: place.city,
            latitude: place.latitude,
            longitude: place.longitude,
            occupation: RESEARCHER_OCCUPATIONS[index % RESEARCHER_OCCUPATIONS.length],
            phoneNumber: `+62 811-2000-${String(index + 1).padStart(4, "0")}`,
            religion: RELIGIONS[index % RELIGIONS.length],
        },
    }
})

const ADMIN: SeedAccount = {
    name: "Rani Cempaka Kurniasih",
    email: "rani.kurniasih@example.com",
    roles: ["researcher", "respondent", "admin"],
    tokens: 0,
    profile: {
        gender: "female",
        education: "bachelor",
        province: "DKI Jakarta",
        city: "Jakarta Pusat",
        latitude: -6.1805,
        longitude: 106.8284,
        occupation: "Manajer Operasional",
        phoneNumber: "+62 811-0000-0001",
        religion: "islam",
    },
}

/**
 * Where the thirty seeded respondents live.
 *
 * Every place is inside the seeded researches' base criteria — a province they screen for — so
 * each respondent can actually join them once signed in, instead of being turned away by
 * screening.
 */
const RESPONDENT_PLACES = [
    { province: "DKI Jakarta", city: "Jakarta Pusat", latitude: -6.1805, longitude: 106.8284 },
    { province: "DKI Jakarta", city: "Jakarta Selatan", latitude: -6.2615, longitude: 106.8106 },
    { province: "DKI Jakarta", city: "Jakarta Barat", latitude: -6.1683, longitude: 106.7588 },
    { province: "DKI Jakarta", city: "Jakarta Timur", latitude: -6.225, longitude: 106.9004 },
    { province: "DKI Jakarta", city: "Jakarta Utara", latitude: -6.1214, longitude: 106.7741 },
    { province: "DKI Jakarta", city: "Kepulauan Seribu", latitude: -5.6375, longitude: 106.5666 },
    { province: "Jawa Barat", city: "Bandung", latitude: -6.9175, longitude: 107.6191 },
    { province: "Jawa Barat", city: "Bekasi", latitude: -6.2383, longitude: 106.9756 },
    { province: "Jawa Barat", city: "Bogor", latitude: -6.5944, longitude: 106.7892 },
    { province: "Jawa Barat", city: "Depok", latitude: -6.4025, longitude: 106.7942 },
    { province: "Jawa Barat", city: "Cimahi", latitude: -6.8722, longitude: 107.5425 },
    { province: "Jawa Barat", city: "Sukabumi", latitude: -6.9277, longitude: 106.93 },
    { province: "Jawa Barat", city: "Karawang", latitude: -6.3015, longitude: 107.3063 },
    { province: "Jawa Barat", city: "Cirebon", latitude: -6.732, longitude: 108.5523 },
    { province: "Jawa Barat", city: "Tasikmalaya", latitude: -7.3274, longitude: 108.2207 },
    { province: "Jawa Barat", city: "Garut", latitude: -7.2148, longitude: 107.9027 },
    { province: "Jawa Barat", city: "Subang", latitude: -6.5716, longitude: 107.7583 },
    { province: "Jawa Barat", city: "Purwakarta", latitude: -6.5567, longitude: 107.4432 },
    { province: "Jawa Barat", city: "Indramayu", latitude: -6.3373, longitude: 108.3249 },
    { province: "Jawa Barat", city: "Sumedang", latitude: -6.8587, longitude: 107.9204 },
    { province: "Banten", city: "Tangerang", latitude: -6.1783, longitude: 106.6319 },
    { province: "Banten", city: "Tangerang Selatan", latitude: -6.2884, longitude: 106.7179 },
    { province: "Banten", city: "Serang", latitude: -6.1104, longitude: 106.1503 },
    { province: "Banten", city: "Cilegon", latitude: -6.0027, longitude: 106.0114 },
    { province: "Banten", city: "Rangkasbitung", latitude: -6.3595, longitude: 106.2493 },
    { province: "Banten", city: "Pandeglang", latitude: -6.3086, longitude: 106.1056 },
    { province: "Banten", city: "Tigaraksa", latitude: -6.3485, longitude: 106.4757 },
    { province: "Banten", city: "Baros", latitude: -6.1215, longitude: 106.1865 },
    { province: "Banten", city: "Menes", latitude: -6.3679, longitude: 105.9473 },
    { province: "Banten", city: "Anyar", latitude: -6.0459, longitude: 105.9247 },
]

/** The thirty respondents, one per place above. */
const RESPONDENT_PEOPLE: SeedPerson[] = [
    { name: "Aditya Nugraha", email: "aditya.nugraha@example.com" },
    { name: "Bella Safitri", email: "bella.safitri@example.com" },
    { name: "Chandra Wijaya", email: "chandra.wijaya@example.com" },
    { name: "Dinda Kartika", email: "dinda.kartika@example.com" },
    { name: "Eka Saputra", email: "eka.saputra@example.com" },
    { name: "Fitri Handayani", email: "fitri.handayani@example.com" },
    { name: "Galih Pambudi", email: "galih.pambudi@example.com" },
    { name: "Hana Maulida", email: "hana.maulida@example.com" },
    { name: "Irfan Setiawan", email: "irfan.setiawan@example.com" },
    { name: "Jasmine Ayu Lestari", email: "jasmine.ayu@example.com" },
    { name: "Kevin Halim", email: "kevin.halim@example.com" },
    { name: "Lestari Wulandari", email: "lestari.wulandari@example.com" },
    { name: "Mochamad Fauzi", email: "mochamad.fauzi@example.com" },
    { name: "Nadia Puspitasari", email: "nadia.puspitasari@example.com" },
    { name: "Oscar Simanjuntak", email: "oscar.simanjuntak@example.com" },
    { name: "Putri Amelia", email: "putri.amelia@example.com" },
    { name: "Qori Anwar", email: "qori.anwar@example.com" },
    { name: "Ratna Dewi", email: "ratna.dewi@example.com" },
    { name: "Sandi Kurniawan", email: "sandi.kurniawan@example.com" },
    { name: "Tiara Anjani", email: "tiara.anjani@example.com" },
    { name: "Umar Abdullah", email: "umar.abdullah@example.com" },
    { name: "Vina Rosalina", email: "vina.rosalina@example.com" },
    { name: "Wahyu Hidayat", email: "wahyu.hidayat@example.com" },
    { name: "Winda Larasati", email: "winda.larasati@example.com" },
    { name: "Yudi Firmansyah", email: "yudi.firmansyah@example.com" },
    { name: "Zahra Aulia", email: "zahra.aulia@example.com" },
    { name: "Bayu Prakoso", email: "bayu.prakoso@example.com" },
    { name: "Clarissa Wijaya", email: "clarissa.wijaya@example.com" },
    { name: "Dimas Anggara", email: "dimas.anggara@example.com" },
    { name: "Elvira Handayani", email: "elvira.handayani@example.com" },
]

const RESPONDENT_OCCUPATIONS = [
    "Desainer Grafis Lepas",
    "Karyawan Swasta",
    "Guru",
    "Analis Data",
    "Wirausaha",
    "Mahasiswa",
    "Perawat",
    "Akuntan",
    "Konsultan Pajak",
    "Pegawai Negeri",
    "Pramuniaga",
    "Teknisi Jaringan",
    "Penulis Lepas",
    "Apoteker",
    "Barista",
]

/** Thirty respondents, varied just enough that lists and filters have something to show. */
const RESPONDENTS: SeedAccount[] = RESPONDENT_PEOPLE.map((person, index) => {
    const place = RESPONDENT_PLACES[index]

    return {
        name: person.name,
        email: person.email,
        roles: ["respondent"],
        tokens: 0,
        profile: {
            gender: index % 2 === 0 ? "male" : "female",
            education: SEED_EDUCATIONS[index % SEED_EDUCATIONS.length],
            province: place.province,
            city: place.city,
            latitude: place.latitude,
            longitude: place.longitude,
            occupation: RESPONDENT_OCCUPATIONS[index % RESPONDENT_OCCUPATIONS.length],
            phoneNumber: `+62 812-3000-${String(index + 1).padStart(4, "0")}`,
            religion: RELIGIONS[index % RELIGIONS.length],
        },
    }
})

/**
 * Creates or resets one account, with the profile, credentials account, and wallet it needs
 * to sign in, be screened, and spend.
 *
 * The wallet is credited once, on the run that first seeds the account, and the ledger row
 * goes in with the credit so the wallet's history still adds up to its balance.
 */
async function seedAccount({ name, email, roles, tokens, profile }: SeedAccount) {
    const password = await hashPassword(SEED_PASSWORD)

    const user = await prisma.user.upsert({
        where: { email },
        create: { name, email, roles, verifiedAt: new Date() },
        update: { name, roles, verifiedAt: new Date(), deletedAt: null },
        select: { id: true },
    })

    // Through the service, so the religion-consent rule is applied the same way the profile
    // page applies it rather than bypassed.
    await updateUserProfileService({
        userId: user.id,
        gender: profile.gender,
        education: profile.education,
        province: profile.province,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
        occupation: profile.occupation,
        phoneNumber: profile.phoneNumber,
        religion: profile.religion,
        religionConsent: true,
    })

    await prisma.account.upsert({
        where: { providerId_accountId: { providerId: CREDENTIALS_PROVIDER_ID, accountId: email } },
        create: {
            userId: user.id,
            providerId: CREDENTIALS_PROVIDER_ID,
            accountId: email,
            password,
        },
        update: { password, deletedAt: null },
    })

    const wallet = await prisma.tokenWallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, balance: 0 },
        update: {},
        select: { id: true },
    })

    // Credited once, keyed on the account. A re-run must not hand back the tokens the
    // research already reserved — that would leave the reservation unfunded. Later top-ups
    // are `scripts/credit-wallet.ts`'s job.
    const topupKey = `seed-topup:${user.id}`
    const alreadyCredited = await prisma.tokenTransaction.findUnique({
        where: { idempotencyKey: topupKey },
        select: { id: true },
    })

    if (alreadyCredited === null && tokens > 0) {
        await prisma.tokenWallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: tokens } },
        })

        await prisma.tokenTransaction.create({
            data: {
                walletId: wallet.id,
                type: TokenTransactionType.TOPUP,
                amount: tokens,
                idempotencyKey: topupKey,
            },
        })
    }

    console.log(`  ${email}  (${roles.join(", ")})`)
    return user
}

/* ========== Riset ========== */

/**
 * Screening rules the research applies before anybody can join.
 *
 * Both fields are ones the profile actually stores, so a filled-in profile is decided
 * against them rather than coming back undecided. `province` is free text on the profile, so
 * its values have to match what a respondent typed — every seeded respondent lives in one of
 * the three provinces below. The editor also offers `age` and `region`, which nothing stores
 * yet — a rule about either would always come back undecided.
 */
const CRITERIA: ResearchCriterionInput[] = [
    { field: "education", operator: "IN", value: "bachelor,master,doctorate" },
    { field: "province", operator: "IN", value: "DKI Jakarta,Jawa Barat,Banten" },
]

/**
 * The flagship questionnaire: ten questions covering every type the respondent page can
 * render — single choice, multiple choice, Likert scale, and free text.
 *
 * `NUMBER` is left out on purpose: the API accepts it, but the respondent page has no input
 * for it yet, so a seeded one could not be answered.
 */
const QUESTIONS = questionnaire(
    single("Berapa usia Anda saat ini?", ["17–24 tahun", "25–34 tahun", "35–44 tahun", "45 tahun ke atas"]),
    single("Apa jenis kelamin Anda?", ["Laki-laki", "Perempuan"]),
    single("Apa pendidikan terakhir yang Anda selesaikan?", ["SMA/SMK", "Diploma", "Sarjana", "Magister atau lebih"]),
    multi("Aplikasi dompet digital apa saja yang Anda gunakan dalam 3 bulan terakhir?", ["GoPay", "OVO", "DANA", "ShopeePay", "Lainnya"]),
    single("Seberapa sering Anda bertransaksi nontunai dalam sehari?", ["Tidak pernah", "1–2 kali", "3–5 kali", "Lebih dari 5 kali"]),
    scale("Seberapa setuju Anda bahwa dompet digital membuat transaksi harian lebih mudah?"),
    multi("Fitur apa yang paling menentukan pilihan Anda terhadap sebuah dompet digital?", [
        "Biaya admin rendah",
        "Banyak promo dan cashback",
        "Diterima di banyak merchant",
        "Keamanan dan keandalan",
    ]),
    scale("Seberapa setuju Anda bahwa keamanan data menjadi kekhawatiran utama saat bertransaksi nontunai?"),
    open("Apa kendala utama yang Anda alami saat bertransaksi nontunai?"),
    open("Saran apa yang Anda berikan untuk meningkatkan layanan dompet digital di Indonesia?"),
)

/**
 * The one question each untreated research falls back to.
 *
 * A research cannot be published with an empty questionnaire — the publish step refuses one —
 * so this is the safety net. Every research below carries its own set, so in practice this is
 * only reached if a definition is added without questions.
 */
const MINIMAL_QUESTIONS = questionnaire(scale("Seberapa besar minat Anda pada topik riset ini?"))

/** One seeded research: its header, and everything the services need to publish it. */
type SeedResearchDefinition = {
    title: string
    description: string
    category: ResearchCategory
    /** Domicile province the research targets, by name. Omitted means everyone. */
    region?: string
    target: number
    tokens: number
    minutes: number
    /** The questionnaire; omitted falls back to the shared minimal one. */
    questions?: ResearchQuestionInput[]
}

/**
 * The twenty seeded researches.
 *
 * Each carries a questionnaire that matches its title, so the feed and the respondent flow have
 * real content to work with. The first is the flagship — ten questions covering every type the
 * respondent page can render — and keeps the title it was first seeded under, so an existing
 * copy is reused instead of a second one being created.
 */
const SEED_RESEARCHES: SeedResearchDefinition[] = [
    {
        title: SEED_RESEARCH_TITLE,
        description: SEED_RESEARCH_DESCRIPTION,
        category: "ECONOMICS_FINANCE",
        target: 20,
        tokens: 2,
        minutes: 8,
        questions: QUESTIONS,
    },
    {
        title: "Preferensi Belanja Online di Marketplace 2026",
        description: "Perilaku belanja daring: alasan memilih marketplace, metode pembayaran, dan pengalaman pengiriman.",
        category: "MARKETING_ADVERTISING",
        region: "DKI Jakarta",
        target: 25,
        tokens: 2,
        minutes: 5,
        questions: questionnaire(
            single("Seberapa sering Anda berbelanja daring dalam sebulan terakhir?", ["Tidak pernah", "1–2 kali", "3–5 kali", "Lebih dari 5 kali"]),
            multi("Marketplace apa saja yang Anda gunakan dalam 3 bulan terakhir?", [
                "Shopee",
                "Tokopedia",
                "Lazada",
                "TikTok Shop",
                "Blibli",
                "Lainnya",
            ]),
            multi("Apa yang paling menentukan pilihan marketplace Anda?", [
                "Harga lebih murah",
                "Gratis ongkir",
                "Kelengkapan produk",
                "Kecepatan pengiriman",
                "Kemudahan pengembalian",
            ]),
            single("Metode pembayaran apa yang paling sering Anda pakai?", ["Transfer bank", "COD", "E-wallet", "Kartu kredit/debit", "Paylater"]),
            scale("Seberapa puas Anda dengan pengalaman pengiriman yang Anda terima?"),
            open("Ceritakan pengalaman belanja daring terbaik atau terburuk Anda baru-baru ini."),
        ),
    },
    {
        title: "Efektivitas Pembelajaran Daring di Perguruan Tinggi",
        description: "Pengalaman mahasiswa dengan kelas daring: kualitas materi, interaksi, dan kendala teknis.",
        category: "EDUCATION_PEDAGOGY",
        region: "Jawa Tengah",
        target: 30,
        tokens: 2,
        minutes: 6,
        questions: questionnaire(
            single("Bagaimana status Anda saat ini?", ["Mahasiswa aktif", "Mahasiswa cuti", "Alumni 1 tahun terakhir", "Lainnya"]),
            single("Berapa jam per minggu Anda mengikuti kelas daring?", ["Kurang dari 5 jam", "5–10 jam", "11–20 jam", "Lebih dari 20 jam"]),
            scale("Seberapa efektif pembelajaran daring dibanding tatap muka menurut Anda?"),
            multi("Kendala apa saja yang Anda alami selama kelas daring?", [
                "Koneksi internet tidak stabil",
                "Materi kurang jelas",
                "Interaksi dengan dosen minim",
                "Biaya kuota",
                "Sulit fokus di rumah",
            ]),
            scale("Seberapa mudah Anda berinteraksi dengan dosen dan teman sekelas secara daring?"),
            open("Menurut Anda, apa yang perlu diperbaiki dari pembelajaran daring?"),
        ),
    },
    {
        title: "Kebiasaan Olahraga dan Pola Tidur Warga Kota",
        description: "Rutinitas olahraga, durasi tidur, dan keluhan kesehatan ringan pada pekerja perkotaan.",
        category: "PUBLIC_HEALTH",
        region: "DKI Jakarta",
        target: 20,
        tokens: 2,
        minutes: 5,
        questions: questionnaire(
            single("Seberapa sering Anda berolahraga dalam seminggu?", ["Tidak pernah", "1–2 kali", "3–4 kali", "Hampir setiap hari"]),
            single("Berapa rata-rata durasi tidur Anda setiap malam?", ["Kurang dari 5 jam", "5–6 jam", "7–8 jam", "Lebih dari 8 jam"]),
            multi("Olahraga apa saja yang biasa Anda lakukan?", [
                "Jalan kaki/bersepeda",
                "Lari",
                "Gym/angkat beban",
                "Renang",
                "Yoga",
                "Sepak bola/futsal",
            ]),
            scale("Seberapa baik kualitas tidur Anda dalam sebulan terakhir?"),
            multi("Keluhan ringan apa yang sering Anda rasakan?", ["Pegal/nyeri otot", "Mudah lelah", "Sakit kepala", "Sulit tidur", "Tidak ada"]),
            open("Apa tantangan terbesar Anda menjaga pola hidup sehat?"),
        ),
    },
    {
        title: "Adopsi AI Generatif di Tempat Kerja",
        description: "Bagaimana karyawan memakai alat AI generatif untuk pekerjaan sehari-hari, dan kendalanya.",
        category: "ARTIFICIAL_INTELLIGENCE",
        target: 25,
        tokens: 3,
        minutes: 7,
        questions: questionnaire(
            single("Seberapa sering Anda memakai alat AI generatif untuk pekerjaan?", [
                "Tidak pernah",
                "Jarang",
                "Beberapa kali seminggu",
                "Setiap hari",
            ]),
            multi("Alat AI apa saja yang pernah Anda gunakan?", ["ChatGPT", "Gemini", "Claude", "Copilot", "Alat internal perusahaan", "Lainnya"]),
            multi("Untuk tugas apa Anda memanfaatkan AI generatif?", [
                "Menulis draf teks",
                "Merangkum dokumen",
                "Menulis kode",
                "Riset dan pencarian informasi",
                "Membuat ide/ brainstorming",
            ]),
            scale("Seberapa besar AI generatif meningkatkan produktivitas Anda?"),
            multi("Kendala apa yang Anda hadapi saat memakainya?", [
                "Hasil kurang akurat",
                "Kebijakan kantor belum jelas",
                "Khawatir kebocoran data",
                "Kurang paham cara pakai",
                "Tidak ada",
            ]),
            scale("Seberapa khawatir Anda bahwa AI generatif akan menggantikan sebagian pekerjaan Anda?"),
            open("Bagaimana kebijakan kantor Anda tentang penggunaan AI generatif?"),
        ),
    },
    {
        title: "Kepuasan Layanan Transportasi Umum",
        description: "Persepsi penumpang terhadap ketepatan, kenyamanan, dan keterjangkauan transportasi umum.",
        category: "TRANSPORTATION_LOGISTICS",
        region: "Jawa Tengah",
        target: 20,
        tokens: 2,
        minutes: 5,
        questions: questionnaire(
            multi("Moda transportasi umum apa saja yang Anda gunakan?", [
                "Bus kota/BRT",
                "Kereta commuter",
                "MRT/LRT",
                "Angkot/mikrolet",
                "Ojek daring",
                "Taksi daring",
            ]),
            single("Seberapa sering Anda memakai transportasi umum dalam seminggu?", ["Tidak pernah", "1–2 kali", "3–5 kali", "Hampir setiap hari"]),
            scale("Seberapa puas Anda dengan ketepatan waktu transportasi umum?"),
            scale("Seberapa puas Anda dengan kenyamanan dan kebersihannya?"),
            scale("Seberapa terjangkau tarifnya menurut Anda?"),
            open("Apa satu hal yang paling ingin Anda perbaiki dari transportasi umum di kota Anda?"),
        ),
    },
    {
        title: "Minat Investasi Reksa Dana Generasi Milenial",
        description: "Pemahaman, preferensi produk, dan faktor pendorong keputusan investasi generasi milenial.",
        category: "ECONOMICS_FINANCE",
        region: "Riau",
        target: 20,
        tokens: 3,
        minutes: 6,
        questions: questionnaire(
            single("Apakah Anda sedang berinvestasi saat ini?", ["Ya, aktif", "Ya, tapi jarang", "Belum, tapi berminat", "Tidak berminat"]),
            multi("Instrumen investasi apa saja yang Anda miliki?", ["Reksa dana", "Saham", "Emas", "Deposito", "Obligasi/SBN", "Kripto"]),
            single("Berapa porsi penghasilan yang Anda sisihkan untuk investasi?", ["Kurang dari 5%", "5–10%", "11–20%", "Lebih dari 20%"]),
            multi("Apa yang paling mendorong Anda berinvestasi?", [
                "Tujuan jangka panjang",
                "Melawan inflasi",
                "Rekomendasi teman/keluarga",
                "Iklan dan media sosial",
                "Keinginan coba-coba",
            ]),
            scale("Seberapa paham Anda tentang risiko produk yang Anda pilih?"),
            open("Apa keraguan terbesar Anda sebelum mulai berinvestasi?"),
        ),
    },
    {
        title: "Pengalaman Belanja Kebutuhan Harian",
        description: "Kebiasaan berbelanja kebutuhan rumah tangga, dari pasar tradisional sampai ritel modern.",
        category: "MARKETING_ADVERTISING",
        region: "DKI Jakarta",
        target: 25,
        tokens: 2,
        minutes: 5,
        questions: questionnaire(
            single("Di mana Anda paling sering membeli kebutuhan harian?", [
                "Pasar tradisional",
                "Minimarket",
                "Supermarket",
                "Aplikasi daring",
                "Warung",
            ]),
            single("Berapa kali Anda berbelanja kebutuhan harian dalam seminggu?", ["1 kali", "2–3 kali", "4–6 kali", "Setiap hari"]),
            multi("Apa yang paling Anda pertimbangkan saat berbelanja?", ["Harga", "Kesegaran", "Kemudahan akses", "Promo/diskon", "Kualitas merek"]),
            scale("Seberapa mudah Anda menemukan kebutuhan harian di sekitar tempat tinggal Anda?"),
            open("Apa yang membuat Anda berpindah dari pasar tradisional ke ritel modern, atau sebaliknya?"),
        ),
    },
    {
        title: "Literasi Kesehatan Mental di Kalangan Pekerja",
        description: "Tingkat pemahaman, keterbukaan, dan akses dukungan kesehatan mental di lingkungan kerja.",
        category: "PSYCHOLOGY",
        target: 30,
        tokens: 2,
        minutes: 7,
        questions: questionnaire(
            scale("Seberapa memahami Anda tentang tanda-tanda masalah kesehatan mental?"),
            scale("Seberapa terbuka Anda membicarakan kesehatan mental dengan rekan kerja?"),
            single("Apakah tempat kerja Anda menyediakan dukungan kesehatan mental?", [
                "Ada dan mudah diakses",
                "Ada tapi sulit diakses",
                "Tidak ada",
                "Tidak tahu",
            ]),
            multi("Apa yang membuat Anda enggan mencari bantuan profesional?", [
                "Biaya",
                "Stigma",
                "Tidak tahu ke mana",
                "Merasa tidak perlu",
                "Takut diketahui atasan",
            ]),
            scale("Seberapa besar tekanan kerja memengaruhi kesehatan mental Anda?"),
            open("Dukungan seperti apa yang Anda harapkan dari tempat kerja?"),
        ),
    },
    {
        title: "Penggunaan Aplikasi Produktivitas Harian",
        description: "Aplikasi apa yang dipakai untuk mengelola tugas dan waktu, serta seberapa besar manfaatnya.",
        category: "INFORMATION_SYSTEMS",
        region: "Riau",
        target: 20,
        tokens: 2,
        minutes: 5,
        questions: questionnaire(
            multi("Aplikasi apa saja yang Anda gunakan untuk mengelola tugas?", [
                "Google Calendar",
                "Notion",
                "Trello",
                "Microsoft To Do",
                "Aplikasi catatan bawaan ponsel",
                "Lainnya",
            ]),
            single("Seberapa sering Anda memakainya?", ["Beberapa kali sebulan", "Beberapa kali seminggu", "Setiap hari", "Setiap saat"]),
            scale("Seberapa besar aplikasi itu membantu Anda menyelesaikan pekerjaan tepat waktu?"),
            single("Di perangkat mana Anda paling sering memakainya?", ["Ponsel", "Laptop/komputer", "Tablet", "Sama sering di beberapa perangkat"]),
            open("Fitur apa yang paling Anda butuhkan namun belum ada di aplikasi Anda?"),
        ),
    },
    {
        title: "Persepsi Orang Tua terhadap Pendidikan Karakter",
        description: "Pandangan orang tua tentang penanaman karakter di sekolah dan perannya di rumah.",
        category: "EDUCATION_PEDAGOGY",
        region: "Jawa Tengah",
        target: 25,
        tokens: 2,
        minutes: 6,
        questions: questionnaire(
            single("Berapa anak Anda yang saat ini bersekolah?", ["1 anak", "2 anak", "3 anak atau lebih", "Belum ada"]),
            single("Jenjang pendidikan anak Anda saat ini?", ["SD", "SMP", "SMA/SMK", "Sudah lulus"]),
            scale("Seberapa penting pendidikan karakter dibanding nilai akademik?"),
            multi("Nilai karakter apa yang paling Anda tekankan?", [
                "Kejujuran",
                "Disiplin",
                "Kemandirian",
                "Empati",
                "Tanggung jawab",
                "Sopan santun",
            ]),
            scale("Seberapa terlibat sekolah dalam menanamkan karakter pada anak Anda?"),
            open("Bagaimana Anda menanamkan karakter pada anak di rumah?"),
        ),
    },
    {
        title: "Kebiasaan Menabung dan Perencanaan Keuangan",
        description: "Cara rumah tangga mengatur tabungan, dana darurat, dan tujuan keuangan jangka panjang.",
        category: "ECONOMICS_FINANCE",
        region: "DKI Jakarta",
        target: 30,
        tokens: 2,
        minutes: 6,
        questions: questionnaire(
            single("Apakah Anda rutin menyisihkan uang untuk tabungan setiap bulan?", ["Selalu", "Sering", "Kadang-kadang", "Tidak pernah"]),
            multi("Untuk tujuan apa Anda menabung?", ["Dana darurat", "Pendidikan", "Rumah", "Kendaraan", "Pensiun", "Liburan"]),
            single("Berapa besar dana darurat yang Anda miliki?", [
                "Belum ada",
                "Kurang dari 1 bulan pengeluaran",
                "1–3 bulan",
                "Lebih dari 3 bulan",
            ]),
            scale("Seberapa percaya diri Anda mengelola keuangan jangka panjang?"),
            multi("Apa tantangan terbesar dalam menabung?", [
                "Penghasilan tidak tetap",
                "Pengeluaran besar mendadak",
                "Goda belanja",
                "Tidak ada anggaran",
                "Tidak ada tantangan",
            ]),
            open("Nasihat keuangan apa yang paling membantu Anda?"),
        ),
    },
    {
        title: "Preferensi Konten Hiburan Digital",
        description: "Jenis konten yang paling sering ditonton, platform favorit, dan kebiasaan berlangganan.",
        category: "COMMUNICATION_MEDIA",
        target: 20,
        tokens: 2,
        minutes: 5,
        questions: questionnaire(
            multi("Platform apa saja yang Anda pakai untuk menonton hiburan?", ["YouTube", "TikTok", "Instagram", "Netflix", "Disney+", "Lainnya"]),
            single("Berapa jam sehari Anda menonton konten hiburan digital?", ["Kurang dari 1 jam", "1–2 jam", "3–4 jam", "Lebih dari 4 jam"]),
            multi("Jenis konten apa yang paling Anda sukai?", ["Film/series", "Video pendek", "Podcast", "Gaming", "Musik", "Berita/hiburan"]),
            single("Apakah Anda berlangganan layanan berbayar?", [
                "Ya, 1 layanan",
                "Ya, lebih dari 1",
                "Tidak, hanya gratis",
                "Berbagi akun keluarga",
            ]),
            open("Apa yang membuat Anda bertahan berlangganan sebuah layanan?"),
        ),
    },
    {
        title: "Kualitas Layanan Kesehatan Primer",
        description: "Pengalaman pasien di puskesmas dan klinik: waktu tunggu, mutu layanan, dan biaya.",
        category: "MEDICINE_CLINICAL_HEALTH",
        region: "Riau",
        target: 25,
        tokens: 3,
        minutes: 6,
        questions: questionnaire(
            single("Kapan terakhir kali Anda berobat ke fasilitas kesehatan primer?", [
                "1 bulan terakhir",
                "3 bulan terakhir",
                "6 bulan terakhir",
                "Lebih dari 1 tahun",
            ]),
            single("Fasilitas mana yang Anda kunjungi?", ["Puskesmas", "Klinik swasta", "Praktik dokter", "Rumah sakit"]),
            single("Berapa lama Anda menunggu untuk dilayani?", ["Kurang dari 30 menit", "30–60 menit", "1–2 jam", "Lebih dari 2 jam"]),
            scale("Seberapa puas Anda dengan mutu layanannya?"),
            single("Bagaimana Anda membayar layanan tersebut?", ["BPJS", "Asuransi swasta", "Bayar sendiri", "Ditanggung kantor"]),
            open("Apa yang perlu diperbaiki dari layanan kesehatan primer di daerah Anda?"),
        ),
    },
    {
        title: "Pemilihan Kampus dan Jurusan Kuliah",
        description: "Faktor yang menentukan pilihan kampus dan jurusan pada calon mahasiswa.",
        category: "EDUCATION_PEDAGOGY",
        region: "Jawa Tengah",
        target: 20,
        tokens: 2,
        minutes: 5,
        questions: questionnaire(
            single("Saat ini Anda sedang dalam tahap apa?", ["Siswa SMA/SMK", "Calon mahasiswa", "Mahasiswa baru", "Mahasiswa aktif"]),
            multi("Faktor apa yang paling menentukan pilihan kampus?", [
                "Akreditasi/jurusan",
                "Biaya kuliah",
                "Lokasi",
                "Reputasi kampus",
                "Peluang kerja",
                "Keinginan orang tua",
            ]),
            single("Apakah Anda mempertimbangkan kampus di luar kota asal?", ["Ya, pasti", "Mungkin", "Tidak, ingin dekat rumah", "Belum tahu"]),
            scale("Seberapa yakin Anda dengan jurusan yang dipilih?"),
            open("Apa pertimbangan terbesar Anda dalam memilih jurusan?"),
        ),
    },
    {
        title: "Kesiapsiagaan Masyarakat terhadap Kebakaran Hutan dan Lahan (Karhutla) di Indonesia",
        description:
            "Riset ini memetakan kesiapsiagaan dan persepsi masyarakat terhadap kebakaran hutan dan lahan (karhutla) di Indonesia: " +
            "pengalaman terdampak kabut asap, penyebab yang dianggap utama, kesiapan lingkungan, dan upaya pencegahan yang dinilai paling penting.",
        category: "DISASTER_MANAGEMENT",
        region: "Riau",
        target: 25,
        tokens: 2,
        minutes: 6,
        questions: questionnaire(
            single("Seberapa sering Anda melihat atau merasakan dampak kabut asap karhutla di daerah Anda?", [
                "Tidak pernah",
                "Jarang",
                "Beberapa kali setahun",
                "Hampir setiap tahun",
            ]),
            multi("Menurut Anda, apa penyebab utama kebakaran hutan dan lahan?", [
                "Pembukaan lahan dengan membakar",
                "Cuaca kering dan panas",
                "Kelalaian manusia",
                "Faktor alam lainnya",
            ]),
            scale("Seberapa siap lingkungan tempat Anda tinggal menghadapi karhutla?"),
            open("Upaya apa yang menurut Anda paling penting untuk mencegah karhutla?"),
        ),
    },
    {
        title: "Pola Konsumsi Pangan Rumah Tangga",
        description: "Kebiasaan makan, belanja bahan pangan, dan kesadaran gizi di tingkat rumah tangga.",
        category: "FOOD_NUTRITION",
        region: "Banten",
        target: 25,
        tokens: 2,
        minutes: 6,
        questions: questionnaire(
            single("Berapa anggota rumah tangga Anda?", ["1–2 orang", "3–4 orang", "5–6 orang", "Lebih dari 6 orang"]),
            single("Berapa kali sehari Anda memasak di rumah?", ["Tidak pernah", "1 kali", "2 kali", "3 kali atau lebih"]),
            multi("Sumber protein yang paling sering Anda konsumsi?", ["Ayam", "Ikan", "Telur", "Daging sapi", "Tahu/tempe", "Kacang-kacangan"]),
            single("Seberapa sering keluarga Anda makan di luar atau pesan antar?", [
                "Setiap hari",
                "Beberapa kali seminggu",
                "Beberapa kali sebulan",
                "Hampir tidak pernah",
            ]),
            scale("Seberapa besar perhatian Anda pada gizi seimbang?"),
            open("Apa kendala utama menyediakan makanan bergizi di rumah Anda?"),
        ),
    },
    {
        title: "Perilaku Penggunaan Energi Listrik Rumah Tangga",
        description: "Kebiasaan pemakaian listrik, peralatan yang paling boros, dan minat pada energi terbarukan.",
        category: "ENERGY_RENEWABLE_RESOURCES",
        region: "Jawa Barat",
        target: 20,
        tokens: 2,
        minutes: 5,
        questions: questionnaire(
            single("Berapa rata-rata tagihan listrik rumah Anda per bulan?", [
                "Kurang dari Rp200.000",
                "Rp200.000–Rp500.000",
                "Rp500.000–Rp1.000.000",
                "Lebih dari Rp1.000.000",
            ]),
            multi("Peralatan apa yang paling banyak memakai listrik menurut Anda?", [
                "AC",
                "Kulkas",
                "Mesin cuci",
                "Setrika",
                "Komputer/laptop",
                "Lampu",
            ]),
            multi("Upaya apa yang sudah Anda lakukan untuk menghemat listrik?", [
                "Mematikan alat yang tidak dipakai",
                "Memakai lampu LED",
                "Mengatur suhu AC",
                "Belum ada",
            ]),
            scale("Seberapa tertarik Anda memasang panel surya di rumah?"),
            open("Apa yang menghambat Anda menghemat listrik lebih banyak?"),
        ),
    },
    {
        title: "Kepuasan Pelanggan terhadap Layanan Pengiriman E-commerce",
        description: "Pengalaman penerimaan paket: kecepatan, kondisi barang, dan penanganan masalah pengiriman.",
        category: "TRANSPORTATION_LOGISTICS",
        region: "Banten",
        target: 25,
        tokens: 2,
        minutes: 5,
        questions: questionnaire(
            single("Berapa sering Anda menerima paket belanja daring?", [
                "Jarang",
                "1–2 kali sebulan",
                "3–5 kali sebulan",
                "Lebih dari 5 kali sebulan",
            ]),
            multi("Ekspedisi apa saja yang biasa mengantar paket Anda?", ["JNE", "J&T", "SiCepat", "AnterAja", "Ninja Xpress", "Lainnya"]),
            scale("Seberapa puas Anda dengan kecepatan pengiriman?"),
            single("Pernahkah barang Anda tiba dalam kondisi rusak atau salah?", ["Tidak pernah", "Sekali", "Beberapa kali", "Sering"]),
            scale("Seberapa puas Anda dengan penanganan keluhan pengiriman?"),
            open("Apa yang paling menentukan kepuasan Anda terhadap layanan pengiriman?"),
        ),
    },
    {
        title: "Minat Berwirausaha Mahasiswa dan Lulusan Baru",
        description: "Ketertarikan, kesiapan, dan hambatan berwirausaha pada mahasiswa serta lulusan baru.",
        category: "ENTREPRENEURSHIP",
        region: "Jawa Barat",
        target: 20,
        tokens: 3,
        minutes: 6,
        questions: questionnaire(
            single("Apakah Anda pernah menjalankan usaha sendiri?", [
                "Ya, sedang berjalan",
                "Pernah, sudah berhenti",
                "Belum, tapi berminat",
                "Tidak berminat",
            ]),
            multi("Bidang usaha apa yang menarik bagi Anda?", ["Kuliner", "Fashion", "Teknologi digital", "Jasa/konsultasi", "Pertanian", "Lainnya"]),
            multi("Apa hambatan terbesar untuk memulai usaha?", [
                "Modal",
                "Kurang pengalaman",
                "Takut gagal",
                "Tidak punya waktu",
                "Kurang dukungan",
            ]),
            scale("Seberapa siap Anda mengelola keuangan usaha sendiri?"),
            single("Dukungan apa yang paling Anda butuhkan?", [
                "Modal usaha",
                "Pendampingan mentor",
                "Pelatihan keterampilan",
                "Akses pasar",
                "Regulasi yang mudah",
            ]),
            open("Apa yang memotivasi Anda untuk berwirausaha?"),
        ),
    },
]

/** The research's screening rules: the shared ones, plus a domicile rule when it targets one. */
function criteriaFor(definition: SeedResearchDefinition): ResearchCriterionInput[] {
    if (definition.region === undefined) return CRITERIA

    return [...CRITERIA, { field: "region", operator: "EQ", value: definition.region }]
}

/**
 * Creates one seeded research and publishes it, or leaves the one already there alone.
 *
 * Publishing is what reserves the reward budget, so it goes through `publishResearchService`
 * rather than writing the status directly — the reservation, its ledger row, and the status
 * change then land exactly as they would from the app. A published research's criteria and
 * questionnaire can no longer be changed, so an existing one is never touched.
 */
async function seedResearch(researcherId: string, definition: SeedResearchDefinition) {
    const existing = await prisma.research.findFirst({
        where: { researcherId, title: definition.title, deletedAt: null },
        select: { id: true },
    })

    if (existing !== null) {
        console.log(`  "${definition.title}" already seeded (${existing.id})`)
        return
    }

    const draft = await createResearchDraftService({ researcherId })

    await updateResearchService({
        id: draft.id,
        researcherId,
        title: definition.title,
        description: definition.description,
        category: definition.category,
        targetRespondentCount: definition.target,
        tokenPerRespondent: definition.tokens,
        estimatedDurationMinutes: definition.minutes,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        criteria: criteriaFor(definition),
    })

    await replaceResearchQuestionsService({ id: draft.id, researcherId, questions: definition.questions ?? MINIMAL_QUESTIONS })

    await publishResearchService({ id: draft.id, researcherId })

    console.log(`  "${definition.title}" published (${draft.id})`)
}

/* ========== Jalan ========== */

console.log("Seeding accounts…")
const researchers = await Promise.all(RESEARCHERS.map((account) => seedAccount(account)))
await Promise.all([ADMIN, ...RESPONDENTS].map((account) => seedAccount(account)))

console.log("Seeding researches…")
// The researches outnumber the researchers, so ownership wraps around the list — each
// researcher owns one or two, and every research has its own owner.
for (const [index, definition] of SEED_RESEARCHES.entries()) {
    await seedResearch(researchers[index % researchers.length].id, definition)
}

console.log(`\nDone. Sign in with any of the accounts above, password: ${SEED_PASSWORD}`)

await prisma.$disconnect()
