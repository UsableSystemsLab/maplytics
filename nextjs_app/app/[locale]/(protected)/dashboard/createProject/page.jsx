"use client";

import { useState } from "react";
import AddLayerModal from "@/components/AddLayerModal";
import PromptForm from "@/components/PromptForm";

export default function CreateProjectPage() {
    const [layerOn, setLayerOn] = useState(true);
    const [isAddModalOpen, setAddModalOpen] = useState(false);

    const [datasets, setDatasets] = useState([
        { id: 1, name: "Dataset #1", enabled: true },
        { id: 2, name: "Dataset #2", enabled: false },
        { id: 3, name: "Dataset #3", enabled: false },
    ]);

    const toggleDataset = (id) => {
        setDatasets(prev =>
            prev.map(ds =>
                ds.id === id ? { ...ds, enabled: !ds.enabled } : ds
            )
        );
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
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <h1 className="text-2xl font-semibold text-gray-900 mb-8">
                    Create Project
                </h1>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                                {datasets.map(dataset => (
                                    <div
                                        key={dataset.id}
                                        className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                                        <span className="text-sm font-medium text-gray-900">
                                            {dataset.name}
                                        </span>

                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={dataset.enabled}
                                                onChange={() => toggleDataset(dataset.id)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ocean-blue"></div>
                                            <span className="ml-3 text-sm font-medium text-gray-700">
                                                {dataset.enabled ? "On" : "Off"}
                                            </span>
                                        </label>
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
                    <div className="p-6 border-t border-gray-100 w-full">
                        <div className="flex items-center justify-between">
                            <PromptForm />
                        </div>
                    </div>
                </div>
            </div>

            <AddLayerModal
                isOpen={isAddModalOpen}
                onClose={() => setAddModalOpen(false)}
                onSave={handleAddDataset}
            />
        </div>
    );
}