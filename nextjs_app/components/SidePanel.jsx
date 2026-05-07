"use client";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Generic chrome lifted from ChartSidePanel so multiple panels can share the
 * same header / animation / scroll behaviour without duplicating styles.
 */
export default function SidePanel({
    isOpen,
    onClose,
    title,
    icon: Icon,
    width = 400,
    headerClassName = "bg-cyan",
    closeAriaLabel = "Close panel",
    className,
    bodyClassName,
    children,
}) {
    return (
        <div
            className={cn(
                "absolute right-0 top-0 bottom-0 z-30",
                "bg-white border-l border-gray-200 shadow-2xl",
                "flex flex-col",
                "transition-transform duration-300 ease-in-out",
                isOpen ? "translate-x-0" : "translate-x-full",
                className,
            )}
            style={{ width }}
            aria-hidden={!isOpen}
        >
            <div
                className={cn(
                    "px-5 py-4 flex items-center justify-between shrink-0",
                    headerClassName,
                )}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {Icon && <Icon className="w-5 h-5 text-white shrink-0" />}
                    <h3 className="text-lg font-bold text-white truncate">
                        {title}
                    </h3>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={closeAriaLabel}
                        className="p-1.5 rounded-lg text-white/80 hover:bg-white/20 hover:text-white transition-colors shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            <div className={cn("flex-1 overflow-y-auto p-5", bodyClassName)}>
                {children}
            </div>
        </div>
    );
}
