"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, ChevronDown, X } from "lucide-react";

export default function SearchableSelect({
    options = [],
    value,
    onChange,
    groupBy,
    labelKey,
    valueKey,
    placeholder = "Search...",
    icon,
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const selectedLabel = useMemo(() => {
        if (!value) return "";
        const found = options.find(o => String(o[valueKey]) === String(value));
        return found ? found[labelKey] : "";
    }, [value, options, valueKey, labelKey]);

    // Filter by search term
    const filtered = useMemo(() => {
        if (!search.trim()) return options;
        const term = search.toLowerCase();
        return options.filter(o => {
            const label = o[labelKey]?.toLowerCase() || "";
            const group = groupBy ? (o[groupBy]?.toLowerCase() || "") : "";
            return label.includes(term) || group.includes(term);
        });
    }, [options, search, labelKey, groupBy]);

    // Reset highlight when filtered list changes
    useEffect(() => {
        setHighlightedIndex(0);
    }, [filtered]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const el = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
        if (el) el.scrollIntoView({ block: "nearest" });
    }, [highlightedIndex, isOpen]);

    const handleSelect = (opt) => {
        onChange(String(opt[valueKey]));
        setIsOpen(false);
        setSearch("");
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange("");
        setSearch("");
    };

    const handleInputClick = () => {
        if (disabled) return;
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const handleKeyDown = useCallback((e) => {
        if (!isOpen) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setHighlightedIndex(prev => Math.max(prev - 1, 0));
                break;
            case "Enter":
                e.preventDefault();
                if (filtered[highlightedIndex]) {
                    handleSelect(filtered[highlightedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                setIsOpen(false);
                setSearch("");
                break;
        }
    }, [isOpen, filtered, highlightedIndex]);

    // Build grouped or flat render
    const renderItems = () => {
        if (filtered.length === 0) {
            return (
                <div className="px-4 py-3 text-sm text-gray-400 text-center">
                    No results found
                </div>
            );
        }

        // Flat list (no groupBy)
        if (!groupBy) {
            return filtered.map((opt, idx) => {
                const isSelected = String(opt[valueKey]) === String(value);
                const isHighlighted = idx === highlightedIndex;
                return (
                    <button
                        key={opt[valueKey]}
                        type="button"
                        data-index={idx}
                        onClick={() => handleSelect(opt)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            isSelected
                                ? "bg-blue-50 text-blue-700 font-medium"
                                : isHighlighted
                                    ? "bg-gray-100 text-gray-900"
                                    : "text-gray-700"
                        }`}
                    >
                        {opt[labelKey]}
                    </button>
                );
            });
        }

        // Grouped list
        const groups = {};
        for (const opt of filtered) {
            const group = opt[groupBy] || "Other";
            if (!groups[group]) groups[group] = [];
            groups[group].push(opt);
        }

        let flatIdx = 0;
        return Object.entries(groups).map(([group, items]) => (
            <div key={group}>
                <div className="px-3 py-1.5 text-xs font-bold text-gray-500 uppercase bg-gray-50 sticky top-0">
                    {group}
                </div>
                {items.map(opt => {
                    const idx = flatIdx++;
                    const isSelected = String(opt[valueKey]) === String(value);
                    const isHighlighted = idx === highlightedIndex;
                    return (
                        <button
                            key={opt[valueKey]}
                            type="button"
                            data-index={idx}
                            onClick={() => handleSelect(opt)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                isSelected
                                    ? "bg-blue-50 text-blue-700 font-medium"
                                    : isHighlighted
                                        ? "bg-gray-100 text-gray-900"
                                        : "text-gray-700"
                            }`}
                        >
                            {opt[labelKey]}
                        </button>
                    );
                })}
            </div>
        ));
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Input area */}
            <div
                onClick={handleInputClick}
                className={`flex items-center w-full bg-white border border-gray-200 rounded-lg text-sm cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
                    disabled ? "opacity-50 cursor-not-allowed bg-gray-50" : ""
                }`}
            >
                <span className="pl-3 text-gray-400">
                    {icon || <Search className="w-4 h-4" />}
                </span>

                {isOpen ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="flex-1 px-2 py-2 bg-transparent outline-none text-sm"
                    />
                ) : (
                    <span className={`flex-1 px-2 py-2 truncate ${selectedLabel ? "text-gray-900" : "text-gray-400"}`}>
                        {selectedLabel || placeholder}
                    </span>
                )}

                {value ? (
                    <button
                        onClick={handleClear}
                        className="pr-3 text-gray-400 hover:text-gray-600"
                        type="button"
                    >
                        <X className="w-4 h-4" />
                    </button>
                ) : (
                    <span className="pr-3 text-gray-400 pointer-events-none">
                        <ChevronDown className="w-4 h-4" />
                    </span>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div ref={listRef} className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {renderItems()}
                </div>
            )}
        </div>
    );
}
