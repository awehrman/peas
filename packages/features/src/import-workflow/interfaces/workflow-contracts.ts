/**
 * Import Workflow Contracts
 * Defines the contracts and events for workflow operations
 */

import { type FeatureContext, type FeatureEvent } from "@peas/shared";
import {
  type ImportWorkflow,
  type WorkflowStep,
  type WorkflowTemplate,
} from "./workflow-provider";

export interface WorkflowEvent extends FeatureEvent {
  type:
    | "workflow-created"
    | "workflow-started"
    | "workflow-paused"
    | "workflow-resumed"
    | "workflow-completed"
    | "workflow-failed"
    | "workflow-cancelled"
    | "workflow-step-started"
    | "workflow-step-completed"
    | "workflow-step-failed";
  payload: {
    workflowId: string;
    context: FeatureContext;
  };
}

export interface WorkflowCreatedEvent extends WorkflowEvent {
  type: "workflow-created";
  payload: {
    workflowId: string;
    workflow: ImportWorkflow;
    template: WorkflowTemplate;
    context: FeatureContext;
  };
}

export interface WorkflowStartedEvent extends WorkflowEvent {
  type: "workflow-started";
  payload: {
    workflowId: string;
    workflow: ImportWorkflow;
    context: FeatureContext;
  };
}

export interface WorkflowPausedEvent extends WorkflowEvent {
  type: "workflow-paused";
  payload: {
    workflowId: string;
    workflow: ImportWorkflow;
    reason?: string;
    context: FeatureContext;
  };
}

export interface WorkflowResumedEvent extends WorkflowEvent {
  type: "workflow-resumed";
  payload: {
    workflowId: string;
    workflow: ImportWorkflow;
    context: FeatureContext;
  };
}

export interface WorkflowCompletedEvent extends WorkflowEvent {
  type: "workflow-completed";
  payload: {
    workflowId: string;
    workflow: ImportWorkflow;
    completionTime: number; // milliseconds
    context: FeatureContext;
  };
}

export interface WorkflowFailedEvent extends WorkflowEvent {
  type: "workflow-failed";
  payload: {
    workflowId: string;
    workflow: ImportWorkflow;
    error: string;
    context: FeatureContext;
  };
}

export interface WorkflowCancelledEvent extends WorkflowEvent {
  type: "workflow-cancelled";
  payload: {
    workflowId: string;
    workflow: ImportWorkflow;
    reason?: string;
    context: FeatureContext;
  };
}

export interface WorkflowStepStartedEvent extends WorkflowEvent {
  type: "workflow-step-started";
  payload: {
    workflowId: string;
    stepId: string;
    step: WorkflowStep;
    context: FeatureContext;
  };
}

export interface WorkflowStepCompletedEvent extends WorkflowEvent {
  type: "workflow-step-completed";
  payload: {
    workflowId: string;
    stepId: string;
    step: WorkflowStep;
    duration: number; // milliseconds
    context: FeatureContext;
  };
}

export interface WorkflowStepFailedEvent extends WorkflowEvent {
  type: "workflow-step-failed";
  payload: {
    workflowId: string;
    stepId: string;
    step: WorkflowStep;
    error: string;
    duration: number; // milliseconds
    context: FeatureContext;
  };
}

export interface WorkflowQuery {
  status?: ImportWorkflow["status"];
  templateId?: string;
  userId?: string;
  importId?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface WorkflowQueryResult {
  workflows: ImportWorkflow[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface WorkflowStepQuery {
  workflowId: string;
  status?: WorkflowStep["status"];
  type?: WorkflowStep["type"];
}

export interface WorkflowStepQueryResult {
  steps: WorkflowStep[];
  total: number;
}

export interface WorkflowTemplateQuery {
  isDefault?: boolean;
  name?: string;
  limit?: number;
  offset?: number;
}

export interface WorkflowTemplateQueryResult {
  templates: WorkflowTemplate[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface WorkflowBatchOperation {
  workflows: Array<{
    template: WorkflowTemplate;
    context?: Partial<FeatureContext>;
  }>;
}

export interface WorkflowBatchResult {
  successCount: number;
  failedCount: number;
  workflows: ImportWorkflow[];
  errors: Array<{
    index: number;
    error: string;
  }>;
}

export interface WorkflowMetrics {
  totalWorkflows: number;
  workflowsByStatus: Record<ImportWorkflow["status"], number>;
  workflowsByTemplate: Record<string, number>;
  averageCompletionTime: number;
  successRate: number;
  totalSteps: number;
  stepsByType: Record<WorkflowStep["type"], number>;
  stepsByStatus: Record<WorkflowStep["status"], number>;
  parallelExecutionStats: {
    maxConcurrentWorkflows: number;
    averageConcurrentWorkflows: number;
    workflowQueuingTime: number;
  };
}
