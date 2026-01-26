"use client";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useState } from "react";
import {
    LayoutDashboard,
    Map,
    BarChart3,
    User,
    Users,
    Settings,
    Plus,
    Loader2,
} from "lucide-react";
import AddLayerModal from "./AddLayerModal";
import { ingestDatasetFromFile } from "@/lib/datasetApi";

export default function SideBar(props) {
    const { user, loading } = useAuth();
    const [activeNav, setActiveNav] = useState("overview");
    const [layers, setLayers] = useState([
        { id: 1, name: "Population Density", visible: true },
        { id: 2, name: "Road Network", visible: true },
        { id: 3, name: "Land Usage", visible: false },
    ]);
    const [draggedItem, setDraggedItem] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const navItems = [
        { id: props.name1, label: props.name1, icon: LayoutDashboard, href: props.href1 },
        { id: props.name2, label: props.name2, icon: Map, href: props.href2 },
        { id: props.name3, label: props.name3, icon: BarChart3, href: props.href3 },
    ];

    const pageItems = [
        { id: "account", label: "Account", icon: User, href: "/account" },
        { id: "team", label: "Team", icon: Users, href: "/team" },
        { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
    ];

    const handleSaveLayer = async (layerData, forceOverride = false) => {
        if (layerData.file) {
            setIsUploading(true);
            setUploadError(null);

            try {
                const result = await ingestDatasetFromFile(
                    layerData.file,
                    layerData.name,
                    layerData.layerType === 'point' ? 'generic' : layerData.layerType,
                    forceOverride
                );

                const newLayer = {
                    id: result.dataset_id,
                    name: layerData.name,
                    type: layerData.layerType,
                    source: layerData.dataSource,
                    featureCount: result.feature_count,
                    visible: true
                };
                setLayers([...layers, newLayer]);
            } catch (error) {
                console.error('Failed to upload dataset:', error);

                if (error.isConflict) {
                    const confirmReplace = window.confirm(
                        `A dataset named "${layerData.name}" already exists.\n\n` +
                        `Do you want to replace it with the new data?`
                    );

                    if (confirmReplace) {
                        handleSaveLayer(layerData, true);
                        return;
                    }
                }
                setUploadError(error.message);
            } finally {
                setIsUploading(false);
            }
        } else {
            const newLayer = {
                id: layers.length + 1,
                name: layerData.name,
                type: layerData.layerType,
                source: layerData.dataSource,
                visible: true
            };
            setLayers([...layers, newLayer]);
        }
    };

    return (
        <nav className="flex flex-col h-[93vh] w-80 bg-[#FAFAFA] border-r border-gray-200 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-center">
                <Link href="/">
                    <img src="/logo.svg" alt="Maplytics Logo" className="w-48" />
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="space-y-6">
                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeNav === item.id;
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => setActiveNav(item.id)}
                                >
                                    <button
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                            ? "bg-primary text-white shadow-md"
                                            : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="border-t border-gray-300"></div>

                    <div className="space-y-1">
                        {pageItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeNav === item.id;
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => setActiveNav(item.id)}
                                >
                                    <button
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
                                            ? "bg-primary text-white shadow-md"
                                            : "text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </button>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="border-t border-gray-300"></div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Layers</h3>

                        <button
                            onClick={() => setIsModalOpen(true)}
                            disabled={isUploading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg transition-all duration-200 shadow-sm font-medium disabled:opacity-50"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Add Layer
                                </>
                            )}
                        </button>

                        {uploadError && (
                            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs text-red-600">{uploadError}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            {layers.map((layer, index) => (
                                <div
                                    key={layer.id}
                                    className={`px-3 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-primary transition-all duration-200`}
                                >
                                    <span className="text-sm font-medium text-gray-700 truncate">
                                        {layer.name}
                                    </span>
                                    {layer.featureCount && (
                                        <span className="text-xs text-gray-500 ml-2">
                                            ({layer.featureCount} features)
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 py-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-earthy-green flex items-center justify-center text-white font-semibold">
                        {/*Here inside the circle, it should be the first letter of the user but for now i will only use "U"*/"U"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {/*here should be the username*/"User"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {/*here sholud be the email*/"user@example.com"}
                        </p>
                    </div>
                </div>
            </div>

            <AddLayerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveLayer}
            />
        </nav>
    );
} 
