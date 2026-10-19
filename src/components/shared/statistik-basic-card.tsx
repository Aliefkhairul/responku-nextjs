import * as Card from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

export default function StatistikBasicCard() {
    return (
        <div className="flex w-full items-center justify-center">
            <Card.Card className="w-full">
                <Card.CardHeader className="space-y-1">
                    {/* Bagian Atas: Ikon dan Judul */}
                    <div className="flex items-center gap-2 -ml-1">
                        <ArrowUpRight />
                        <span className="text-sm font-semibold tracking-wider">
                            Survei Tersedia
                        </span>
                    </div>

                    {/* Bagian Bawah: Angka dan Deskripsi */}
                    <div className="flex flex-col">
                        <h3 className="text-xl font-semibold leading-snug">
                            4
                        </h3>
                        <p className="text-sm text-slate-500">cocok profilmu</p>
                    </div>
                </Card.CardHeader>
            </Card.Card>
        </div>
    );
}
