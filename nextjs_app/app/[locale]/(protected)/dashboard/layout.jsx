"use client";

import React from 'react'
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
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
                <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
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
