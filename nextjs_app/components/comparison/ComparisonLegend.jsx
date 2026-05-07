"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

function formatShare(share) {
    if (typeof share !== "number") return null;
    return `${share.toFixed(1)}%`;
}

/**
 * Inline legend section for the comparison analysis panel.
 *
 * Replaces the floating <details> overlay that previously sat above the maps.
 * Hovering a row fires `onHighlight(value)` so the parent can highlight
 * matching markers on both maps; leaving the list clears the highlight.
 */
export default function ComparisonLegend({ legend, onHighlight }) {
    const [open, setOpen] = useState(true);

    if (!Array.isArray(legend) || legend.length === 0) return null;

    const handleHover = (value) => onHighlight?.(value);
    const handleLeave = () => onHighlight?.(null);

    return (
        <section className="rounded-xl border border-gray-200 bg-white">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                aria-expanded={open}
            >
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
                    Legend
                </span>
                <span className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-400">
                        {legend.length} {legend.length === 1 ? "category" : "categories"}
                    </span>
                    <ChevronDown
                        className={cn(
                            "h-4 w-4 text-gray-400 transition-transform",
                            !open && "-rotate-90",
                        )}
                    />
                </span>
            </button>

            {open && (
                <div
                    className="max-h-72 overflow-y-auto border-t border-gray-100 p-2"
                    onMouseLeave={handleLeave}
                >
                    <ul className="space-y-1">
                        {legend.map((item) => {
                            const total = (item.countA || 0) + (item.countB || 0);
                            const shareA = formatShare(item.shareA);
                            const shareB = formatShare(item.shareB);
                            return (
                                <li
                                    key={`${item.value}-${item.color}`}
                                    onMouseEnter={() => handleHover(item.value)}
                                    onFocus={() => handleHover(item.value)}
                                    onBlur={handleLeave}
                                    tabIndex={0}
                                    className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                >
                                    <span
                                        className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-700">
                                        {item.value}
                                    </span>
                                    <div className="flex shrink-0 items-center gap-1.5 text-[11px]">
                                        <span
                                            className="rounded-md bg-[#134565]/8 px-1.5 py-0.5 font-mono font-semibold text-[#134565]"
                                            title="District A"
                                        >
                                            {formatCount(item.countA)}
                                            {shareA && <span className="ml-1 font-normal text-[#134565]/60">{shareA}</span>}
                                        </span>
                                        <span
                                            className="rounded-md bg-[#13B38D]/10 px-1.5 py-0.5 font-mono font-semibold text-[#0E8A6F]"
                                            title="District B"
                                        >
                                            {formatCount(item.countB)}
                                            {shareB && <span className="ml-1 font-normal text-[#0E8A6F]/70">{shareB}</span>}
                                        </span>
                                        <span className="hidden font-mono text-gray-400 group-hover:inline">
                                            Σ {formatCount(total)}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
}
