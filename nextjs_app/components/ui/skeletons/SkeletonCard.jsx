import { cn } from "@/lib/utils";


export default function SkeletonCard({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
