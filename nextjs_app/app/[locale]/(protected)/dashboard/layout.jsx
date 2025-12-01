"use client";

import React from 'react'
import DashboardHeader from '@/components/DashboardHeader';

export default function layout({ children }) {
    return (
        <div className="flex h-screen bg-gray-50">
            <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden">
                <DashboardHeader
                    pageTitle="Dashboard Overview"
                    breadcrumbs={["Dashboard", "Overview"]} />
                {children}
            </div>

        </div>
    )
}
