import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DatasetBrowser from '@/components/DatasetBrowser';

export default function PublicDatasetPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header variant="light" />
            <main className="flex-1 w-full pt-20">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <DatasetBrowser />
                </div>
            </main>
            <Footer />
        </div>
    );
}
