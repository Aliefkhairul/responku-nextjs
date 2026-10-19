import JelajahSurveiCard from "@/components/shared/jelajah-survei-card";
import KerjakanSurveiCard from "@/components/shared/kerjakan-survei-card";
import SaldoDompetAnda from "@/components/shared/saldo-dompet-anda";
import SebarKuesionerCard from "@/components/shared/sebar-kuesioner-card";

export default function UiPage() {
    return (
        <div className="flex flex-col p-8">
            <JelajahSurveiCard />;
            <SaldoDompetAnda />
            <SebarKuesionerCard />
            <KerjakanSurveiCard />
        </div>
    );
}
