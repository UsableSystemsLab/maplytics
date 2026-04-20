"use client";

import * as React from "react";
import TaskProgress from "@/components/ui/loading/TaskProgress";

const TaskContext = React.createContext(null);

const INITIAL = {
  status: "idle", // idle | running | success | error
  title: "",
  stage: "",
  progress: null, // null = indeterminate
  errorMessage: "",
};

export function TaskProgressProvider({ children }) {
  const [task, setTask] = React.useState(INITIAL);
  const timersRef = React.useRef([]);
  const autoDismissRef = React.useRef(null);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (autoDismissRef.current) {
      clearTimeout(autoDismissRef.current);
      autoDismissRef.current = null;
    }
  }, []);

  const scheduleStages = React.useCallback((stages = []) => {
    stages.forEach((s, idx) => {
      const delay = s.at ?? (idx === 0 ? 0 : 1500 * idx);
      const id = setTimeout(() => {
        setTask((prev) =>
          prev.status === "running" ? { ...prev, stage: s.label } : prev
        );
      }, delay);
      timersRef.current.push(id);
    });
  }, []);

  const start = React.useCallback(
    ({ title, stages, progress = null }) => {
      clearTimers();
      const firstStage = stages?.[0]?.label || "";
      setTask({
        status: "running",
        title: title || "Working…",
        stage: firstStage,
        progress,
        errorMessage: "",
      });
      if (stages?.length) scheduleStages(stages);
    },
    [clearTimers, scheduleStages]
  );

  const succeed = React.useCallback((message) => {
    clearTimers();
    setTask((prev) => ({
      ...prev,
      status: "success",
      title: message || prev.title || "Done",
      stage: "",
      progress: null,
    }));
    autoDismissRef.current = setTimeout(() => {
      setTask(INITIAL);
    }, 2500);
  }, [clearTimers]);

  const fail = React.useCallback((message) => {
    clearTimers();
    setTask((prev) => ({
      ...prev,
      status: "error",
      stage: "",
      progress: null,
      errorMessage: message || "Something went wrong",
    }));
  }, [clearTimers]);

  const dismiss = React.useCallback(() => {
    clearTimers();
    setTask(INITIAL);
  }, [clearTimers]);

  React.useEffect(() => clearTimers, [clearTimers]);

  const value = React.useMemo(
    () => ({ task, start, succeed, fail, dismiss }),
    [task, start, succeed, fail, dismiss]
  );

  return (
    <TaskContext.Provider value={value}>
      {children}
      <TaskProgress
        title={task.title}
        stage={task.stage}
        status={task.status === "idle" ? "idle" : task.status}
        progress={task.progress}
        errorMessage={task.errorMessage}
        onDismiss={dismiss}
      />
    </TaskContext.Provider>
  );
}

function useTaskContext() {
  const ctx = React.useContext(TaskContext);
  if (!ctx) {
    throw new Error(
      "useAsyncTask must be used within a <TaskProgressProvider />"
    );
  }
  return ctx;
}

export function useAsyncTask() {
  const { task, start, succeed, fail, dismiss } = useTaskContext();

  const run = React.useCallback(
    async (fn, options = {}) => {
      const {
        title,
        stages,
        progress = null,
        successMessage,
        rethrow = true,
      } = options;
      start({ title, stages, progress });
      try {
        const result = await fn();
        succeed(successMessage);
        return result;
      } catch (err) {
        fail(err?.message || "Failed");
        if (rethrow) throw err;
        return undefined;
      }
    },
    [start, succeed, fail]
  );

  return {
    run,
    status: task.status,
    stage: task.stage,
    error: task.errorMessage,
    dismiss,
    isRunning: task.status === "running",
  };
}
