import Link from "next/link"
import { Suspense } from "react"
import About from "@/components/landing/about"
import BuildYourResearch from "@/components/landing/build-your-research"
import FeaturedResearch from "@/components/landing/featured-research"
import Founders from "@/components/landing/founders"
import HeroTagline from "@/components/landing/hero-tagline"
import HighlightCard, { HighlightCardSkeleton } from "@/components/landing/highlight-card"
import LearnCommunity from "@/components/landing/learn-community"
import SiteFooter from "@/components/landing/site-footer"
import AuthNav from "@/components/shared/auth-nav"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import Image from "next/image"

/**
 * The public landing page.
 *
 * Static on purpose — it is a server component, so nothing here ships JavaScript beyond the
 * links. The layout follows the reference: a slim top bar, a centred hero, a wide visual with
 * a floating card, a partner row, then the product's own sections.
 */

const NAV_LINKS = [
    { label: "Jelajahi", href: "/feed" },
    { label: "Fitur", href: "#fitur" },
    { label: "Cara Kerja", href: "#cara-kerja" },
    { label: "Bantuan", href: "/help-center" },
]

const FEATURES = [
    {
        title: "Susun kuesioner",
        description: "Bangun soal pilihan ganda, skala, angka, atau esai, lalu tentukan mana yang wajib diisi.",
    },
    {
        title: "Saring responden",
        description: "Tetapkan kriteria usia, gender, dan wilayah domisili agar data datang dari orang yang tepat.",
    },
    {
        title: "Reward transparan",
        description: "Token direservasi sebagai escrow dan dicairkan otomatis ke responden setelah jawaban divalidasi.",
    },
]

const STEPS = [
    { title: "Buat riset", description: "Tentukan tujuan, target responden, dan reward per responden." },
    { title: "Sebarkan", description: "Publikasikan riset; responden yang memenuhi kriteria melihatnya di dashboard." },
    { title: "Terima hasil", description: "Pantau jawaban, validasi kualitas, lalu ekspor data untuk analisis." },
]

/** Placeholder partner wordmarks — swap these for the real partners before launch. */
const PARTNERS = [
    "Universitas Nusantara",
    "Pusat Riset Pasar",
    "DataLab Indonesia",
    "Klinik Survei",
    "Asosiasi Riset Digital",
    "Yayasan Literasi Data",
]

export default function Page() {
    return (
        <div className="flex min-h-dvh flex-col bg-background">
            {/* top bar */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
                    <Link href="/" className="text-xl font-semibold tracking-tight">
                        Responku
                    </Link>

                    <nav className="hidden items-center gap-6 md:flex">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <AuthNav />
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* hero */}
                <section className="mx-auto w-full max-w-6xl px-4 pt-20 pb-12 text-center sm:px-6 sm:pt-28 lg:px-8">
                    <HeroTagline />

                    <h1 className="mx-auto mt-6 max-w-5xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl lg:text-5xl">
                        Menghubungkan riset dengan responden yang tepat
                    </h1>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
                        Satu platform untuk menyusun kuesioner, menyaring responden lewat kriteria domisili dan usia, lalu membayar reward dengan
                        token — transparan dari awal sampai selesai.
                    </p>

                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "h-11 rounded-full px-6 text-base")}>
                            Mulai Buat Riset
                        </Link>
                        <Link href="/feed" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 rounded-full px-6 text-base")}>
                            Jelajahi Riset
                        </Link>
                    </div>

                    <p className="mt-6 text-center text-sm text-muted-foreground">Responden terverifikasi domisili &amp; usia</p>
                </section>

                {/* hero visual */}
                <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
                    <div className="relative overflow-hidden rounded-2xl ring-1 ring-foreground/10">
                        <div className="relative aspect-16/10 w-full sm:aspect-16/7">
                            <Image
                                alt="happen"
                                className="object-cover"
                                fill
                                src="https://res.cloudinary.com/x0kwukhs/image/upload/v1792825281/forest-burn.jpg"
                            />

                            {/* floating card, echoing the reference's overlay */}
                            <Suspense fallback={<HighlightCardSkeleton />}>
                                <HighlightCard />
                            </Suspense>

                            <div className="text-xl text-white absolute bottom-0 left-0 py-8 px-8">
                                <h3># Pray for Karhutla</h3>
                            </div>
                        </div>
                    </div>
                </section>

                {/* partners */}
                <section className="border-t">
                    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
                        <p className="text-center font-mono text-xs font-medium tracking-[0.2em] text-muted-foreground">
                            Dipercaya oleh tim riset di
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
                            {PARTNERS.map((name) => (
                                <span key={name} className="text-lg font-semibold text-muted-foreground/60">
                                    {name}
                                </span>
                            ))}
                        </div>
                    </div>
                </section>

                {/* featured research */}
                <FeaturedResearch />

                {/* features */}
                <section id="fitur" className="scroll-mt-24 border-t">
                    <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32 sm:text-left lg:px-8">
                        <div className="max-w-2xl">
                            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Semua yang dibutuhkan untuk satu riset</h2>
                            <p className="mt-4 leading-relaxed text-muted-foreground">
                                Dari menyusun pertanyaan sampai mencairkan reward, tanpa berpindah alat.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map(({ title, description }) => (
                                <div key={title} className="rounded-xl bg-card p-6 shadow-xs ring-1 ring-foreground/10">
                                    <h3 className="font-semibold">{title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* how it works */}
                <section id="cara-kerja" className="scroll-mt-24 border-t">
                    <div className="mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32 sm:text-left lg:px-8">
                        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Tiga langkah, satu alur</h2>

                        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
                            {STEPS.map((step, index) => (
                                <li key={step.title} className="space-y-3">
                                    <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background sm:mx-0">
                                        {index + 1}
                                    </span>
                                    <h3 className="font-semibold">{step.title}</h3>
                                    <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                {/* build your own */}
                <BuildYourResearch />

                {/* learn from the community */}
                <LearnCommunity />

                {/* closing call to action */}
                <section id="mulai" className="scroll-mt-24 border-t">
                    <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
                        <div className="flex flex-col items-center gap-6 rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
                            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                                Siap memulai riset berikutnya?
                            </h2>
                            <p className="max-w-xl leading-relaxed text-primary-foreground/80">
                                Buat akun, susun kuesioner pertamamu, dan jangkau responden yang tepat hari ini.
                            </p>
                            <Link
                                href="/register"
                                className={cn(
                                    buttonVariants({ variant: "outline", size: "lg" }),
                                    "h-11 rounded-full border-transparent bg-background px-6 text-base text-foreground hover:bg-background/90 hover:text-foreground",
                                )}
                            >
                                Daftar Sekarang
                            </Link>
                        </div>
                    </div>
                </section>
            </main>

            {/* about */}
            <About />

            {/* founders */}
            <Founders />

            <SiteFooter />
        </div>
    )
}
