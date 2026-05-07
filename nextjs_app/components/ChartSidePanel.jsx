"use client";
import { BarChart3, AlertTriangle, Info } from "lucide-react";
import { useChartData, isBlocker } from "@/hooks/useChartData";
import BarChartComparison from "@/components/BarChartComparison";
import SidePanel from "@/components/SidePanel";

const BLOCKER_MESSAGES = {
    no_data: "No data available for chart analysis.",
    no_points: "This dataset contains polygon/line features. Bar chart requires point data.",
    no_categorical_fields: "This dataset has no categorical fields to group by.",
};

const WARNING_MESSAGES = {
    single_value: "All features share the same value — nothing to compare.",
    all_unique: "All values are unique for this field. Try a different field.",
    high_nulls: null, // dynamic — built in the component
};

/**
 * Slide-out right panel that displays a bar chart comparison on the map page.
 */
export default function ChartSidePanel({
    features,
    fieldsMetadata,
    isOpen,
    onClose,
}) {
    const { categoricalFields, selectedField, setSelectedField, chartData, diagnostics } =
        useChartData(features, fieldsMetadata);

    const total = chartData.reduce((s, d) => s + d.count, 0);
    const blocked = isBlocker(diagnostics.status);

    let warningMessage = null;
    if (!blocked) {
        if (diagnostics.status === "high_nulls") {
            warningMessage = `${diagnostics.nullPercent}% of features have no value for this field.`;
        } else {
            warningMessage = WARNING_MESSAGES[diagnostics.status] ?? null;
        }
    }

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="Bar Chart Comparison"
            icon={BarChart3}
            closeAriaLabel="Close chart panel"
        >
            {blocked ? (
                <div className="h-64 flex flex-col items-center justify-center text-center px-4">
                    <AlertTriangle className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">
                        {BLOCKER_MESSAGES[diagnostics.status]}
                    </p>
                </div>
            ) : (
                <>
                    <div className="mb-4 flex items-end gap-4">
                        <div className="flex-1">
                            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
                                Group by
                            </label>
                            <select
                                value={selectedField}
                                onChange={(e) => setSelectedField(e.target.value)}
                                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan focus:border-cyan"
                            >
                                {categoricalFields.map((f) => (
                                    <option key={f.name} value={f.name}>
                                        {f.name
                                            .replace(/_/g, " ")
                                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="text-right pb-0.5">
                            <span className="text-xs text-gray-500">Total</span>
                            <p className="text-lg font-bold text-gray-800">
                                {total.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {diagnostics.nonPointCount > 0 && (
                        <p className="text-xs text-gray-500 mb-3">
                            Showing {diagnostics.pointCount.toLocaleString()} of{" "}
                            {(diagnostics.pointCount + diagnostics.nonPointCount).toLocaleString()}{" "}
                            features (points only)
                        </p>
                    )}

                    {warningMessage && (
                        <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-700">{warningMessage}</p>
                        </div>
                    )}

                    <BarChartComparison data={chartData} />
                </>
            )}
        </SidePanel>
    );
}
