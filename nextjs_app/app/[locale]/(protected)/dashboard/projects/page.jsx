"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import * as projectApi from "@/lib/api/projectApi";
import {
    FolderKanban,
    Plus,
    Trash2,
    Calendar,
    Users,
    ExternalLink,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProjectsPage() {
    const { user } = useAuth();
    const confirm = useConfirm();
    const router = useRouter();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const loadProjects = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await projectApi.getProjects();
            setProjects(data);
        } catch (error) {
            console.error("Error loading projects:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
    }, [user]);

    const handleSelectProject = (project) => {
        const projectData = {
            id: project.id,
            name: project.name
        };
        localStorage.setItem("current_project", JSON.stringify(projectData));
        localStorage.removeItem("current_project_id");
        window.dispatchEvent(new Event("projectChanged"));
        router.push("/dashboard");
    };

    const handleDeleteProject = async (e, project) => {
        e.stopPropagation();
        const ok = await confirm({
            variant: "danger",
            title: "Delete project?",
            description: "This action cannot be undone. All datasets and layers in this project will be permanently removed.",
            itemName: project.name,
            confirmLabel: "Delete project",
            onConfirm: () => projectApi.deleteProject(project.id),
        });
        if (ok) loadProjects();
    };

    const filteredProjects = projects.filter(p =>
        (p.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Projects</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your workspaces and organize your datasets.
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-xs">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="text-xs text-muted-foreground ml-auto">
                    Showing {filteredProjects.length} of {projects.length} projects
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse h-48 bg-gray-50 border-dashed" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create Card - ALWAYS FIRST */}
                    <Link href="/dashboard/createProject" className="block order-first">
                        <Card className="h-full border-2 border-dashed border-gray-200 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center p-8 gap-4 text-center group min-h-[220px]">
                            <div className="size-14 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-primary transition-colors shadow-sm">
                                <Plus className="w-8 h-8" />
                            </div>
                            <div>
                                <div className="font-bold text-lg text-gray-900">Create New Project</div>
                                <p className="text-sm text-muted-foreground mt-1">Start a new workspace from scratch</p>
                            </div>
                        </Card>
                    </Link>

                    {/* Project Cards */}
                    {filteredProjects.map((project) => (
                        <Card
                            key={project.id}
                            className="group relative hover:border-primary/50 hover:shadow-md transition-all cursor-pointer overflow-hidden border-2 border-transparent bg-white"
                            onClick={() => handleSelectProject(project)}
                        >
                            <CardHeader className="pb-3 px-6 pt-6">
                                <div className="flex items-start justify-between">
                                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                        <FolderKanban className="w-6 h-6" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive transition-opacity"
                                        onClick={(e) => handleDeleteProject(e, project)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="mt-4">
                                    <CardTitle className="text-xl font-bold line-clamp-1">{project.name}</CardTitle>
                                    <CardDescription className="line-clamp-2 mt-1 min-h-[40px]">
                                        {project.description || "No description provided for this project."}
                                    </CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="px-6 pb-4">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : "N/A"}
                                    </div>
                                </div>
                            </CardContent>
                            <div className="absolute top-0 right-0 p-4 transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                                <ExternalLink className="w-4 h-4 text-primary" />
                            </div>
                        </Card>
                    ))}

                    {/* Empty State if no search results (but create card still shows) */}
                    {filteredProjects.length === 0 && searchQuery && (
                        <div className="col-span-full text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
                            <div className="size-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">No projects found</h3>
                            <p className="text-muted-foreground">Try adjusting your search query.</p>
                            <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2 text-primary">Clear search</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
