"use client";

import { useForm } from "@tanstack/react-form";
import { CheckCircle2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const identitySchema = z.object({
    name: z.string().trim().min(1, "Nama lengkap wajib diisi."),
    email: z.string().trim().email("Alamat email tidak valid."),
    phone: z.string().trim().min(1, "Nomor telepon wajib diisi."),
});

type IdentityFormValues = z.infer<typeof identitySchema>;

export default function IdentityForm() {
    const form = useForm({
        defaultValues: {
            name: "",
            email: "",
            phone: "",
        } as IdentityFormValues,
        validators: {
            onSubmit: identitySchema,
        },
        onSubmit: async ({ value }) => {
            console.log(value);
        },
    });

    return (
        <div>
            <div>
                <h2 className="text-lg font-semibold">Informasi Dasar</h2>
                <p className="text-muted-foreground">
                    Kelola nama, email, dan kontak akun Anda.
                </p>
            </div>

            <Separator className="my-4" />

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    form.handleSubmit();
                }}
                className="space-y-4"
            >
                <form.Field name="name">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Nama Lengkap</Label>
                            <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                    field.handleChange(event.target.value)
                                }
                            />
                            {field.state.meta.errors.map((error, index) => (
                                <p className="text-sm text-red-500" key={index}>
                                    {typeof error === "string"
                                        ? error
                                        : error?.message}
                                </p>
                            ))}
                        </div>
                    )}
                </form.Field>

                <form.Field name="email">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Alamat Email</Label>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="email"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                    field.handleChange(event.target.value)
                                }
                            />
                            <p className="text-sm text-muted-foreground flex items-center space-x-1">
                                <CheckCircle2 className="mr-1 inline size-4 w-3" />
                                <span>
                                    Email telah diverifikasi. Hubungi bantuan
                                    jika perlu mengganti.
                                </span>
                            </p>
                            {field.state.meta.errors.map((error, index) => (
                                <p className="text-sm text-red-500" key={index}>
                                    {typeof error === "string"
                                        ? error
                                        : error?.message}
                                </p>
                            ))}
                        </div>
                    )}
                </form.Field>

                <form.Field name="phone">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>
                                Nomor WhatsApp / Telepon
                            </Label>
                            <Input
                                id={field.name}
                                name={field.name}
                                type="tel"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                    field.handleChange(event.target.value)
                                }
                            />
                            {field.state.meta.errors.map((error, index) => (
                                <p className="text-sm text-red-500" key={index}>
                                    {typeof error === "string"
                                        ? error
                                        : error?.message}
                                </p>
                            ))}
                        </div>
                    )}
                </form.Field>

                <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                    {([canSubmit, isSubmitting]) => (
                        <Button
                            type="submit"
                            disabled={!canSubmit || isSubmitting}
                        >
                            Simpan Perubahan
                        </Button>
                    )}
                </form.Subscribe>
            </form>
        </div>
    );
}
