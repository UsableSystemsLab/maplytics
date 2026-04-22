"use client";
import { useTranslations } from "next-intl";

export default function StatsStrip({ namespace }) {
    const t = useTranslations(namespace);
    const title = t("title");
    const items = t.raw("items");

    return (
        <section className="relative w-full bg-primary text-white py-20 px-4 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[22px_22px] pointer-events-none" />

            <div className="relative z-10 container mx-auto max-w-6xl">
                {title && (
                    <h2 className="text-center text-2xl md:text-3xl font-bold mb-12 text-white/90">
                        {title}
                    </h2>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
                    {items.map((item, idx) => (
                        <div key={idx} className="text-center">
                            <div className="text-4xl md:text-6xl font-extrabold bg-gradient-to-br from-earthy-green to-cyan bg-clip-text text-transparent leading-none">
                                {item.value}
                            </div>
                            <div className="mt-3 text-sm md:text-base text-white/70 uppercase tracking-wider">
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
