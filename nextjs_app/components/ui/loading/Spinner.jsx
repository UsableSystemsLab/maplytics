import { cn } from "@/lib/utils";

const SIZES = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
};


export default function Spinner({ size = "md", className, label }) {
  return (
    <span
      role="status"
      aria-label={label || "Loading"}
      className={cn("inline-flex items-center justify-center", className)}
    >
      <span
        aria-hidden="true"
        className={cn("maplytics-spinner-ring block", SIZES[size] || SIZES.md)}
      />
      <span className="sr-only">{label || "Loading…"}</span>
    </span>
  );
}
