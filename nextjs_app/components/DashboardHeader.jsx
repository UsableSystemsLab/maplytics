"use client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import {
    Bell,
    ChevronDown,
    Settings,
    User,
    LogOut,
    HelpCircle
} from "lucide-react";

export default function DashboardHeader({ pageTitle = "Dashboard Overview", breadcrumbs = [] }) {
    const { user } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [notifications] = useState(3);

    const projects = [
        { id: 1, name: "Urban Planning Analysis" },
        { id: 2, name: "Climate Change Study" },
        { id: 3, name: "Transportation Network" },
    ];
    const [currentProject, setCurrentProject] = useState(projects[0]);

    return (
        <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
            <div className="flex items-center justify-between h-16 px-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold text-gray-900">{pageTitle}</h1>

                    {breadcrumbs.length > 0 && (
                        <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                            {breadcrumbs.map((crumb, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <span className="text-gray-400">/</span>
                                    <span className={index === breadcrumbs.length - 1 ? "text-gray-900 font-medium" : ""}>
                                        {crumb}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="hidden lg:flex items-center relative">
                    <button
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                        <span className="text-sm font-medium text-gray-700">{currentProject.name}</span>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>

                    {showProjectDropdown && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowProjectDropdown(false)}
                            ></div>
                            <div className="absolute top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                                {projects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => {
                                            setCurrentProject(project);
                                            setShowProjectDropdown(false);
                                        }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${currentProject.id === project.id
                                            ? "bg-primary text-white"
                                            : "text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        {project.name}
                                    </button>
                                ))}
                                <div className="border-t border-gray-200 mt-2 pt-2">
                                    <button className="w-full text-left px-4 py-2.5 text-sm text-cyan hover:bg-gray-50 font-medium">
                                        + Create New Project
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="">

                </div>
            </div>
        </header>
    );
}
