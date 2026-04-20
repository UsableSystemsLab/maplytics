"use client";

import React from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

export default function layout({ children }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

