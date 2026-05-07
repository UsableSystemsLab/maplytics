"use client";

import { cn } from "@/lib/utils";

/**
 * StatCard - Reusable statistics card component
 *
 * Used in Analysis Panel and dashboard to display key metrics.
 * `size="md"` (default) keeps the dashboard sizing; `size="sm"` is a compact
 * variant intended for narrow panels (e.g. comparison side panel).
 */

const SIZES = {
    md: {
        wrapper: "p-4",
        header: "mb-2 gap-2",
        icon: "w-4 h-4",
        label: "text-xs",
        value: "text-2xl",
        description: "text-xs",
    },
    sm: {
        wrapper: "p-2.5",
        header: "mb-1 gap-1.5",
        icon: "w-3.5 h-3.5",
        label: "text-[10px]",
        value: "text-sm",
        description: "text-[10px]",
    },
};

export default function StatCard({
    icon: Icon,
    iconColor = "text-[#2C3580]",
    label,
    value,
    description,
    size = "md",
}) {
    const s = SIZES[size] || SIZES.md;

    return (
        <div className={cn("bg-gray-50 rounded-lg border border-gray-200", s.wrapper)}>
            <div className={cn("flex items-center", s.header)}>
                {Icon && <Icon className={cn(s.icon, iconColor)} />}
                <span className={cn("font-medium text-gray-600 uppercase truncate", s.label)}>
                    {label}
                </span>
            </div>
            <p className={cn("font-bold text-gray-900 capitalize truncate", s.value)}>
                {value || 'N/A'}
            </p>
            {description && (
                <p className={cn("text-gray-500 mt-1 truncate", s.description)}>{description}</p>
            )}
        </div>
    );
}
