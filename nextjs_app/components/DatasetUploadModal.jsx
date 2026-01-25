"use client";
import { useState, useEffect } from "react";
import { X, Upload, Loader2 } from "lucide-react";

/**
 * DatasetUploadModal - Reusable modal for dataset upload with metadata
 * 
 * Provides a form for collecting dataset name and entity type before upload.
 * Handles duplicate detection with override confirmation.
 */

const ENTITY_TYPES = [
    { value: "restaurant", label: "Restaurant" },
    { value: "school", label: "School" },
    { value: "hospital", label: "Hospital" },
    { value: "retail", label: "Retail Store" },
    { value: "office", label: "Office" },
    { value: "generic", label: "Other / Generic" }
];

export default function DatasetUploadModal({
    isOpen,
    onClose,
    onSubmit,
    fileName = "",
    defaultDatasetName = "",
    defaultEntityType = "restaurant",
    isLoading = false,
    error = null
}) {
    const [datasetName, setDatasetName] = useState(defaultDatasetName);
    const [entityType, setEntityType] = useState(defaultEntityType);

    useEffect(() => {
        if (isOpen) {
            setDatasetName(defaultDatasetName);
            setEntityType(defaultEntityType);
        }
    }, [isOpen, defaultDatasetName, defaultEntityType]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!datasetName.trim()) return;
        onSubmit(datasetName.trim(), entityType, false);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* semi-transparent overlay */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-primary px-6 py-4 rounded-t-2xl flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-white">Upload Dataset</h2>
                            {fileName && (
                                <p className="text-white/80 text-sm mt-1">{fileName}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Dataset Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Dataset Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={datasetName}
                                onChange={(e) => setDatasetName(e.target.value)}
                                placeholder="e.g., Riyadh Restaurants"
                                required
                                disabled={isLoading}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3580] focus:border-transparent outline-none transition-all disabled:bg-gray-100"
                            />
                        </div>

                        {/* Entity Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Entity Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={entityType}
                                onChange={(e) => setEntityType(e.target.value)}
                                disabled={isLoading}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3580] focus:border-transparent outline-none transition-all disabled:bg-gray-100"
                            >
                                {ENTITY_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!datasetName.trim() || isLoading}
                                className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Upload Dataset
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
