"use client";
import { useEffect, useRef, useMemo } from "react";

export default function BarChartComparison({ data }) {
    const containerRef = useRef(null);
    const viewRef = useRef(null);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 10);
        const total = sorted.reduce((sum, d) => sum + d.count, 0);
        return sorted.map((d) => ({
            ...d,
            percentage: total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0,
        }));
    }, [data]);

    // Dynamic height: ~40px per bar, min 200, max 500
    const chartHeight = useMemo(() => {
        const barCount = chartData.length;
        return Math.max(200, Math.min(500, barCount * 40));
    }, [chartData]);

    // Compute max count and explicit integer tick values
    const maxCount = useMemo(() => {
        if (chartData.length === 0) return 0;
        return Math.max(...chartData.map((d) => d.count));
    }, [chartData]);

    const tickValues = useMemo(() => {
        const max = maxCount;
        // Generate integer ticks from 0 to max, capped at 10 ticks
        const step = Math.max(1, Math.ceil(max / 10));
        const ticks = [];
        for (let i = 0; i <= max; i += step) {
            ticks.push(i);
        }
        if (ticks[ticks.length - 1] !== max) {
            ticks.push(max);
        }
        return ticks;
    }, [maxCount]);

    useEffect(() => {
        if (!containerRef.current || chartData.length === 0) return;

        let cancelled = false;

        (async () => {
            const vegaEmbed = (await import("vega-embed")).default;
            if (cancelled) return;

            const spec = {
                $schema: "https://vega.github.io/schema/vega-lite/v5.json",
                width: "container",
                height: chartHeight,
                data: { values: chartData },
                mark: {
                    type: "bar",
                    cornerRadiusEnd: 4,
                    color: "#13B38D",
                },
                encoding: {
                    y: {
                        field: "category",
                        type: "nominal",
                        sort: "-x",
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
                        { field: "count", type: "quantitative", title: "Count" },
                        { field: "percentage", type: "quantitative", title: "%", format: ".1f" },
                    ],
                },
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
    }, [chartData, chartHeight, maxCount, tickValues]);

    if (!data || data.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No data available for chart
            </div>
        );
    }

    return <div ref={containerRef} style={{ width: "100%", minHeight: chartHeight + 20 }} />;
}
