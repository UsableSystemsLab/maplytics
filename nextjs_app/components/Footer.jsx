import { useTranslations } from 'next-intl';

export default function Footer() {
    const t = useTranslations('footer');

    return (
        <footer className="w-full py-8 mt-32 flex flex-col items-center bg-white shadow-lg">
            <p className="text-gray-600 text-lg">© {new Date().getFullYear()} {t('copyright')}</p>
            <div className="mt-4 flex space-x-6">
                <a href="/privacy" className="text-gray-600 hover:text-gray-800 transition-colors duration-300">{t('privacyPolicy')}</a>
                <a href="/terms" className="text-gray-600 hover:text-gray-800 transition-colors duration-300">{t('termsOfService')}</a>
                <a href="/contact" className="text-gray-600 hover:text-gray-800 transition-colors duration-300">{t('contactUs')}</a>
            </div>
        </footer>
    )
}
