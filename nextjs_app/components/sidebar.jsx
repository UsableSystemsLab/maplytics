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
} from "lucide-react";
import AddLayerModal from "./AddLayerModal";

export default function SideBar(props) {
    const { user, loading } = useAuth();
    const [activeNav, setActiveNav] = useState("overview");
    const [layers, setLayers] = useState([
        { id: 1, name: "Population Density", visible: true },
        { id: 2, name: "Road Network", visible: true },
        { id: 3, name: "Land Usage", visible: false },
    ]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Build navItems array from props
    const navItems = [];

    // Check for old-style props (name1, href1, etc.)
    if (props.name1) {
        navItems.push({
            id: props.name1.toLowerCase().replace(/\s+/g, '-'),
            label: props.name1,
            icon: props.icon1 || LayoutDashboard,
            href: props.href1
        });
    }
    if (props.name2) {
        navItems.push({
            id: props.name2.toLowerCase().replace(/\s+/g, '-'),
            label: props.name2,
            icon: props.icon2 || Map,
            href: props.href2
        });
    }
    if (props.name3) {
        navItems.push({
            id: props.name3.toLowerCase().replace(/\s+/g, '-'),
            label: props.name3,
            icon: props.icon3 || BarChart3,
            href: props.href3
        });
    }
    if (props.name4) {
        navItems.push({
            id: props.name4.toLowerCase().replace(/\s+/g, '-'),
            label: props.name4,
            icon: props.icon4 || LayoutDashboard,
            href: props.href4
        });
    }
    if (props.name5) {
        navItems.push({
            id: props.name5.toLowerCase().replace(/\s+/g, '-'),
            label: props.name5,
            icon: props.icon5 || LayoutDashboard,
            href: props.href5
        });
    }

    // If navItems prop exists (new style), use it instead
    const finalNavItems = props.navItems || navItems;

    // Static page items
    const pageItems = [
        { id: "account", label: "Account", icon: User, href: "/account" },
        { id: "History", label: "History", icon: Map, href: "/dashboard/createProject" },
        { id: "team", label: "Team", icon: Users, href: "/team" },
        { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
    ];

    const handleSaveLayer = (layerData) => {
        const newLayer = {
            id: layers.length + 1,
            name: layerData.name,
            type: layerData.layerType,
            source: layerData.dataSource
        };
        setLayers([...layers, newLayer]);
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
                    {finalNavItems.length > 0 && (
                        <div className="space-y-1">
                            {finalNavItems.map((item) => {
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
                    )}

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
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg transition-all duration-200 shadow-sm font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Layer
                        </button>

                        <div className="space-y-2">
                            {layers.map((layer) => (
                                <div
                                    key={layer.id}
                                    className={`px-3 py-2.5 bg-white rounded-lg border border-gray-200 hover:border-primary transition-all duration-200`}
                                >
                                    <span className="text-sm font-medium text-gray-700 truncate">
                                        {layer.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 py-4 border-t border-gray-200 bg-white">
                <div className="flex items-center gap-3 px-3 py-2 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary to-earthy-green flex items-center justify-center text-white font-semibold">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.name || "User"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {user?.email || "user@example.com"}
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