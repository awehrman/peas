"use client";

import { useCallback, useState } from "react";
import { WorkflowState, WorkflowResult, WorkflowOptions } from "../types/workflow";

export interface UseWorkflowOptions {
  autoStart?: boolean;
  onSuccess?: (result: WorkflowResult) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number) => void;
}

export interface UseWorkflowReturn {
  state: WorkflowState;
  startWorkflow: (options?: WorkflowOptions) => Promise<WorkflowResult>;
  pauseWorkflow: () => Promise<WorkflowResult>;
  resumeWorkflow: () => Promise<WorkflowResult>;
  cancelWorkflow: (reason?: string) => Promise<WorkflowResult>;
  reset: () => void;
}

export function useWorkflow(options: UseWorkflowOptions = {}): UseWorkflowReturn {
  const [state, setState] = useState<WorkflowState>({
    isRunning: false,
    currentStep: "idle",
    progress: 0,
  });

  const startWorkflow = useCallback(async (
    workflowOptions: WorkflowOptions = {}
  ): Promise<WorkflowResult> => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      currentStep: "initializing",
      progress: 0,
      error: undefined,
    }));

    try {
      // Simulate workflow initialization
      await new Promise(resolve => setTimeout(resolve, 500));

      setState(prev => ({
        ...prev,
        currentStep: "file-upload",
        progress: 10,
      }));

      // Simulate file upload step
      await new Promise(resolve => setTimeout(resolve, 1000));

      setState(prev => ({
        ...prev,
        currentStep: "note-processing",
        progress: 30,
      }));

      // Simulate note processing step
      await new Promise(resolve => setTimeout(resolve, 1500));

      setState(prev => ({
        ...prev,
        currentStep: "validation",
        progress: 60,
      }));

      // Simulate validation step
      await new Promise(resolve => setTimeout(resolve, 800));

      setState(prev => ({
        ...prev,
        currentStep: "cleanup",
        progress: 80,
      }));

      // Simulate cleanup step
      await new Promise(resolve => setTimeout(resolve, 500));

      setState(prev => ({
        ...prev,
        currentStep: "completion",
        progress: 100,
        isRunning: false,
      }));

      const result: WorkflowResult = {
        success: true,
        workflowId: `workflow-${Date.now()}`,
        metadata: workflowOptions.context,
      };

      options.onSuccess?.(result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Workflow failed";

      setState(prev => ({
        ...prev,
        isRunning: false,
        currentStep: "error",
        error: errorMessage,
      }));

      options.onError?.(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [options]);

  const pauseWorkflow = useCallback(async (): Promise<WorkflowResult> => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentStep: "paused",
    }));

    return {
      success: true,
      workflowId: state.workflowId,
    };
  }, [state.workflowId]);

  const resumeWorkflow = useCallback(async (): Promise<WorkflowResult> => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      currentStep: prev.currentStep === "paused" ? "resuming" : prev.currentStep,
    }));

    return {
      success: true,
      workflowId: state.workflowId,
    };
  }, [state.workflowId]);

  const cancelWorkflow = useCallback(async (reason?: string): Promise<WorkflowResult> => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      currentStep: "cancelled",
      error: reason,
    }));

    return {
      success: false,
      workflowId: state.workflowId,
      error: reason || "Workflow cancelled",
    };
  }, [state.workflowId]);

  const reset = useCallback(() => {
    setState({
      isRunning: false,
      currentStep: "idle",
      progress: 0,
      error: undefined,
      workflowId: undefined,
    });
  }, []);

  return {
    state,
    startWorkflow,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    reset,
  };
}
