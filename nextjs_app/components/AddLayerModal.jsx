"use client";
import { useState, useEffect } from "react";
import { X, Upload, Layers, MapPin, Square, Flame, Map } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function AddLayerModal({ isOpen, onClose, onSave, initialData = null, projectId = null }) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: "",
        dataSource: "",
        sourceType: "upload",
        layerType: "point",
        isPrivate: false,
        file: null
    });

    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: "",
                dataSource: "",
                sourceType: "upload",
                layerType: "point",
                isPrivate: false,
                file: null
            });
        }
        setUploadError(null);
    }, [initialData, isOpen]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                file: file,
                dataSource: file.name
            }));
            setUploadError(null);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                file: file,
                dataSource: file.name
            }));
            setUploadError(null);
        }
    };

    const uploadFileToBackend = async (file, isPrivate, layerName) => {
        if (!user) {
            throw new Error('User not authenticated');
        }

        const formDataToSend = new FormData();
        formDataToSend.append('file', file);
        if (layerName) {
            formDataToSend.append('name', layerName);
        }

        let endpoint;
        if (isPrivate) {
            if (!projectId) {
                throw new Error('Project ID is required for private uploads');
            }
            endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/upload/private?projectId=${projectId}`;
        } else {
            endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/upload/public${projectId ? `?projectId=${projectId}` : ''}`;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'X-User-Id': user.uid,
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_SERVER_KEY}`,
            },
            body: formDataToSend,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Upload failed');
        }

        return await response.json();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploadError(null);

        try {
            let finalFormData = { ...formData };

            // If source type is upload and we have a file, upload it first
            if (formData.sourceType === "upload" && formData.file) {
                setUploading(true);
                const uploadResult = await uploadFileToBackend(formData.file, formData.isPrivate, formData.name);

                // Update form data with the uploaded file URL
                finalFormData.dataSource = uploadResult.url;
                finalFormData.uploadedFileName = uploadResult.filename;
                finalFormData.fileSize = uploadResult.size;
            }

            onSave(finalFormData);
            onClose();
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error.message);
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    const layerTypes = [
        { value: "point", label: "Point", icon: MapPin, desc: "Individual markers" },
        { value: "polygon", label: "Polygon", icon: Square, desc: "Area boundaries" },
        { value: "heatmap", label: "Heatmap", icon: Flame, desc: "Density visualization" },
        { value: "route", label: "Route", icon: Map, desc: "Line paths" }
    ];

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                onClick={onClose}
            ></div>

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto animate-scaleIn overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-primary px-6 py-5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Layers className="w-6 h-6 text-white" />
                            <h2 className="text-2xl font-bold text-white">
                                {initialData ? "Edit Layer" : "Add New Layer"}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                            disabled={uploading}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {uploadError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                <p className="text-sm font-medium">Upload Error: {uploadError}</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Layer Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                                placeholder="e.g., Population Density 2024"
                                required
                                disabled={uploading}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3580] focus:border-transparent outline-none transition-all disabled:bg-gray-100"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Data Source <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3 mb-3">
                                <button
                                    type="button"
                                    onClick={() => handleChange("sourceType", "upload")}
                                    disabled={uploading}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all disabled:opacity-50 ${formData.sourceType === "upload"
                                        ? "bg-primary text-white shadow-md"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Upload File
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange("sourceType", "url")}
                                    disabled={uploading}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all disabled:opacity-50 ${formData.sourceType === "url"
                                        ? "bg-primary text-white shadow-md"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    URL/API
                                </button>
                            </div>

                            {formData.sourceType === "upload" ? (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${uploading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                                        } ${isDragging
                                            ? "border-[#2C3580] bg-blue-50"
                                            : "border-gray-300 hover:border-[#2C3580] hover:bg-gray-50"
                                        }`}
                                    onClick={() => !uploading && document.getElementById("fileInput").click()}
                                >
                                    <input
                                        id="fileInput"
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".geojson,.json,.csv,.kml,.shp"
                                        disabled={uploading}
                                        className="hidden"
                                    />
                                    <Upload className={`w-12 h-12 mx-auto mb-3 ${uploading ? "text-gray-300" : isDragging ? "text-[#2C3580]" : "text-gray-400"
                                        }`} />
                                    <p className="text-sm font-medium text-gray-700 mb-1">
                                        {uploading
                                            ? "Uploading..."
                                            : formData.file
                                                ? formData.file.name
                                                : "Drop file here or click to upload"
                                        }
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Supports GeoJSON, CSV, KML, Shapefile
                                    </p>
                                </div>
                            ) : (
                                <input
                                    type="url"
                                    value={formData.dataSource}
                                    onChange={(e) => handleChange("dataSource", e.target.value)}
                                    placeholder="https://example.com/api/data.geojson"
                                    disabled={uploading}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3580] focus:border-transparent outline-none transition-all disabled:bg-gray-100"
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Privacy <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-3 mb-4">
                                <button
                                    type="button"
                                    onClick={() => handleChange("isPrivate", false)}
                                    disabled={uploading}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all disabled:opacity-50 ${!formData.isPrivate
                                        ? "bg-primary text-white shadow-md"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Public Dataset
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange("isPrivate", true)}
                                    disabled={uploading}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all disabled:opacity-50 ${formData.isPrivate
                                        ? "bg-primary text-white shadow-md"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Private Dataset
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3">
                                Layer Type <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {layerTypes.map((type) => {
                                    const Icon = type.icon;
                                    return (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => handleChange("layerType", type.value)}
                                            disabled={uploading}
                                            className={`p-4 rounded-lg border-2 transition-all text-left disabled:opacity-50 ${formData.layerType === type.value
                                                ? "border-[#2C3580] bg-blue-50 shadow-md"
                                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <Icon
                                                    className={`w-5 h-5 ${formData.layerType === type.value
                                                        ? "text-primary"
                                                        : "text-gray-500"
                                                        }`}
                                                />
                                                <span
                                                    className={`font-semibold ${formData.layerType === type.value
                                                        ? "text-[#2C3580]"
                                                        : "text-gray-700"
                                                        }`}
                                                >
                                                    {type.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">{type.desc}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={uploading}
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!formData.name || !formData.dataSource || uploading}
                                className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {uploading ? "Uploading..." : "Save Layer"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}