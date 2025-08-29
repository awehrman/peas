/**
 * Import Workflow Provider Interface
 * Defines the contract for managing import workflows
 */

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

export interface WorkflowProvider {
  /**
   * Create a new workflow
   */
  createWorkflow(
    template: WorkflowTemplate,
    context?: Partial<WorkflowContext>
  ): Promise<ImportWorkflow>;

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Promise<ImportWorkflow | null>;

  /**
   * Update workflow status
   */
  updateWorkflowStatus(
    workflowId: string,
    status: ImportWorkflow["status"],
    metadata?: Record<string, unknown>
  ): Promise<ImportWorkflow>;

  /**
   * Update workflow progress
   */
  updateWorkflowProgress(
    workflowId: string,
    progress: number,
    currentStep: string,
    metadata?: Record<string, unknown>
  ): Promise<ImportWorkflow>;

  /**
   * Start workflow execution
   */
  startWorkflow(workflowId: string): Promise<ImportWorkflow>;

  /**
   * Pause workflow execution
   */
  pauseWorkflow(workflowId: string, reason?: string): Promise<ImportWorkflow>;

  /**
   * Resume workflow execution
   */
  resumeWorkflow(workflowId: string): Promise<ImportWorkflow>;

  /**
   * Cancel workflow execution
   */
  cancelWorkflow(workflowId: string, reason?: string): Promise<ImportWorkflow>;

  /**
   * Update step status
   */
  updateStepStatus(
    workflowId: string,
    stepId: string,
    status: WorkflowStep["status"],
    error?: string,
    metadata?: Record<string, unknown>
  ): Promise<WorkflowStep>;

  /**
   * Complete a step
   */
  completeStep(
    workflowId: string,
    stepId: string,
    metadata?: Record<string, unknown>
  ): Promise<WorkflowStep>;

  /**
   * Fail a step
   */
  failStep(
    workflowId: string,
    stepId: string,
    error: string,
    metadata?: Record<string, unknown>
  ): Promise<WorkflowStep>;

  /**
   * Get next steps to execute
   */
  getNextSteps(workflowId: string): Promise<WorkflowStep[]>;

  /**
   * Validate workflow dependencies
   */
  validateWorkflow(workflowId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    dependencyGraph: Record<string, string[]>;
  }>;

  /**
   * Get workflow templates
   */
  getWorkflowTemplates(): Promise<WorkflowTemplate[]>;

  /**
   * Create workflow template
   */
  createWorkflowTemplate(
    template: Omit<WorkflowTemplate, "id" | "createdAt" | "updatedAt">
  ): Promise<WorkflowTemplate>;

  /**
   * Get workflow statistics
   */
  getWorkflowStats(
    timeRange?: { since: Date; until: Date }
  ): Promise<{
    totalWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    averageCompletionTime: number;
    successRate: number;
    workflowsByStatus: Record<ImportWorkflow["status"], number>;
    stepsByType: Record<WorkflowStep["type"], number>;
  }>;
}

export interface WorkflowProviderConfig {
  maxWorkflowsPerUser: number;
  maxStepsPerWorkflow: number;
  maxConcurrentWorkflows: number;
  enableParallelExecution: boolean;
  enableRetryOnFailure: boolean;
  maxRetryAttempts: number;
  retryDelay: number; // milliseconds
  enableMetrics: boolean;
  defaultTemplates: WorkflowTemplate[];
}
