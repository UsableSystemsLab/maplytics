"use client";
import { useState, useEffect } from "react";
import { X, Upload, Layers, MapPin, Square, Flame, Map } from "lucide-react";

export default function AddLayerModal({ isOpen, onClose, onSave, initialData = null }) {
    const [formData, setFormData] = useState({
        name: "",
        dataSource: "",
        sourceType: "upload",
        layerType: "point",
        file: null
    });

    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: "",
                dataSource: "",
                sourceType: "upload",
                layerType: "point",
                file: null
            });
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
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
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
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
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
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3580] focus:border-transparent outline-none transition-all"
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
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${formData.sourceType === "upload"
                                        ? "bg-primary text-white shadow-md"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    Upload File
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange("sourceType", "url")}
                                    className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${formData.sourceType === "url"
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
                                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${isDragging
                                        ? "border-[#2C3580] bg-blue-50"
                                        : "border-gray-300 hover:border-[#2C3580] hover:bg-gray-50"
                                        }`}
                                    onClick={() => document.getElementById("fileInput").click()}
                                >
                                    <input
                                        id="fileInput"
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".geojson,.json,.csv,.kml,.shp"
                                        className="hidden"
                                    />
                                    <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? "text-[#2C3580]" : "text-gray-400"}`} />
                                    <p className="text-sm font-medium text-gray-700 mb-1">
                                        {formData.file ? formData.file.name : "Drop file here or click to upload"}
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
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2C3580] focus:border-transparent outline-none transition-all"
                                />
                            )}
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
                                            className={`p-4 rounded-lg border-2 transition-all text-left ${formData.layerType === type.value
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
                                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!formData.name || !formData.dataSource}
                                className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Layer
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
