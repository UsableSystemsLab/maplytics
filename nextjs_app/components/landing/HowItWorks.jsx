"use client";

import { useTranslations } from "next-intl";
import { Plus, MessageSquare, LayoutDashboard } from "lucide-react";

const lucideIcons = [Plus, MessageSquare, LayoutDashboard];

const stepStyles = [
    { border: "border-[#134565]/20 hover:border-[#134565]/30", iconBg: "bg-[#134565]/10", iconColor: "#134565", text: "text-[#134565]/20", divider: "from-[#134565]" },
    { border: "border-[#A7B34F]/20 hover:border-[#A7B34F]/30", iconBg: "bg-[#A7B34F]/10", iconColor: "#A7B34F", text: "text-[#A7B34F]/20", divider: "from-[#A7B34F]" },
    { border: "border-[#13B38D]/20 hover:border-[#13B38D]/30", iconBg: "bg-[#13B38D]/10", iconColor: "#13B38D", text: "text-[#13B38D]/20", divider: "from-[#13B38D]" },
];

export default function HowItWorks() {
    const t = useTranslations("landing.howItWorks");
    const title = t("title");
    const description = t("description");
    const steps = t.raw("steps");

    return (
        <section className="bg-white py-24 px-4 relative">
            <div
                className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(19,69,101,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(19,69,101,0.04)_1px,transparent_1px)] bg-size-[40px_40px]"
            />

            <div className="container mx-auto max-w-6xl relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1a2a35] mb-4 leading-tight">
                        {title}
                    </h2>

                    <p className="text-base sm:text-lg text-body-text max-w-2xl mx-auto leading-relaxed">
                        {description}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {steps.map((step, idx) => {
                        const LucideIcon = lucideIcons[idx];
                        const style = stepStyles[idx];

                        const stairOffset = [
                            "mt-0",
                            "mt-0 lg:mt-6",
                            "mt-0 lg:mt-12"
                        ][idx];

                        return (
                            <div
                                key={idx}
                                className={`bg-[#FAFAFA] border-2 rounded-3xl p-8 flex flex-col gap-4 relative h- ${stairOffset} ${style.border}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`text-5xl font-black tracking-tighter leading-none ${style.text}`}>
                                        {step.number}
                                    </span>
                                    <div className={`rounded-2xl p-3 flex items-center justify-center ${style.iconBg}`}>
                                        <LucideIcon size={28} color={style.iconColor} strokeWidth={1.8} />
                                    </div>
                                </div>

                                <div className={`h-[2px] rounded-full bg-linear-to-r ${style.divider} to-transparent`} />

                                <h3 className="text-xl font-bold text-[#1a2a35] m-0 leading-snug">
                                    {step.title}
                                </h3>

                                <p className="text-[15px] text-body-text leading-relaxed m-0">
                                    {step.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
