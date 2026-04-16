"use client";

/**
 * StatCard - Reusable statistics card component
 * 
 * Used in Analysis Panel and dashboard to display key metrics
*/

export default function StatCard({
    icon: Icon,
    iconColor = "text-[#2C3580]",
    label,
    value,
    description
}) {
    return (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
                {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
                <span className="text-xs font-medium text-gray-600 uppercase">
                    {label}
                </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 capitalize">
                {value || 'N/A'}
            </p>
            {description && (
                <p className="text-xs text-gray-500 mt-1">{description}</p>
            )}
        </div>
    );
}
