import DaftarPertanyaanCard from "@/components/buat-riset/daftar-pertanyaan-card";
import IdentitasKuesioner from "@/components/buat-riset/identitas-kuesioner";
import KriteriaResponden from "@/components/buat-riset/kriteria-responden";
import React from "react";

export default function Page() {
    return (
        <div className="w-full flex flex-col space-y-2 py-8 px-96">
            <IdentitasKuesioner />
            <KriteriaResponden />
            <DaftarPertanyaanCard />
        </div>
    );
}
