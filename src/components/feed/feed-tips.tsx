import { Check } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import * as Card from "@/components/ui/card"

/**
 * The feed's sidebar tips.
 *
 * Static, so it stays a server component. The points mirror what the quality screening
 * actually looks for, so a respondent can see what keeps a submission from being rejected.
 */

const QUALITY_TIPS = [
    "Baca setiap pertanyaan dengan teliti",
    "Hindari pola jawaban yang seragam",
    "Jangan mengisi jauh lebih cepat dari estimasi",
    "Jawab dengan konsisten dan jujur",
]

const REWARD_STEPS = [
    "Pilih riset yang sesuai domisili dan profilmu.",
    "Isi kuesioner sampai selesai, lalu kirim satu kali.",
    "Reward cair setelah jawaban divalidasi.",
]

export default function FeedTips() {
    return (
        <div className="flex w-full flex-col gap-3">
            <p className="text-sm text-muted-foreground">Tips responku</p>

            <Card.Card className="w-full">
                <Card.CardHeader className="space-y-4">
                    <h3 className="text-lg leading-snug font-semibold">Tips Quality Score</h3>

                    {/* List Tips */}
                    <ul className="space-y-3">
                        {[
                            "Baca setiap pertanyaan dengan teliti",
                            "Hindari pola jawaban seragam",
                            "Jangan terlalu cepat (speeding)",
                            "Konsisten dan jujur dalam menjawab",
                        ].map((tip, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="m8 12 3 3 5-6" />
                                    </svg>
                                </div>

                                <span className="text-sm leading-relaxed text-muted-foreground">{tip}</span>
                            </li>
                        ))}
                    </ul>
                </Card.CardHeader>
            </Card.Card>

            <Card.Card className="w-full">
                <Card.CardHeader className="space-y-4">
                    <h3 className="text-lg leading-snug font-semibold">Cara dapat reward</h3>

                    <ol className="space-y-3">
                        {REWARD_STEPS.map((step, index) => (
                            <li key={step} className="flex items-start gap-2">
                                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                                    {index + 1}
                                </span>
                                <span className="text-sm leading-relaxed text-muted-foreground">{step}</span>
                            </li>
                        ))}
                    </ol>

                    <Button className="w-full" nativeButton={false} render={<Link href="/help-center" />}>
                        Pusat Bantuan
                    </Button>
                </Card.CardHeader>
            </Card.Card>
        </div>
    )
}
