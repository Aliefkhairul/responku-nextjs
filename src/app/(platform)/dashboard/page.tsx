"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    ArrowUpRightIcon,
    CalendarIcon,
    CircleHelpIcon,
    LayoutDashboardIcon,
    MenuIcon,
    Microscope,
    SearchIcon,
    SettingsIcon,
    UserCheckIcon,
    Wallet,
    XIcon,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

type MenuItem = {
    label: string;
    icon: LucideIcon;
    highlight?: boolean;
};

const menus: MenuItem[] = [
    { label: "Dashboard", icon: LayoutDashboardIcon },
    { label: "Profil & Verifikasi", icon: UserCheckIcon },
    { label: "Pengaturan Akun", icon: SettingsIcon },
    { label: "Pusat Bantuan", icon: CircleHelpIcon },
];

const menus2nd: MenuItem[] = [
    { label: "Saldo Dompet", icon: Wallet },
    { label: "Buat Riset", icon: Microscope, highlight: true },
];

const user = {
    name: "John Doe",
    image: "",
};

function MenuList({
    items,
    open,
    onItemClick,
}: {
    items: MenuItem[];
    open: boolean;
    onItemClick?: () => void;
}) {
    // di mobile label selalu tampil, hanya di md+ label ikut ciut
    const hideOnCollapse = open ? "opacity-100" : "md:opacity-0";

    return (
        <ul className="flex flex-col gap-1">
            {items.map(({ label, icon: Icon, highlight }) => (
                <li key={label}>
                    <button
                        type="button"
                        title={label}
                        onClick={onItemClick}
                        className={`w-full h-10 flex items-center gap-3 px-3 rounded-md text-sm transition-colors ${
                            highlight
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : "hover:bg-muted"
                        }`}
                    >
                        <Icon className="size-5 shrink-0" />
                        <span
                            className={`whitespace-nowrap transition-opacity duration-200 font-medium ${hideOnCollapse}`}
                        >
                            {label}
                        </span>
                        {highlight && (
                            <ArrowUpRightIcon
                                className={`size-4 shrink-0 ml-auto transition-opacity duration-200 ${hideOnCollapse}`}
                            />
                        )}
                    </button>
                </li>
            ))}
        </ul>
    );
}

export default function DashboardPage() {
    const [open, setOpen] = useState(true); // desktop: lebar / ciut
    const [mobileOpen, setMobileOpen] = useState(false); // mobile: turun / naik
    const [date, setDate] = useState<Date | undefined>(undefined);

    const hideOnCollapse = open ? "opacity-100" : "md:opacity-0";

    return (
        <div className="w-full h-dvh flex md:divide-x overflow-hidden">
            {/* aside */}
            <aside
                className={cn(
                    // mobile: panel fixed dari atas
                    "fixed inset-x-0 top-0 z-50 h-dvh bg-background flex flex-col transition-transform duration-200 ease-in-out",
                    mobileOpen ? "translate-y-0" : "-translate-y-full",
                    // desktop: kembali ke layout normal
                    "md:static md:z-auto md:h-full md:shrink-0 md:translate-y-0 md:overflow-hidden md:transition-all",
                    open ? "md:w-64" : "md:w-16",
                )}
            >
                {/* title */}
                <div className="h-15 shrink-0 flex items-center justify-between px-6">
                    <span
                        className={`text-lg font-bold whitespace-nowrap transition-opacity duration-200 ${hideOnCollapse}`}
                    >
                        Responku
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Tutup menu"
                    >
                        <XIcon />
                    </Button>
                </div>

                {/* menu */}
                <nav
                    className={cn(
                        "flex-1 overflow-y-auto px-4 py-4 transition-all duration-200",
                        !open && "md:px-2",
                    )}
                >
                    <MenuList
                        items={menus}
                        open={open}
                        onItemClick={() => setMobileOpen(false)}
                    />

                    {/* separator */}
                    <div className="my-3 border-t" />

                    <MenuList
                        items={menus2nd}
                        open={open}
                        onItemClick={() => setMobileOpen(false)}
                    />
                </nav>

                {/* user */}
                <div className="shrink-0 border-t p-2">
                    <div
                        title={user.name}
                        className="h-12 flex items-center gap-3 px-2 rounded-md"
                    >
                        <Avatar className="size-8 shrink-0">
                            <AvatarImage src={user.image} alt={user.name} />
                            <AvatarFallback>
                                {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <span
                            className={`text-sm font-medium whitespace-nowrap transition-opacity duration-200 ${hideOnCollapse}`}
                        >
                            {user.name}
                        </span>
                    </div>
                </div>
            </aside>

            {/* right */}
            <div className="h-full w-full min-w-0 flex flex-col divide-y">
                {/* head */}
                <div className="h-15 shrink-0 w-full flex items-center gap-3 px-4">
                    {/* toggle mobile */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Buka menu"
                    >
                        <MenuIcon />
                    </Button>

                    {/* toggle desktop */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden md:inline-flex"
                        onClick={() => setOpen((old) => !old)}
                        aria-label="Toggle sidebar"
                    >
                        <MenuIcon />
                    </Button>

                    {/* search */}
                    <div className="relative w-full min-w-0 max-w-sm">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Cari..."
                            className="pl-9"
                        />
                    </div>

                    {/* right actions */}
                    <div className="ml-auto flex shrink-0 items-center gap-3">
                        {/* calendar */}
                        <Popover>
                            <PopoverTrigger
                                className={cn(
                                    buttonVariants({ variant: "outline" }),
                                    "font-normal",
                                )}
                            >
                                <CalendarIcon className="size-4" />
                                <span className="hidden sm:inline">
                                    {date
                                        ? date.toLocaleDateString("id-ID", {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                          })
                                        : "Kalender"}
                                </span>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                />
                            </PopoverContent>
                        </Popover>

                        {/* user */}
                        <Link
                            href="/dashboard/profile"
                            title="Pengaturan profil"
                            aria-label="Pengaturan profil"
                            className="rounded-full"
                        >
                            <Avatar className="size-9">
                                <AvatarImage src={user.image} alt={user.name} />
                                <AvatarFallback>
                                    {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </Link>
                    </div>
                </div>

                {/* main */}
                <div className="flex-1 w-full" />
            </div>
        </div>
    );
}
