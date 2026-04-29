"use client";

import React from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useSelector } from "react-redux"
import { selectActiveProject } from "@/lib/store/features/projectSlice"
import { usePathname } from "next/navigation"
import ProjectRequired from "@/components/ProjectRequired"

export default function DashboardLayout({ children }) {
    const activeProject = useSelector(selectActiveProject);
    const pathname = usePathname() || "";

    // Normalize path to ignore locale and leading/trailing slashes
    const normalizedPath = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";

    // Define pages that are accessible without a project
    const isExempt =
        normalizedPath === '/dashboard' ||
        normalizedPath === '/dashboard/datasets' ||
        normalizedPath.startsWith('/dashboard/projects') ||
        normalizedPath.startsWith('/dashboard/createProject');

    const needsProject = normalizedPath.startsWith('/dashboard') && !isExempt;

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px] md:hidden">
                    <SidebarTrigger />
                    <div className="font-semibold truncate">
                        {activeProject?.name || "Maplytics"}
                    </div>
                </header>
                <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden relative">
                    {needsProject && !activeProject ? (
                        <ProjectRequired />
                    ) : (
                        children
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
