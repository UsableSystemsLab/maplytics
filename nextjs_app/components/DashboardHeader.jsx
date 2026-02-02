"use client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    const router = useRouter();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [notifications] = useState(3);

    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState({ name: "Select Project" });

    useEffect(() => {
        fetchProjects();
        // Load current project from local storage
        const savedProject = localStorage.getItem('current_project');
        if (savedProject) {
            setCurrentProject(JSON.parse(savedProject));
        }
    }, [user]);

    const fetchProjects = async () => {
        if (!user) return; // Don't fetch if no user
        try {
            const response = await fetch('http://localhost:4000/api/projects', {
                headers: {
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SERVER_KEY}`,
                    'X-User-Id': user.uid
                }
            });
            if (response.ok) {
                const data = await response.json();
                setProjects(data);
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    };

    const handleProjectSelect = (project) => {
        setCurrentProject(project);
        localStorage.setItem('current_project', JSON.stringify(project));
        // Remove legacy ID if present
        localStorage.removeItem('current_project_id');

        // Notify other components (Sidebar)
        window.dispatchEvent(new Event('projectChanged'));

        setShowProjectDropdown(false);
        // Link to project page (Overview)
        router.push('/dashboard');
    };

    const handleDeleteProject = async (e, projectId) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            try {
                const response = await fetch(`http://localhost:4000/api/projects/${projectId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SERVER_KEY}`,
                        'X-User-Id': user?.uid || 'anonymous'
                    }
                });

                if (response.ok) {
                    // Refresh projects
                    fetchProjects();
                    // If deleted project was current, clear it
                    if (currentProject.id === projectId) {
                        setCurrentProject({ name: "Select Project" });
                        localStorage.removeItem('current_project');
                        window.dispatchEvent(new Event('projectChanged'));
                    }
                }
            } catch (error) {
                console.error('Error deleting project:', error);
            }
        }
    };

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
                                {projects.length > 0 ? (
                                    projects.map((project) => (
                                        <div key={project.id} className="flex items-center justify-between hover:bg-gray-50 pr-2">
                                            <button
                                                onClick={() => handleProjectSelect(project)}
                                                className={`flex-1 text-left px-4 py-2.5 text-sm transition-colors ${currentProject.id === project.id
                                                    ? "bg-primary text-white hover:bg-primary" // Keep selected style even on hover
                                                    : "text-gray-700"
                                                    }`}
                                            >
                                                {project.name}
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteProject(e, project.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <LogOut className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-500 text-center">No projects found</div>
                                )}

                                <div className="border-t border-gray-200 mt-2 pt-2">
                                    <Link href="/dashboard/createProject">
                                        <button className="w-full text-left px-4 py-2.5 text-sm text-cyan hover:bg-gray-50 font-medium">
                                            + Create New Project
                                        </button>
                                    </Link>
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
