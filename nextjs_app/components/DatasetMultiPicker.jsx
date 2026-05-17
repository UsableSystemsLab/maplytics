"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import apiClient from "@/lib/apiClient";
import { getDatasets } from "@/lib/datasetApi";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Database, Globe, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";


function normalizeListResponse(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.datasets)) return data.datasets;
    return [];
}

function renderItem(ds, selectedIds, onToggle) {
    const id = ds._id;
    const isChecked = selectedIds.includes(id);
    const isPublic = ds._source === "public";
    const Icon = isPublic ? Globe : Database;
    const subtitle = ds.file_format || ds.geometry_type || (isPublic ? "Public" : "Data");
    return (
        <DropdownMenuCheckboxItem
            key={`${ds._source}-${id}`}
            checked={isChecked}
            onCheckedChange={() => onToggle?.(id)}
            onSelect={(e) => e.preventDefault()}
            className="rounded-lg py-2"
        >
            <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm truncate">{ds.name}</span>
                    <span className="text-[9px] uppercase text-muted-foreground">
                        {subtitle}
                    </span>
                </div>
            </div>
        </DropdownMenuCheckboxItem>
    );
}

function InactiveMatchBadge({ count }) {
    if (!count) return null;
    return (
        <span className="ms-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
            {count}
        </span>
    );
}

export default function DatasetMultiPicker({
    selectedIds = [],
    onToggle,
    label,
    className,
    disabled = false,
}) {
    const t = useTranslations("comparison.datasetPicker");
    const resolvedLabel = label || t('label');
    const activeProject = useSelector(selectActiveProject);
    const projectId = activeProject?.id;

    const [projectDatasets, setProjectDatasets] = useState([]);
    const [publicDatasets, setPublicDatasets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("project");

    // Fetch project + public datasets when the project changes
    useEffect(() => {
        if (!projectId) {
            setProjectDatasets([]);
            setPublicDatasets([]);
            setFetchError(null);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setFetchError(null);
        (async () => {
            try {
                const [projectRes, publicRes] = await Promise.allSettled([
                    apiClient.get(`/projects/${projectId}/datasets`),
                    getDatasets({ is_public: true }),
                ]);
                if (cancelled) return;

                if (projectRes.status === "fulfilled") {
                    setProjectDatasets(normalizeListResponse(projectRes.value));
                } else {
                    console.error("DatasetMultiPicker: project fetch error", projectRes.reason);
                    setProjectDatasets([]);
                }
                if (publicRes.status === "fulfilled") {
                    setPublicDatasets(normalizeListResponse(publicRes.value));
                } else {
                    console.error("DatasetMultiPicker: public fetch error", publicRes.reason);
                    setPublicDatasets([]);
                }

                // Surface error only when BOTH sides failed — partial failure stays silent
                // because the user still has a usable list.
                if (projectRes.status === "rejected" && publicRes.status === "rejected") {
                    setFetchError(true);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [projectId]);

    const { projectGroup, publicGroup } = useMemo(() => {
        // Dedupe by id across both lists — a public dataset already attached to the project
        // would otherwise appear twice. Project wins.
        const seen = new Set();
        const projectGroup = [];
        const publicGroup = [];
        for (const ds of projectDatasets) {
            const id = ds.id || ds.dataset_id;
            if (id == null || seen.has(id)) continue;
            seen.add(id);
            projectGroup.push({ ...ds, _id: id, _source: "project" });
        }
        for (const ds of publicDatasets) {
            const id = ds.id || ds.dataset_id;
            if (id == null || seen.has(id)) continue;
            seen.add(id);
            publicGroup.push({ ...ds, _id: id, _source: "public" });
        }
        return { projectGroup, publicGroup };
    }, [projectDatasets, publicDatasets]);

    const filterFn = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return null;
        return (ds) =>
            (ds.name || "").toLowerCase().includes(term) ||
            (ds.file_format || "").toLowerCase().includes(term) ||
            (ds.geometry_type || "").toLowerCase().includes(term);
    }, [search]);

    const filteredProject = filterFn ? projectGroup.filter(filterFn) : projectGroup;
    const filteredPublic = filterFn ? publicGroup.filter(filterFn) : publicGroup;
    const isSearching = filterFn !== null;

    const selectedCount = selectedIds.length;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    disabled={disabled || !projectId}
                    className={cn(
                        "h-10 w-10 rounded-full hover:bg-primary/5 text-muted-foreground hover:text-primary shrink-0 relative",
                        className
                    )}
                >
                    <Plus className="h-5 w-5" />
                    {selectedCount > 0 && (
                        <span className="absolute -top-0.5 -end-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                            {selectedCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 p-2 rounded-2xl shadow-xl">
                <DropdownMenuLabel className="text-xs uppercase text-muted-foreground tracking-widest p-2">
                    {resolvedLabel}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Search filter */}
                <div className="px-2 pb-2">
                    <div className="relative">
                        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder={t('filterPlaceholder')}
                            className="h-8 ps-8 text-xs rounded-lg"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">{t('loading')}</span>
                    </div>
                ) : fetchError ? (
                    <div className="p-4 text-center text-xs text-destructive italic">
                        {t('loadError')}
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="px-2">
                            <TabsList className="grid w-full grid-cols-2 gap-1.5 h-10 p-1.5 mb-1">
                                <TabsTrigger value="project" className="text-xs gap-1.5 h-full">
                                    <Database className="h-3 w-3 shrink-0" />
                                    <span className="truncate">
                                        {t('projectSection', { count: projectGroup.length })}
                                    </span>
                                    {isSearching && activeTab !== "project" && (
                                        <InactiveMatchBadge count={filteredProject.length} />
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="public" className="text-xs gap-1.5 h-full">
                                    <Globe className="h-3 w-3 shrink-0" />
                                    <span className="truncate">
                                        {t('publicSection', { count: publicGroup.length })}
                                    </span>
                                    {isSearching && activeTab !== "public" && (
                                        <InactiveMatchBadge count={filteredPublic.length} />
                                    )}
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent
                            value="project"
                            className="mt-1 overflow-y-auto py-1"
                            style={{ maxHeight: "min(60vh, 22rem)" }}
                        >
                            {filteredProject.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground italic">
                                    {projectGroup.length === 0 ? t('empty') : t('noMatches')}
                                </div>
                            ) : (
                                filteredProject.map(ds => renderItem(ds, selectedIds, onToggle))
                            )}
                        </TabsContent>

                        <TabsContent
                            value="public"
                            className="mt-1 overflow-y-auto py-1"
                            style={{ maxHeight: "min(60vh, 22rem)" }}
                        >
                            {filteredPublic.length === 0 ? (
                                <div className="p-4 text-center text-xs text-muted-foreground italic">
                                    {publicGroup.length === 0 ? t('emptyPublic') : t('noMatches')}
                                </div>
                            ) : (
                                filteredPublic.map(ds => renderItem(ds, selectedIds, onToggle))
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
