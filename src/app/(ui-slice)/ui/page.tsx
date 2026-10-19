import JelajahSurveiCard from "@/components/shared/jelajah-survei-card";
import KerjakanSurveiCard from "@/components/shared/kerjakan-survei-card";
import SaldoDompetAnda from "@/components/shared/saldo-dompet-anda";
import SebarKuesionerCard from "@/components/shared/sebar-kuesioner-card";
import StatistikBasicCard from "@/components/shared/statistik-basic-card";

export default function UiPage() {
    return (
        <div className="flex flex-col space-y-4">
            <JelajahSurveiCard />
            <SaldoDompetAnda />
            <SebarKuesionerCard />
            <KerjakanSurveiCard />
            <StatistikBasicCard />
        </div>
    );
}
