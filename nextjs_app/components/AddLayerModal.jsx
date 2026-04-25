"use client";
import { useState, useEffect } from "react";
import { X, Upload, Layers, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/lib/uploadApi";
import { getDatasetGeoJSON } from "@/lib/datasetApi";
import { getFilterPrefs, putDefaultFilterFields } from "@/lib/filterPrefsApi";

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

    const [step, setStep] = useState(1);
    const [uploadedDatasetId, setUploadedDatasetId] = useState(null);
    const [inferredFields, setInferredFields] = useState([]);
    const [selectedFilterFields, setSelectedFilterFields] = useState(new Set());
    const [fieldsLoading, setFieldsLoading] = useState(false);

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
        setStep(initialData?.id ? 2 : 1);
        setUploadedDatasetId(initialData?.id ?? null);
        setInferredFields([]);
        setSelectedFilterFields(new Set());

        if (initialData?.id && isOpen) {
            setFieldsLoading(true);
            Promise.all([
                getDatasetGeoJSON(initialData.id),
                getFilterPrefs(initialData.id).catch(() => ({ filterableFields: null, source: 'none' })),
            ])
                .then(([gj, prefs]) => {
                    const fields = gj?.fields || [];
                    setInferredFields(fields);
                    if (prefs.source === 'default' && Array.isArray(prefs.filterableFields)) {
                        setSelectedFilterFields(new Set(prefs.filterableFields));
                    } else {
                        setSelectedFilterFields(new Set(fields.map(f => f.name)));
                    }
                })
                .catch(err => console.error('Failed to load fields for edit mode:', err))
                .finally(() => setFieldsLoading(false));
        }
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

        return await uploadFile({
            file,
            isPrivate,
            projectId,
            layerName
        });
    };

    const handleStepOneSubmit = async (e) => {
        e.preventDefault();
        setUploadError(null);

        try {
            let finalFormData = { ...formData };
            let uploadedId = null;

            if (formData.sourceType === "upload" && formData.file) {
                setUploading(true);
                const uploadResult = await uploadFileToBackend(formData.file, formData.isPrivate, formData.name);
                finalFormData.dataSource = uploadResult.url;
                finalFormData.uploadedFileName = uploadResult.filename;
                finalFormData.fileSize = uploadResult.size;
                uploadedId = uploadResult.id || null;
            }

            if (uploadedId) {
                setUploadedDatasetId(uploadedId);
                setFieldsLoading(true);
                try {
                    const gj = await getDatasetGeoJSON(uploadedId);
                    const fields = gj?.fields || [];
                    setInferredFields(fields);
                    setSelectedFilterFields(new Set(fields.map(f => f.name)));
                } finally {
                    setFieldsLoading(false);
                }
                setFormData(finalFormData);
                setStep(2);
            } else {
                // No upload (URL mode, no file) — fall through to save without step 2.
                onSave(finalFormData);
                onClose();
            }
        } catch (error) {
            console.error('Upload error:', error);
            setUploadError(error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSaveFilterDefaults = async () => {
        if (!uploadedDatasetId) {
            onSave(formData);
            onClose();
            return;
        }
        const ordered = inferredFields.map(f => f.name).filter(n => selectedFilterFields.has(n));
        try {
            await putDefaultFilterFields(uploadedDatasetId, ordered);
            window.dispatchEvent(new CustomEvent('filterPrefsChanged', {
                detail: { datasetId: uploadedDatasetId, filterableFields: ordered },
            }));
        } catch (err) {
            console.warn('Failed to save default filter fields:', err);
        }
        onSave({ ...formData, datasetId: uploadedDatasetId });
        onClose();
    };

    const handleSkipFilterDefaults = () => {
        onSave({ ...formData, datasetId: uploadedDatasetId });
        onClose();
    };

    const toggleField = (name) => {
        setSelectedFilterFields(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    };

    if (!isOpen) return null;

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

                    {step === 1 && (
                    <form onSubmit={handleStepOneSubmit} className="p-6 space-y-5">
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
                                {uploading ? "Uploading..." : "Continue"}
                            </button>
                        </div>
                    </form>
                    )}

                    {step === 2 && (
                        <div className="p-6 space-y-5">
                            <div>
                                <h3 className="text-base font-semibold text-gray-800">Choose filterable fields</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    These are the fields users will be able to filter by on the map.
                                    You can change this later from the filter-settings icon on the layer.
                                </p>
                            </div>

                            {fieldsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                </div>
                            ) : inferredFields.length === 0 ? (
                                <p className="text-sm text-gray-500">No fields detected in this dataset.</p>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFilterFields(new Set(inferredFields.map(f => f.name)))}
                                            className="text-primary hover:underline"
                                        >
                                            Select all
                                        </button>
                                        <span className="text-gray-300">·</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFilterFields(new Set())}
                                            className="text-primary hover:underline"
                                        >
                                            Select none
                                        </button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                                        {inferredFields.map(f => (
                                            <label key={f.name} className="flex items-center gap-2 text-sm px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFilterFields.has(f.name)}
                                                    onChange={() => toggleField(f.name)}
                                                />
                                                <span className="flex-1 truncate">{f.name}</span>
                                                <span className="text-[10px] uppercase tracking-wide text-gray-400">{f.type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleSkipFilterDefaults}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                >
                                    Skip
                                </button>
                                <div className="flex-1" />
                                <button
                                    type="button"
                                    onClick={handleSaveFilterDefaults}
                                    disabled={fieldsLoading}
                                    className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}