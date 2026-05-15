"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { selectActiveProject } from "@/lib/store/features/projectSlice";
import apiClient from "@/lib/apiClient";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Database, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";


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

    const [datasets, setDatasets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Fetch datasets when the project changes
    useEffect(() => {
        if (!projectId) {
            setDatasets([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const data = await apiClient.get(`/projects/${projectId}/datasets`);
                if (!cancelled) setDatasets(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("DatasetMultiPicker: fetch error", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [projectId]);

    const filtered = useMemo(() => {
        if (!search.trim()) return datasets;
        const term = search.toLowerCase();
        return datasets.filter(ds =>
            (ds.name || "").toLowerCase().includes(term) ||
            (ds.file_format || "").toLowerCase().includes(term)
        );
    }, [datasets, search]);

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
                            placeholder={t('filterPlaceholder')}
                            className="h-8 ps-8 text-xs rounded-lg"
                        />
                    </div>
                </div>

                <div className="max-h-60 overflow-y-auto py-1">
                    {loading ? (
                        <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">{t('loading')}</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">
                            {datasets.length === 0 ? t('empty') : t('noMatches')}
                        </div>
                    ) : (
                        filtered.map(ds => {
                            const id = ds.id || ds.dataset_id;
                            const isChecked = selectedIds.includes(id);
                            return (
                                <DropdownMenuCheckboxItem
                                    key={id}
                                    checked={isChecked}
                                    onCheckedChange={() => onToggle(id)}
                                    onSelect={(e) => e.preventDefault()}
                                    className="rounded-lg py-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium text-sm truncate">{ds.name}</span>
                                            <span className="text-[9px] uppercase text-muted-foreground">
                                                {ds.file_format || "Data"}
                                            </span>
                                        </div>
                                    </div>
                                </DropdownMenuCheckboxItem>
                            );
                        })
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
