import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function Footer() {
    const t = useTranslations('footer');

    return (
        <footer className="w-full bg-primary text-gray-300 py-12 px-6 md:px-12 mt-32">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
                <div className="col-span-1 md:col-span-2 flex flex-col gap-y-4">
                    <span className="text-2xl font-bold tracking-tight">{t('aboutTitle')}</span>
                    <p className="text-sm leading-relaxed max-w-sm opacity-80 mt-2">
                        {t('aboutDescription')}
                    </p>
                </div>
                <div className="flex flex-col gap-y-4">
                    <h3 className="text-base font-semibold tracking-wide">{t('quickLinks')}</h3>
                    <nav className="flex flex-col gap-y-3 text-sm mt-1">
                        <Link href="/datasets" className="hover:text-white transition-opacity duration-200 w-fit">{t('datasets')}</Link>
                        <Link href="/privacy" className="hover:text-white transition-opacity duration-200 w-fit">{t('privacyPolicy')}</Link>
                        <Link href="/terms" className="hover:text-white transition-opacity duration-200 w-fit">{t('termsOfService')}</Link>
                    </nav>
                </div>
                <div className="flex flex-col gap-y-4">
                    <h3 className="text-base font-semibold tracking-wide">{t('getStarted')}</h3>
                    <nav className="flex flex-col gap-y-3 text-sm mt-1">
                        <Link href="/dashboard/projects" className="hover:text-white transition-opacity duration-200 w-fit">{t('startNow')}</Link>
                        <Link href="/login" className="hover:text-white transition-opacity duration-200 w-fit">{t('login')}</Link>
                    </nav>
                </div>
            </div>
            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-primary-foreground/20 text-sm flex justify-center items-center opacity-70">
                <p>© {new Date().getFullYear()} {t('copyright')}</p>
            </div>
        </footer>
    );
}
