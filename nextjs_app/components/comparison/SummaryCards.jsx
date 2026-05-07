"use client";
import { Database, Layers, MapPin, TrendingDown, TrendingUp, Minus } from "lucide-react";
import StatCard from "@/components/StatCard";

function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

function formatLabel(value, fallback) {
    if (!value) return fallback;
    return String(value).replace(/_/g, " ");
}

/**
 * Top-of-panel summary for a comparison result.
 *
 * Reads the `properties` block of the worker GeoJSON and renders a grid of
 * StatCards: dataset, comparison field, district A, district B, change.
 */
export default function SummaryCards({ meta }) {
    const dataset = meta?.dataset || {};
    const districtA = meta?.districtA || {};
    const districtB = meta?.districtB || {};
    const metrics = meta?.metrics || {};
    const diff = metrics.countDifference;
    const diffNumber = typeof diff === "number" ? diff : null;

    const ChangeIcon = diffNumber === null
        ? Minus
        : diffNumber > 0
            ? TrendingUp
            : diffNumber < 0
                ? TrendingDown
                : Minus;

    const changeValue = diffNumber === null
        ? "N/A"
        : `${diffNumber > 0 ? "+" : ""}${formatCount(diffNumber)}`;

    return (
        <div className="grid grid-cols-2 gap-2">
            <StatCard
                icon={Database}
                iconColor="text-[#134565]"
                label="Dataset"
                value={dataset.name || "Dataset"}
                size="sm"
            />
            <StatCard
                icon={Layers}
                iconColor="text-[#134565]"
                label="Field"
                value={formatLabel(meta?.comparisonFieldLabel || meta?.comparisonField, "Spatial distribution")}
                size="sm"
            />
            <StatCard
                icon={MapPin}
                iconColor="text-[#134565]"
                label={districtA.name || "District A"}
                value={`${formatCount(districtA.count)} features`}
                size="sm"
            />
            <StatCard
                icon={MapPin}
                iconColor="text-[#13B38D]"
                label={districtB.name || "District B"}
                value={`${formatCount(districtB.count)} features`}
                size="sm"
            />
            <StatCard
                icon={ChangeIcon}
                iconColor="text-[#0E8A6F]"
                label="Change"
                value={changeValue}
                description="District A minus District B"
                size="sm"
            />
        </div>
    );
}
