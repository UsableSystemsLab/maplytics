'use client';
import Link from 'next/link';
import { Button } from './ui/button';
import { useTranslations } from 'next-intl';

export default function HeroSection() {
    const t = useTranslations('landing.hero');

    return (
        <section className="ml-96 mr-56 mb-32 mt-32 max-w-full relative">
            <div className="content relative z-10 max-w-4xl">
                <h1 className="text-7xl font-bold w-5xl leading-snug text-heading">
                    {t.rich('title', {
                        geo: (chunks) => <span className="text-earthy-green">{chunks}</span>,
                        into: (chunks) => <span className="text-dark-blue">{chunks}</span>,
                    })}
                </h1>

                <p className="text-2xl mt-8 text-body-text font-bold max-w-[840px]">
                    {t.rich('description', {
                        visualize: (chunks) => <span className="text-primary">{chunks}</span>,
                        make: (chunks) => <span className="text-earthy-green">{chunks}</span>,
                        data: (chunks) => <span className="text-primary">{chunks}</span>,
                    })}
                </p>

                <div className="buttons mt-8 flex flex-col gap-4 max-w-lg">
                    <Link href="/dashboard/createProject">
                        <Button className="bg-ocean-blue text-white text-[31px] font-semibold px-6 py-3 rounded-md w-[525px] h-20">
                            {t('getStarted')}
                        </Button>
                    </Link>

                    <Link href="/dashboard">
                        <Button className="bg-primary text-white text-[31px] font-bold px-6 py-3 rounded-md w-[525px] h-20">
                            {t('continue')}
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="image absolute top-96 -translate-y-1/2 translate-x-1/4 z-0 rtl:-left-120 rtl:-translate-x-1/4 ltr:-right-120">
                <img
                    src="/Earth.png"
                    alt="Earth image"
                    className="w-[1000px] h-auto animate-[spin_60s_linear_infinite]"
                />
            </div>
        </section>
    );
}