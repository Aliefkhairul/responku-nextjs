import RisetDetailView, { type RisetDetail } from "@/components/riset/riset-detail";
import { notFound } from "next/navigation";

async function getRiset(risetId: string): Promise<RisetDetail | null> {
    if (!risetId) return null;

    return {
        id: risetId,
        title: "Evaluasi Dampak Regulasi AI pada Pengambilan Keputusan Klinis",
        researcher: "Dr. Sari Peneliti, Ph.D",
        institution: "Pusat Studi Informatika Medis Universitas Indonesia",
        description:
            "Penelitian independen untuk memetakan kesiapan tenaga kesehatan dan akademisi dalam memanfaatkan algoritma asistensi diagnostik di fasilitas layanan primer dan rujukan.",
        estimatedMinutes: 10,
        rewardToken: 15,
        tokenValueRupiah: 1000,
        criteria: "Berumur 18+ tahun, berdomisili di Indonesia, memiliki pemahaman dasar tentang teknologi medis.",
        questionnaireUrl: "https://forms.gle/contoh",
        verified: true,
    };
}

export default async function Page({ params }: { params: Promise<{ risetId: string }> }) {
    const { risetId } = await params;
    const riset = await getRiset(risetId);

    if (!riset) notFound();

    return <RisetDetailView riset={riset} />;
}
