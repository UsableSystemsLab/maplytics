"use client";

import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicDatasetBrowser from '@/components/PublicDatasetBrowser';
import { useTranslations } from 'next-intl';

export default function PublicDatasetPage() {
    const t = useTranslations("datasets");
    
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header variant="light" />
            <main className="flex-1 w-full pt-20">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                        <p className="text-gray-500 mt-1">{t('description')}</p>
                    </div>
                    <PublicDatasetBrowser />
                </div>
            </main>
            <Footer />
        </div>
    );
}
