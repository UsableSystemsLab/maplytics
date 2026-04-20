import { cn } from "@/lib/utils";

export default function ProgressBar({
  value = null,
  className,
  barClassName,
  label,
}) {
  const indeterminate = value === null || value === undefined;
  const clamped = indeterminate ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-label={label || "Progress"}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      className={cn(
        "h-2 w-full rounded-full overflow-hidden",
        indeterminate ? "maplytics-sweep-track" : "bg-[rgba(14,49,71,0.08)]",
        className
      )}
    >
      {!indeterminate && (
        <div
          className={cn(
            "h-full maplytics-gradient-fill rounded-full transition-[width] duration-300 ease-out",
            barClassName
          )}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}
