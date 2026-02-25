"use client";
import { useEffect, useRef, useMemo } from "react";
import { getColorRange } from "@/lib/choroplethScale";

/**
 * Choropleth map rendered with Vega-Lite.
 *
 * @param {object}   props
 * @param {object}   props.boundaries       - GeoJSON FeatureCollection of boundary polygons
 * @param {Array}    props.data              - Array of { name, count, ... } aggregated values
 * @param {string}  [props.valueField="count"]        - Property in data to color by
 * @param {string}  [props.nameField="name"]          - Property in data used to join with boundaries
 * @param {string}  [props.boundaryNameProp="name_en"] - Property in boundary features for join
 * @param {string}  [props.colorScheme="Blues"]        - Chroma color scheme name
 * @param {string}  [props.title]                      - Chart title
 * @param {number}  [props.width=600]
 * @param {number}  [props.height=450]
 * @param {string}  [props.className]
 * @param {Function}[props.onFeatureClick]             - Callback when a boundary is clicked
 */
export default function ChoroplethMap({
    boundaries,
    data,
    valueField = "count",
    nameField = "name",
    boundaryNameProp = "name_en",
    colorScheme = "Blues",
    title,
    width = 600,
    height = 450,
    className = "",
    onFeatureClick,
}) {
    const containerRef = useRef(null);
    const viewRef = useRef(null);

    // Merge data into boundary features so Vega-Lite can read it directly
    const enrichedFeatures = useMemo(() => {
        if (!boundaries?.features) return [];

        const lookup = new Map();
        if (data) {
            for (const d of data) {
                lookup.set(d[nameField], d[valueField] ?? 0);
            }
        }

        return boundaries.features.map(f => ({
            ...f,
            properties: {
                ...f.properties,
                [valueField]: lookup.get(f.properties[boundaryNameProp]) ?? 0,
            },
        }));
    }, [boundaries, data, valueField, nameField, boundaryNameProp]);

    const colorRange = useMemo(() => getColorRange(colorScheme, 9), [colorScheme]);

    useEffect(() => {
        if (!containerRef.current || enrichedFeatures.length === 0) return;

        let cancelled = false;

        (async () => {
            // Dynamic import to avoid SSR issues with Vega
            const vegaEmbed = (await import("vega-embed")).default;

            if (cancelled) return;

            const spec = {
                $schema: "https://vega.github.io/schema/vega-lite/v5.json",
                width,
                height,
                ...(title ? { title: { text: title, fontSize: 16, anchor: "start" } } : {}),
                projection: { type: "mercator" },
                data: {
                    values: enrichedFeatures,
                },
                mark: {
                    type: "geoshape",
                    stroke: "#fff",
                    strokeWidth: 0.5,
                    cursor: onFeatureClick ? "pointer" : "default",
                },
                encoding: {
                    color: {
                        field: `properties.${valueField}`,
                        type: "quantitative",
                        scale: { range: colorRange },
                        legend: {
                            title: valueField.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
                            direction: "vertical",
                            gradientLength: 200,
                        },
                    },
                    tooltip: [
                        { field: `properties.${boundaryNameProp}`, type: "nominal", title: "Name" },
                        { field: `properties.${valueField}`, type: "quantitative", title: valueField.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) },
                    ],
                },
                config: {
                    view: { stroke: null },
                    background: "transparent",
                },
            };

            if (cancelled) return;

            // Clean up previous view
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

            // Handle click events
            if (onFeatureClick) {
                result.view.addEventListener("click", (event, item) => {
                    if (item?.datum?.properties) {
                        onFeatureClick(item.datum);
                    }
                });
            }
        })();

        return () => {
            cancelled = true;
            if (viewRef.current) {
                viewRef.current.finalize();
                viewRef.current = null;
            }
        };
    }, [enrichedFeatures, colorRange, width, height, title, valueField, boundaryNameProp, onFeatureClick]);

    if (!boundaries?.features?.length) {
        return (
            <div className={`flex items-center justify-center text-gray-400 text-sm ${className}`}
                 style={{ width, height }}>
                No boundary data available
            </div>
        );
    }

    return <div ref={containerRef} className={className} />;
}
