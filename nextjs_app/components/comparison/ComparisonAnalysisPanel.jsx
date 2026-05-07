"use client";
import { useMemo } from "react";
import { Activity, Info, BarChart3 } from "lucide-react";
import SidePanel from "@/components/SidePanel";
import BarChartComparison from "@/components/BarChartComparison";
import SummaryCards from "@/components/comparison/SummaryCards";
import TopDifferencesList from "@/components/comparison/TopDifferencesList";
import ComparisonLegend from "@/components/comparison/ComparisonLegend";

const COLOR_A = "#134565";
const COLOR_B = "#13B38D";

function buildChartSeries(meta) {
    const legend = Array.isArray(meta?.legend) ? meta.legend : [];
    const districtA = meta?.districtA || {};
    const districtB = meta?.districtB || {};

    if (!meta?.comparisonField || legend.length === 0) {
        return [
            {
                label: districtA.name || "District A",
                color: districtA.color || COLOR_A,
                data: [{ category: "Total features", count: districtA.count || 0 }],
            },
            {
                label: districtB.name || "District B",
                color: districtB.color || COLOR_B,
                data: [{ category: "Total features", count: districtB.count || 0 }],
            },
        ];
    }

    return [
        {
            label: districtA.name || "District A",
            color: districtA.color || COLOR_A,
            data: legend.map((item) => ({
                category: item.value,
                count: item.countA || 0,
            })),
        },
        {
            label: districtB.name || "District B",
            color: districtB.color || COLOR_B,
            data: legend.map((item) => ({
                category: item.value,
                count: item.countB || 0,
            })),
        },
    ];
}

/**
 * Side panel shown alongside the comparison maps.
 *
 * Composes the generic SidePanel chrome with comparison-specific sections:
 * summary cards, grouped bar chart, top differences, and legend.
 * All data is read from `comparisonGeojson.properties` (`meta`).
 */
export default function ComparisonAnalysisPanel({
    meta,
    isOpen,
    onClose,
    onHighlight,
    width,
}) {
    const series = useMemo(() => buildChartSeries(meta), [meta]);
    const messages = Array.isArray(meta?.messages) ? meta.messages : [];
    const comparisonField = meta?.comparisonField;
    const legend = Array.isArray(meta?.legend) ? meta.legend : [];
    const biggestValue = meta?.metrics?.biggestDifferenceValue;
    const hasResult = Boolean(meta);

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Analysis"
            icon={Activity}
            width={width}
            closeAriaLabel="Close analysis panel"
            bodyClassName="p-3.5"
        >
            {!hasResult ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                    <div className="rounded-full bg-gray-100 p-3">
                        <BarChart3 className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">
                        No comparison yet
                    </p>
                    <p className="max-w-xs text-xs text-gray-500">
                        Run a comparison query to see the breakdown, top differences, and legend here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {meta?.query && (
                        <div className="rounded-lg bg-gray-50 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                                Query
                            </div>
                            <p className="mt-0.5 text-xs text-gray-700">
                                {meta.query}
                            </p>
                        </div>
                    )}

                    {messages.length > 0 && (
                        <div className="space-y-2">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                                >
                                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                                    <p className="text-xs text-amber-800">{message}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <SummaryCards meta={meta} />

                    <section className="rounded-xl border border-gray-200 bg-white">
                        <header className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
                            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
                                {comparisonField
                                    ? `By ${meta.comparisonFieldLabel || comparisonField}`
                                    : "Total features"}
                            </span>
                            <span className="text-[11px] font-medium text-gray-400">
                                grouped bar
                            </span>
                        </header>
                        <div className="p-3">
                            <BarChartComparison series={series} />
                        </div>
                    </section>

                    <TopDifferencesList
                        legend={legend}
                        comparisonField={comparisonField}
                        biggestValue={biggestValue}
                    />

                    {comparisonField && (
                        <ComparisonLegend legend={legend} onHighlight={onHighlight} />
                    )}
                </div>
            )}
        </SidePanel>
    );
}
