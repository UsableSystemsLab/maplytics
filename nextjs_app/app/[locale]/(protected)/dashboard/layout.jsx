"use client";

import React from 'react'
import SideBar from '@/components/sidebar';
import DashboardHeader from '@/components/DashboardHeader';

export default function layout({ children }) {
    return (
        <div className="flex h-screen bg-gray-50">
            <SideBar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <DashboardHeader
                    pageTitle="Dashboard Overview"
                    breadcrumbs={["Dashboard", "Overview"]} />
                {children}
            </div>

        </div>
    )
}
