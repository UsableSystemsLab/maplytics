"use client";

import * as React from "react";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";

const ConfirmContext = React.createContext(null);

const INITIAL_STATE = { open: false, props: {}, resolver: null };

export function ConfirmDialogProvider({ children }) {
  const [state, setState] = React.useState(INITIAL_STATE);
  const [loading, setLoading] = React.useState(false);

  const confirm = React.useCallback((props = {}) => {
    return new Promise((resolve) => {
      setState({ open: true, props, resolver: resolve });
    });
  }, []);

  const close = React.useCallback((result) => {
    setState((prev) => {
      prev.resolver?.(result);
      return { ...prev, open: false };
    });
  }, []);

  const handleOpenChange = React.useCallback(
    (open) => {
      if (!open) close(false);
    },
    [close]
  );

  const handleConfirm = React.useCallback(async () => {
    const onConfirm = state.props.onConfirm;
    if (!onConfirm) {
      close(true);
      return;
    }
    try {
      setLoading(true);
      await onConfirm();
      close(true);
    } catch (error) {
      console.error("ConfirmDialog onConfirm error:", error);
      close(false);
    } finally {
      setLoading(false);
    }
  }, [state.props, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        {...state.props}
        open={state.open}
        loading={loading}
        onOpenChange={handleOpenChange}
        onConfirm={handleConfirm}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmDialogProvider");
  }
  return ctx;
}
