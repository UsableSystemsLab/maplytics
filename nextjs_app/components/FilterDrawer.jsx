"use client";
import { useEffect, useState } from "react";
import { X, ChevronDown, ChevronUp, Star } from "lucide-react";
import RangeSlider from "@/components/ui/RangeSlider";

const PRICE_TIERS = ["$", "$$", "$$$", "$$$$"];
const isPriceField = (field) => {
    if (/price|cost|tier/i.test(field.name)) return true;
    if (field.type === "string" && Array.isArray(field.values)) {
        return field.values.length > 0 && field.values.every(v => PRICE_TIERS.includes(String(v)));
    }
    return false;
};
const isRatingField = (field) =>
    field.type === "number" &&
    /rating|stars|score/i.test(field.name) &&
    typeof field.max === "number" &&
    field.max <= 10;

const labelize = (name) =>
    name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

export default function FilterDrawer({
    isOpen,
    onClose,
    fields,
    filters,
    onStringChange,
    onNumberChange,
    onClearAll,
    onRemoveFilter,
}) {
    const [expanded, setExpanded] = useState({});

    useEffect(() => {
        if (isOpen) {
            const next = {};
            fields.slice(0, 3).forEach(f => { next[f.name] = true; });
            setExpanded(next);
        }
    }, [isOpen, fields]);

    const activeChips = [];
    for (const [fieldName, v] of Object.entries(filters || {})) {
        if (!v) continue;
        if (v.type === "string" && v.selected?.length > 0) {
            activeChips.push({ fieldName, label: `${labelize(fieldName)}: ${v.selected.length} selected` });
        } else if (v.type === "number" && (v.min !== undefined || v.max !== undefined)) {
            const a = v.min ?? "…";
            const b = v.max ?? "…";
            activeChips.push({ fieldName, label: `${labelize(fieldName)}: ${a}–${b}` });
        }
    }

    return (
        <div
            className={`absolute left-0 top-0 bottom-0 w-80 z-40 bg-white shadow-2xl border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"}`}
            onClick={(e) => e.stopPropagation()}
            aria-hidden={!isOpen}
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-800">Filters</h3>
                    {activeChips.length > 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {activeChips.length}
                        </span>
                    )}
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-800" title="Close">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {activeChips.length > 0 && (
                <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap gap-1.5 items-center">
                    {activeChips.map(chip => (
                        <button
                            key={chip.fieldName}
                            onClick={() => onRemoveFilter(chip.fieldName)}
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-full"
                        >
                            {chip.label}
                            <X className="w-3 h-3" />
                        </button>
                    ))}
                    <button
                        onClick={onClearAll}
                        className="ml-auto text-xs text-red-500 hover:text-red-700 px-2 py-1"
                    >
                        Clear all
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {fields.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-8 px-4">
                        No filters configured.<br />Use the gear icon on this layer to set them up.
                    </p>
                )}
                {fields.map((field) => {
                    const isExpanded = expanded[field.name];
                    return (
                        <div key={field.name} className="border border-gray-200 rounded-lg">
                            <button
                                onClick={() => setExpanded(e => ({ ...e, [field.name]: !isExpanded }))}
                                className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                            >
                                <span className="truncate">{labelize(field.name)}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                            </button>
                            {isExpanded && (
                                <div className="px-3 pb-3 pt-1">
                                    {field.type === "string" && (
                                        <StringFieldBody
                                            field={field}
                                            selected={filters[field.name]?.selected || []}
                                            onChange={(val, checked) => onStringChange(field.name, val, checked)}
                                        />
                                    )}
                                    {field.type === "number" && (
                                        <NumberFieldBody
                                            field={field}
                                            value={filters[field.name]}
                                            onChange={(next) => onNumberChange(field.name, next)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StringFieldBody({ field, selected, onChange }) {
    const [query, setQuery] = useState("");
    const values = field.values || [];
    const showSearch = values.length > 8;
    const filtered = query
        ? values.filter(v => String(v).toLowerCase().includes(query.toLowerCase()))
        : values;
    const priceMode = isPriceField(field);

    return (
        <div>
            {showSearch && (
                <input
                    type="text"
                    placeholder="Search values…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    className="w-full mb-2 text-xs px-2 py-1 border border-gray-300 rounded"
                />
            )}
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {filtered.map((val) => {
                    const key = String(val);
                    const isSelected = selected.includes(key);
                    const display = priceMode && PRICE_TIERS.includes(key) ? key : key;
                    return (
                        <button
                            key={key}
                            onClick={() => onChange(val, !isSelected)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                isSelected
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                            }`}
                        >
                            {display}
                        </button>
                    );
                })}
                {filtered.length === 0 && (
                    <span className="text-xs text-gray-400 px-1">No matches</span>
                )}
            </div>
        </div>
    );
}

function NumberFieldBody({ field, value, onChange }) {
    const min = field.min ?? 0;
    const max = field.max ?? 1;
    const currentMin = value?.min ?? min;
    const currentMax = value?.max ?? max;

    if (isRatingField(field)) {
        const total = Math.round(max);
        return (
            <div>
                <div className="text-xs text-gray-500 mb-1">Minimum rating</div>
                <div className="flex gap-1 items-center">
                    {Array.from({ length: total }).map((_, i) => {
                        const n = i + 1;
                        const active = currentMin >= n;
                        return (
                            <button
                                key={n}
                                onClick={() => onChange({ min: n, max })}
                                title={`${n}+ stars`}
                                type="button"
                            >
                                <Star
                                    className={`w-5 h-5 ${active ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                                />
                            </button>
                        );
                    })}
                    {currentMin > min && (
                        <button
                            onClick={() => onChange({ min, max })}
                            className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                            type="button"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <RangeSlider
            min={min}
            max={max}
            value={{ min: currentMin, max: currentMax }}
            onChange={onChange}
        />
    );
}
