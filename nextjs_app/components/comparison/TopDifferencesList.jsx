"use client";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const COLOR_A = "#134565";
const COLOR_B = "#13B38D";

function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

function DivergingBar({ countA, countB, scaleMax }) {
    const safeMax = scaleMax > 0 ? scaleMax : 1;
    const widthA = `${(countA / safeMax) * 100}%`;
    const widthB = `${(countB / safeMax) * 100}%`;

    return (
        <div className="flex h-2 w-full items-stretch gap-px overflow-hidden">
            <div className="flex flex-1 justify-end overflow-hidden bg-gray-100">
                <div
                    className="h-full rounded-l-sm"
                    style={{ width: widthA, backgroundColor: COLOR_A }}
                />
            </div>
            <div className="flex flex-1 overflow-hidden bg-gray-100">
                <div
                    className="h-full rounded-r-sm"
                    style={{ width: widthB, backgroundColor: COLOR_B }}
                />
            </div>
        </div>
    );
}

/**
 * Ranked list of top categories by |countA - countB|, with mini diverging bars.
 *
 * Renders only when the worker resolved a categorical comparison field; in the
 * spatial-only fallback case (no comparisonField) the section is omitted.
 */
export default function TopDifferencesList({
    legend,
    comparisonField,
    biggestValue,
    max = 5,
}) {
    const rows = useMemo(() => {
        if (!comparisonField || !Array.isArray(legend) || legend.length === 0) return [];

        return [...legend]
            .map((item) => ({
                ...item,
                difference: (item.countA || 0) - (item.countB || 0),
                absDifference: Math.abs((item.countA || 0) - (item.countB || 0)),
            }))
            .sort((a, b) => b.absDifference - a.absDifference)
            .slice(0, max);
    }, [legend, comparisonField, max]);

    const scaleMax = useMemo(() => {
        if (rows.length === 0) return 0;
        return rows.reduce(
            (m, r) => Math.max(m, r.countA || 0, r.countB || 0),
            0,
        );
    }, [rows]);

    if (rows.length === 0) return null;

    return (
        <section className="rounded-xl border border-gray-200 bg-white">
            <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
                    Top differences
                </span>
                <span className="text-[11px] font-medium text-gray-400">
                    by |A − B|
                </span>
            </header>

            <ul className="divide-y divide-gray-100">
                {rows.map((row) => {
                    const isBiggest = biggestValue && row.value === biggestValue;
                    const sign = row.difference > 0 ? "+" : row.difference < 0 ? "−" : "";
                    const magnitude = formatCount(row.absDifference);
                    return (
                        <li
                            key={`${row.value}-${row.color}`}
                            className={cn(
                                "px-3 py-2.5",
                                isBiggest && "bg-amber-50/60",
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                    {isBiggest && (
                                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                    )}
                                    <span className="truncate text-xs font-semibold text-gray-800">
                                        {row.value}
                                    </span>
                                </div>
                                <span
                                    className={cn(
                                        "shrink-0 font-mono text-[11px] font-semibold",
                                        row.difference > 0
                                            ? "text-[#134565]"
                                            : row.difference < 0
                                                ? "text-[#0E8A6F]"
                                                : "text-gray-400",
                                    )}
                                >
                                    {sign}
                                    {magnitude}
                                </span>
                            </div>

                            <div className="mt-1.5 flex items-center gap-2">
                                <span className="w-10 shrink-0 text-right font-mono text-[10px] text-gray-500">
                                    {formatCount(row.countA)}
                                </span>
                                <DivergingBar
                                    countA={row.countA || 0}
                                    countB={row.countB || 0}
                                    scaleMax={scaleMax}
                                />
                                <span className="w-10 shrink-0 font-mono text-[10px] text-gray-500">
                                    {formatCount(row.countB)}
                                </span>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
