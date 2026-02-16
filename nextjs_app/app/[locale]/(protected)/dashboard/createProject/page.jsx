"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AddLayerModal from "@/components/AddLayerModal";
import PromptForm from "@/components/PromptForm";
import SideBar from '@/components/sidebar';

export default function CreateProjectPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [layerOn, setLayerOn] = useState(true);
    const [isAddModalOpen, setAddModalOpen] = useState(false);

    const [projectName, setProjectName] = useState("");
    const [projectId] = useState(() => typeof crypto !== 'undefined' ? crypto.randomUUID() : `project-${Date.now()}`);

    const [datasets, setDatasets] = useState([]);

    const handleCreateProject = async () => {
        if (!projectName.trim()) {
            alert("Please enter a project name");
            return;
        }

        try {
            const response = await fetch('http://localhost:4000/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SERVER_KEY}`,
                    'X-User-Id': user?.uid || 'anonymous'
                },
                body: JSON.stringify({
                    id: projectId,
                    name: projectName,
                    datasets: datasets.map(d => ({
                        name: d.name,
                        filename: d.content.uploadedFileName,
                        size: d.content.fileSize,
                        originalName: d.content.file?.name,
                        type: d.content.isPrivate ? 'private' : 'public',
                        ...(d.content.isPrivate ? {} : { userId: user?.uid })
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create project');
            }

            localStorage.setItem('current_project', JSON.stringify({ id: projectId, name: projectName }));
            localStorage.removeItem('current_project_id');

            window.dispatchEvent(new Event('projectChanged'));

            window.location.href = '/dashboard';

        } catch (error) {
            console.error('Error creating project:', error);
            alert("Failed to create project");
        }
    };

    const handleAddDataset = (data) => {
        const nextId = datasets.length + 1;
        setDatasets(prev => [
            ...prev,
            {
                id: nextId,
                name: data.name || `Dataset #${nextId}`,
                enabled: true,
                content: data
            }
        ]);
        setAddModalOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <SideBar
                name="History" href2="/" />

            <div className="flex-1 flex flex-col items-center px-6 py-8">

                <h1 className="text-2xl font-semibold text-gray-900 mb-8">
                    Create New Project
                </h1>

                <div className="w-full max-w-3xl mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Project Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="e.g., Urban Analysis 2024"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3580] focus:border-transparent outline-none transition-all"
                    />
                </div>

                <div className="w-full max-w-3xl mb-6">
                    <PromptForm />
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden w-full max-w-3xl">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900">Layer</h2>

                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="layer"
                                        checked={layerOn}
                                        onChange={() => setLayerOn(true)}
                                        className="w-4 h-4"
                                        style={{ accentColor: '#134565' }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">On</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="layer"
                                        checked={!layerOn}
                                        onChange={() => setLayerOn(false)}
                                        className="w-4 h-4"
                                        style={{ accentColor: '#134565' }}
                                    />
                                    <span className="text-sm font-medium text-gray-700">Off</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {layerOn && (
                        <div className="p-6">
                            <h3 className="text-base font-semibold text-gray-900 mb-4">
                                Datasets
                            </h3>

                            <div className="space-y-2 mb-4">
                                {datasets.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">No datasets added yet.</p>
                                )}
                                {datasets.map(dataset => (
                                    <div
                                        key={dataset.id}
                                        className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                                        <span className="text-sm font-medium text-gray-900">
                                            {dataset.name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {dataset.enabled ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => setAddModalOpen(true)}
                                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-lg transition-colors">
                                + Add Dataset
                            </button>
                        </div>
                    )}

                    <div className="p-6 border-t border-gray-100 w-full flex justify-end">
                        <button
                            onClick={handleCreateProject}
                            disabled={!projectName.trim()}
                            className="py-3 px-8 bg-primary text-white font-semibold rounded-lg hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:hover:scale-100">
                            Create Project
                        </button>
                    </div>
                </div>
            </div>

            <AddLayerModal
                isOpen={isAddModalOpen}
                onClose={() => setAddModalOpen(false)}
                onSave={handleAddDataset}
                projectId={projectId}
            />
        </div>
    );
}