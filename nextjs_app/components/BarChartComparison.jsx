"use client";
import { useEffect, useRef, useMemo } from "react";

/**
 * Horizontal bar chart with optional multi-series grouping.
 *
 * Two call shapes (the second is backwards-compatible):
 *  - <BarChartComparison series={[{ label, color, data: [{category, count}] }, ...]} />
 *  - <BarChartComparison data={[{category, count}]} color="#13B38D" />
 *
 * When more than one series is provided, bars are grouped per category using
 * Vega-Lite's `yOffset` channel and a color legend is shown.
 */
export default function BarChartComparison({ data, series, color = "#13B38D" }) {
    const containerRef = useRef(null);
    const viewRef = useRef(null);

    const allSeries = useMemo(() => {
        if (Array.isArray(series) && series.length > 0) return series;
        if (Array.isArray(data) && data.length > 0) {
            return [{ label: null, color, data }];
        }
        return [];
    }, [series, data, color]);

    const isMultiSeries = allSeries.length > 1;

    const { chartData, categoryCount } = useMemo(() => {
        if (allSeries.length === 0) return { chartData: [], categoryCount: 0 };

        const combinedTotals = new Map();
        for (const s of allSeries) {
            for (const d of s.data || []) {
                combinedTotals.set(d.category, (combinedTotals.get(d.category) || 0) + d.count);
            }
        }

        const topCategories = [...combinedTotals.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([category]) => category);

        const seriesTotals = allSeries.map((s) =>
            (s.data || []).reduce((sum, d) => sum + d.count, 0),
        );

        const flat = [];
        for (let i = 0; i < allSeries.length; i++) {
            const s = allSeries[i];
            const total = seriesTotals[i];
            const byCategory = new Map((s.data || []).map((d) => [d.category, d.count]));
            for (const cat of topCategories) {
                const count = byCategory.get(cat) || 0;
                flat.push({
                    category: cat,
                    count,
                    series: s.label || `Series ${i + 1}`,
                    percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
                });
            }
        }

        return { chartData: flat, categoryCount: topCategories.length };
    }, [allSeries]);

    const maxCount = useMemo(() => {
        if (chartData.length === 0) return 0;
        return Math.max(...chartData.map((d) => d.count));
    }, [chartData]);

    const tickValues = useMemo(() => {
        const max = maxCount;
        const step = Math.max(1, Math.ceil(max / 10));
        const ticks = [];
        for (let i = 0; i <= max; i += step) ticks.push(i);
        if (ticks[ticks.length - 1] !== max) ticks.push(max);
        return ticks;
    }, [maxCount]);

    const chartHeight = useMemo(() => {
        const heightPerCategory = 40 * Math.max(1, allSeries.length);
        return Math.max(200, Math.min(600, categoryCount * heightPerCategory));
    }, [categoryCount, allSeries.length]);

    useEffect(() => {
        if (!containerRef.current || chartData.length === 0) return;

        let cancelled = false;

        (async () => {
            const vegaEmbed = (await import("vega-embed")).default;
            if (cancelled) return;

            const encoding = {
                y: {
                    field: "category",
                    type: "nominal",
                    sort: { op: "sum", field: "count", order: "descending" },
                    axis: {
                        labelLimit: 120,
                        labelFontSize: 12,
                        title: null,
                    },
                },
                x: {
                    field: "count",
                    type: "quantitative",
                    scale: { domain: [0, Math.max(maxCount, 1)] },
                    axis: {
                        title: "Count",
                        titleFontSize: 13,
                        titleFontWeight: 600,
                        labelFontSize: 12,
                        grid: true,
                        values: tickValues,
                        format: "d",
                    },
                },
                tooltip: [
                    { field: "category", type: "nominal", title: "Category" },
                    ...(isMultiSeries
                        ? [{ field: "series", type: "nominal", title: "Series" }]
                        : []),
                    { field: "count", type: "quantitative", title: "Count" },
                    { field: "percentage", type: "quantitative", title: "%", format: ".1f" },
                ],
            };

            if (isMultiSeries) {
                encoding.color = {
                    field: "series",
                    type: "nominal",
                    scale: {
                        domain: allSeries.map((s, i) => s.label || `Series ${i + 1}`),
                        range: allSeries.map((s) => s.color),
                    },
                    legend: { title: null, orient: "top" },
                };
                encoding.yOffset = { field: "series", type: "nominal" };
            }

            const spec = {
                $schema: "https://vega.github.io/schema/vega-lite/v5.json",
                width: "container",
                height: chartHeight,
                data: { values: chartData },
                mark: {
                    type: "bar",
                    cornerRadiusEnd: 4,
                    ...(isMultiSeries ? {} : { color: allSeries[0].color }),
                },
                encoding,
                config: {
                    view: { stroke: null },
                    background: "transparent",
                    font: "Poppins, sans-serif",
                    axis: {
                        labelColor: "#5C5C5C",
                        titleColor: "#333333",
                        gridColor: "#e5e7eb",
                    },
                },
            };

            if (viewRef.current) {
                viewRef.current.finalize();
                viewRef.current = null;
            }

            const result = await vegaEmbed(containerRef.current, spec, {
                actions: false,
                renderer: "svg",
            });

            if (cancelled) {
                result.view.finalize();
                return;
            }

            viewRef.current = result.view;
        })();

        return () => {
            cancelled = true;
            if (viewRef.current) {
                viewRef.current.finalize();
                viewRef.current = null;
            }
        };
    }, [chartData, chartHeight, maxCount, tickValues, allSeries, isMultiSeries]);

    if (allSeries.length === 0 || chartData.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No data available for chart
            </div>
        );
    }

    return <div ref={containerRef} style={{ width: "100%", minHeight: chartHeight + 20 }} />;
}
