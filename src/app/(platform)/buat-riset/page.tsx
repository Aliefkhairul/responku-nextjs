"use client";

import RisetEditorEngine from "@/lib/editor-engine/riset-editor-engine";
import { useRisetEditorForm } from "@/lib/editor-engine/riset-editor-schema";

export default function Page() {
    const form = useRisetEditorForm();

    return (
        <div className="mt-20 w-full px-8">
            <RisetEditorEngine risetEditorForm={form} />
        </div>
    );
}
