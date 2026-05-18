"use client";

import React, { useState } from 'react';
import PublicDatasetBrowser from '@/components/PublicDatasetBrowser';
import MyDatasetBrowser from '@/components/MyDatasetBrowser';
import { useTranslations } from 'next-intl';

export default function DashboardDatasetsPage() {
    const t = useTranslations("datasets");
    const [activeTab, setActiveTab] = useState('project');

    return (
        <div className="flex flex-col w-full h-full p-6">
            <div className="max-w-7xl mx-auto w-full">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                    <p className="text-gray-500 mt-1">{t('description')}</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-lg w-full max-w-sm mb-6">
                    <button
                        onClick={() => setActiveTab('project')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'project'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {t('privateTab')}
                    </button>
                    <button
                        onClick={() => setActiveTab('public')}
                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition-all ${activeTab === 'public'
                                ? 'bg-cyan text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                    >
                        {t('publicTab')}
                    </button>
                </div>

                {activeTab === 'public' ? <PublicDatasetBrowser /> : <MyDatasetBrowser />}
            </div>
        </div>
    );
}
