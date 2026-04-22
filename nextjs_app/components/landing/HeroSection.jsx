'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

export default function HeroSection({
    namespace = 'landing.hero',
    richTags,
    background,
    children,
    onScrollDown,
    showScrollIndicator = false,
    heightClass = 'h-screen',
}) {
    const t = useTranslations(namespace);

    const title = richTags ? t.rich('title', richTags) : t('title');

    return (
        <section
            className={`relative w-screen ${heightClass} flex items-center justify-center px-6 sm:px-10 bg-[#262626]`}
        >
            {background}

            <div className="absolute inset-0 bg-black/30 z-10" />

            <div className="relative z-20 text-center max-w-5xl mx-auto">
                <h1 className="
                    text-2xl sm:text-4xl lg:text-6xl rtl:lg:text-7xl
                    font-bold leading-12 md:leading-24 rtl:lg:leading-32 text-white capitalize
                ">
                    {title}
                </h1>

                <p className="mt-6 text-sm md:text-lg text-gray-300 font-medium mx-auto">
                    {t('description')}
                </p>

                {children && <div className="mt-8 w-full">{children}</div>}
            </div>

            {showScrollIndicator && (
                <div className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-30">
                    <button
                        onClick={onScrollDown}
                        className="flex flex-col items-center text-white/80 hover:text-white transition"
                    >
                        <span className="text-xs sm:text-sm mb-1 tracking-wide">{t('scroll')}</span>
                        <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 animate-bounce" />
                    </button>
                </div>
            )}
        </section>
    );
}
