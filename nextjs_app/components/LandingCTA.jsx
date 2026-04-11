"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "./ui/button";
import { ChevronRight, Database } from "lucide-react";

export default function LandingCTA() {
    const t = useTranslations("landing.cta");

    return (
        <section className="flex flex-col items-center justify-center gap-10 p-2 md:p-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold">
                {t("cta")}
            </h2>
            <div className="relative container mx-auto max-w-5xl rounded-3xl p-5 overflow-hidden text-white text-center bg-[linear-gradient(135deg,_#0E3147_0%,_#134565_40%,_#13B38D_100%)]">
                {/* Dot overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(255,255,255,0.1)_1px,_transparent_1px)] bg-size-[20px_20px] pointer-events-none"></div>
                <div className="relative z-10 p-5 md:p-10 flex flex-col justify-center items-center gap-10">
                    <h2 className="text-3xl sm:text-5xl font-extrabold">
                        {t("title")}
                    </h2>
                    <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-3xl mx-auto">
                        {t("description")}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Link href="/auth/login">
                            <Button
                                variant="outline"
                                className="bg-white text-black sm:text-lg px-12 py-6 sm:py-8 rounded-md w-full flex gap-4 items-center"
                            >
                                <span>{t("primaryButton")}</span>
                                <ChevronRight className="rtl:rotate-180" />
                            </Button>
                        </Link>
                        <Link href="/datasets">
                            <Button
                                variant="ghost"
                                className="sm:text-lg px-12 py-6 sm:py-8 rounded-md border-2 w-full flex gap-4 items-center"
                            >
                                <span>{t("secondaryButton")}</span>
                                <Database />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section >
    );
}

