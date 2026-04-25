"use client";
import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import {
    getFilterPrefs,
    putFilterPrefs,
    deleteFilterPrefs,
    putDefaultFilterFields,
} from "@/lib/filterPrefsApi";
import { getDatasetGeoJSON } from "@/lib/datasetApi";
import { useAuth } from "@/hooks/useAuth";

export default function LayerFilterPrefsModal({
    isOpen,
    onClose,
    dataset,
    availableFields: availableFieldsProp,
    onSaved,
}) {
    const { user } = useAuth();
    const [selected, setSelected] = useState(new Set());
    const [source, setSource] = useState("none");
    const [availableFields, setAvailableFields] = useState(availableFieldsProp || []);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saveDefault, setSaveDefault] = useState(false);
    const [defaultError, setDefaultError] = useState(null);

    useEffect(() => {
        if (!isOpen || !dataset?.id) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        setSaveDefault(false);

        const fieldsPromise = (availableFieldsProp && availableFieldsProp.length > 0)
            ? Promise.resolve(availableFieldsProp)
            : getDatasetGeoJSON(dataset.id).then(res => res?.fields || []);

        Promise.all([fieldsPromise, getFilterPrefs(dataset.id)])
            .then(([fields, prefs]) => {
                if (cancelled) return;
                setAvailableFields(fields);
                setSource(prefs.source);
                const initial = Array.isArray(prefs.filterableFields)
                    ? prefs.filterableFields
                    : fields.map(f => f.name);
                setSelected(new Set(initial));
            })
            .catch(err => { if (!cancelled) setError(err.message || "Failed to load"); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [isOpen, dataset?.id, availableFieldsProp]);

    const toggle = (name) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setDefaultError(null);
        const ordered = availableFields.map(f => f.name).filter(n => selected.has(n));
        let defaultFailed = false;
        try {
            await putFilterPrefs(dataset.id, ordered);
            if (saveDefault) {
                try {
                    await putDefaultFilterFields(dataset.id, ordered);
                } catch (err) {
                    defaultFailed = true;
                    setDefaultError(err.status === 403
                        ? "Only the dataset owner can set defaults"
                        : (err.message || "Failed to save default"));
                }
            }
            window.dispatchEvent(new CustomEvent('filterPrefsChanged', {
                detail: { datasetId: dataset.id, filterableFields: ordered },
            }));
            onSaved?.(ordered);
            if (!defaultFailed) onClose();
        } catch (err) {
            setError(err.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setSaving(true);
        setError(null);
        try {
            await deleteFilterPrefs(dataset.id);
            const prefs = await getFilterPrefs(dataset.id);
            window.dispatchEvent(new CustomEvent('filterPrefsChanged', {
                detail: { datasetId: dataset.id, filterableFields: prefs.filterableFields ?? null },
            }));
            onSaved?.(prefs.filterableFields ?? null);
            onClose();
        } catch (err) {
            setError(err.message || "Failed to reset");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    const sourceLabel = {
        user: "Using your saved preferences",
        default: "Using dataset default",
        none: "No filters configured",
    }[source] || "";

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]" onClick={onClose} />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="bg-primary px-6 py-4 flex items-center justify-between">
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-white">Filter settings</h2>
                            <p className="text-xs text-white/80 truncate">{dataset?.name}</p>
                        </div>
                        <button onClick={onClose} className="text-white/80 hover:text-white p-1 shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-5">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <>
                                <p className="text-xs text-gray-500 mb-3">{sourceLabel}</p>
                                <div className="flex items-center gap-2 mb-2 text-xs">
                                    <button
                                        onClick={() => setSelected(new Set(availableFields.map(f => f.name)))}
                                        className="text-primary hover:underline"
                                    >
                                        Select all
                                    </button>
                                    <span className="text-gray-300">·</span>
                                    <button
                                        onClick={() => setSelected(new Set())}
                                        className="text-primary hover:underline"
                                    >
                                        Select none
                                    </button>
                                </div>
                                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                                    {availableFields.length === 0 && (
                                        <p className="text-sm text-gray-500 text-center py-4">No fields detected.</p>
                                    )}
                                    {availableFields.map(f => (
                                        <label key={f.name} className="flex items-center gap-2 text-sm px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(f.name)}
                                                onChange={() => toggle(f.name)}
                                            />
                                            <span className="flex-1 truncate">{f.name}</span>
                                            <span className="text-[10px] uppercase tracking-wide text-gray-400">{f.type}</span>
                                        </label>
                                    ))}
                                </div>
                                <label className="flex items-center gap-2 mt-3 text-sm text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={saveDefault}
                                        onChange={(e) => setSaveDefault(e.target.checked)}
                                    />
                                    <span>Also save as dataset default</span>
                                </label>
                                {defaultError && <p className="mt-2 text-xs text-amber-600">{defaultError}</p>}
                                {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2 px-5 pb-5">
                        {source === "user" && !loading && (
                            <button
                                onClick={handleReset}
                                disabled={saving}
                                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 disabled:opacity-50"
                            >
                                Reset to default
                            </button>
                        )}
                        <div className="flex-1" />
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                        >
                            {saving ? "Saving…" : "Save for me"}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
