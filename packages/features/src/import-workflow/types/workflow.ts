export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: "file-upload" | "note-processing" | "validation" | "cleanup" | "completion";
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  order: number;
  dependencies: string[]; // step IDs
  config: Record<string, unknown>;
  startTime?: string;
  endTime?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ImportWorkflow {
  id: string;
  name: string;
  description?: string;
  status: "created" | "initializing" | "running" | "paused" | "completed" | "failed" | "cancelled";
  steps: WorkflowStep[];
  currentStep: string;
  progress: number; // 0-100
  startTime: string;
  endTime?: string;
  estimatedTimeRemaining?: number; // seconds
  metadata?: Record<string, unknown>;
  context?: WorkflowContext;
}

export interface WorkflowContext {
  featureName: string;
  operation: string;
  userId?: string;
  sessionId: string;
  importId: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  steps: Omit<WorkflowStep, "id" | "status" | "startTime" | "endTime" | "error">[];
  config: Record<string, unknown>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowConfig {
  autoStart?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableParallelExecution?: boolean;
  className?: string;
}

export interface WorkflowState {
  isRunning: boolean;
  currentStep: string;
  progress: number;
  error?: string;
  workflowId?: string;
}

export interface WorkflowResult {
  success: boolean;
  workflowId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowOptions {
  template?: WorkflowTemplate;
  context?: Partial<WorkflowContext>;
  config?: WorkflowConfig;
}
