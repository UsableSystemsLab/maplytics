"use client";

import * as React from "react";
import { AlertTriangle, Info, Loader2, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconWrap: "bg-destructive/10 text-destructive ring-destructive/5",
    confirmVariant: "destructive",
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: "bg-amber-100 text-amber-600 ring-amber-500/10",
    confirmVariant: "default",
  },
  info: {
    icon: Info,
    iconWrap: "bg-cyan/10 text-cyan ring-cyan/10",
    confirmVariant: "default",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  variant = "danger",
  icon: IconOverride,
  title,
  description,
  itemName,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
}) {
  const config = VARIANTS[variant] ?? VARIANTS.danger;
  const Icon = IconOverride ?? config.icon;
  const showCancel = cancelLabel !== null;

  const handleConfirm = async (e) => {
    e.preventDefault();
    await onConfirm?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <AlertDialogContent
        overlayClassName="bg-primary/40 backdrop-blur-sm"
        className={cn(
          "max-w-md gap-0 rounded-2xl border-0 p-0 duration-300",
          "shadow-[0_25px_50px_-12px_rgba(14,49,71,0.25)]",
          "sm:max-w-[440px]"
        )}
      >
        <div className="px-7 pt-7 pb-5">
          <AlertDialogHeader className="!place-items-start !text-left">
            <div
              className={cn(
                "mb-5 flex size-14 items-center justify-center rounded-2xl ring-8",
                config.iconWrap
              )}
            >
              <Icon className="size-7" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold tracking-tight text-heading">
              {title}
            </AlertDialogTitle>
            {(description || itemName) && (
              <AlertDialogDescription className="mt-2 text-[15px] leading-relaxed text-body-text">
                {description}
                {itemName && (
                  <>
                    {description ? " " : ""}
                    <span className="ml-0.5 inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-sm font-medium text-heading">
                      {itemName}
                    </span>
                  </>
                )}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
        </div>

        <AlertDialogFooter className="px-7 pt-2 pb-7">
          {showCancel && (
            <AlertDialogCancel disabled={loading} className="min-w-[100px]">
              {cancelLabel}
            </AlertDialogCancel>
          )}
          <AlertDialogAction
            variant={config.confirmVariant}
            disabled={loading}
            onClick={handleConfirm}
            className="min-w-[100px]"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                {confirmLabel}
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
