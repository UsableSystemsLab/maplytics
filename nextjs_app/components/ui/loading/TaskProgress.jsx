"use client";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Spinner from "./Spinner";
import ProgressBar from "./ProgressBar";


export default function TaskProgress({
  title,
  stage,
  status = "running",
  progress = null, // null = indeterminate
  errorMessage,
  onDismiss,
  className,
}) {
  if (status === "idle") return null;

  const isRunning = status === "running";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 right-6 z-[60] w-[360px] max-w-[calc(100vw-2rem)]",
        "bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        className
      )}
    >
      <div
        className={cn(
          "px-4 py-3 flex items-start gap-3",
          isRunning && "maplytics-gradient-fill text-white",
          isSuccess && "bg-[#13B38D] text-white",
          isError && "bg-red-600 text-white"
        )}
      >
        <div className="shrink-0 mt-0.5">
          {isRunning && <Spinner size="sm" className="text-white" />}
          {isSuccess && <CheckCircle2 className="w-5 h-5" />}
          {isError && <AlertCircle className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {title || (isRunning ? "Working…" : isSuccess ? "Done" : "Failed")}
          </p>
          {stage && isRunning && (
            <p className="text-xs text-white/85 truncate">{stage}</p>
          )}
          {isError && errorMessage && (
            <p className="text-xs text-white/90 truncate">{errorMessage}</p>
          )}
        </div>
        {(isSuccess || isError) && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {isRunning && (
        <div className="px-4 py-3 bg-white">
          <ProgressBar value={progress} label={stage || title} />
          {progress !== null && progress !== undefined && (
            <p className="text-xs text-gray-500 mt-1.5 text-right">
              {Math.round(progress)}%
            </p>
          )}
        </div>
      )}
    </div>
  );
}
