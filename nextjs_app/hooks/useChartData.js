import { useState, useMemo, useEffect } from "react";
import { aggregateByField } from "@/lib/aggregateData";

const BLOCKERS = new Set(["no_data", "no_points", "no_categorical_fields"]);

/**
 * Shared hook for categorical field selection, chart data aggregation,
 * and data quality diagnostics.
 *
 * Used by both the ChartSidePanel (map page) and AnalysisFlipCard (dashboard page).
 *
 * @param {Array} features - GeoJSON features
 * @param {Array} fieldsMetadata - field metadata (each has { name, type, values })
 * @returns {{ categoricalFields, selectedField, setSelectedField, chartData, diagnostics }}
 */
export function useChartData(features, fieldsMetadata) {
    const categoricalFields = useMemo(
        () => (fieldsMetadata || []).filter((f) => f.type === "string"),
        [fieldsMetadata]
    );

    const [selectedField, setSelectedField] = useState(
        categoricalFields[0]?.name ?? ""
    );

    // Sync selectedField when categoricalFields change (e.g. new dataset loaded)
    useEffect(() => {
        if (
            categoricalFields.length > 0 &&
            !categoricalFields.some((f) => f.name === selectedField)
        ) {
            setSelectedField(categoricalFields[0].name);
        }
    }, [categoricalFields, selectedField]);

    const chartData = useMemo(() => {
        if (!features || !selectedField) return [];
        return aggregateByField(features, selectedField);
    }, [features, selectedField]);

    // Geometry counts — reused across diagnostics and UI
    const { pointCount, nonPointCount } = useMemo(() => {
        if (!features || features.length === 0) return { pointCount: 0, nonPointCount: 0 };
        let pts = 0;
        for (const f of features) {
            if (f.geometry?.type === "Point") pts++;
        }
        return { pointCount: pts, nonPointCount: features.length - pts };
    }, [features]);

    /**
     * Diagnostics object — detects edge cases in the data.
     *
     * status values:
     *   Blockers  (chart cannot render):  'no_data' | 'no_points' | 'no_categorical_fields'
     *   Warnings  (chart renders with banner): 'single_value' | 'all_unique' | 'high_nulls'
     *   OK:       'ok'
     */
    const diagnostics = useMemo(() => {
        const base = { pointCount, nonPointCount };

        // Blockers — checked first
        if (!features || features.length === 0)
            return { ...base, status: "no_data" };

        if (pointCount === 0)
            return { ...base, status: "no_points" };

        if (categoricalFields.length === 0)
            return { ...base, status: "no_categorical_fields" };

        if (chartData.length === 0)
            return { ...base, status: "no_data" };

        // Warnings
        if (chartData.length === 1)
            return { ...base, status: "single_value" };

        if (chartData[0].count === 1)
            return { ...base, status: "all_unique" };

        const unknownEntry = chartData.find((d) => d.category === "Unknown");
        if (unknownEntry) {
            const total = chartData.reduce((s, d) => s + d.count, 0);
            const nullPercent = Math.round((unknownEntry.count / total) * 100);
            if (nullPercent > 50)
                return { ...base, status: "high_nulls", nullCount: unknownEntry.count, nullPercent };
        }

        return { ...base, status: "ok" };
    }, [features, categoricalFields, chartData, pointCount, nonPointCount]);

    return { categoricalFields, selectedField, setSelectedField, chartData, diagnostics };
}

/**
 * Check whether a diagnostics status is a blocker (chart cannot render).
 * @param {string} status
 * @returns {boolean}
 */
export function isBlocker(status) {
    return BLOCKERS.has(status);
}
