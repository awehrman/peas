/**
 * Import Dashboard Provider Interface
 * Defines the contract for managing import dashboard operations
 */

export interface DashboardWidget {
  id: string;
  type: "progress" | "stats" | "chart" | "list" | "summary";
  title: string;
  description?: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, unknown>;
  data?: unknown;
  lastUpdated: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  columns: number;
  rows: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardState {
  importId: string;
  status: "initializing" | "active" | "paused" | "completed" | "failed";
  currentStep: string;
  progress: number; // 0-100
  startTime: string;
  endTime?: string;
  estimatedTimeRemaining?: number; // seconds
  errors: Array<{
    id: string;
    message: string;
    timestamp: string;
    severity: "low" | "medium" | "high" | "critical";
    resolved: boolean;
  }>;
  warnings: Array<{
    id: string;
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
  metadata?: Record<string, unknown>;
  context?: DashboardContext;
}

export interface DashboardContext {
  featureName: string;
  operation: string;
  userId?: string;
  sessionId: string;
  importId: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardProvider {
  /**
   * Create a new dashboard for an import
   */
  createDashboard(
    importId: string,
    layout?: DashboardLayout,
    context?: Partial<DashboardContext>
  ): Promise<DashboardState>;

  /**
   * Get dashboard state
   */
  getDashboardState(importId: string): Promise<DashboardState | null>;

  /**
   * Update dashboard state
   */
  updateDashboardState(
    importId: string,
    updates: Partial<DashboardState>
  ): Promise<DashboardState>;

  /**
   * Add a widget to the dashboard
   */
  addWidget(
    importId: string,
    widget: Omit<DashboardWidget, "id" | "lastUpdated">
  ): Promise<DashboardWidget>;

  /**
   * Update a widget
   */
  updateWidget(
    importId: string,
    widgetId: string,
    updates: Partial<DashboardWidget>
  ): Promise<DashboardWidget>;

  /**
   * Remove a widget from the dashboard
   */
  removeWidget(importId: string, widgetId: string): Promise<void>;

  /**
   * Get dashboard widgets
   */
  getWidgets(importId: string): Promise<DashboardWidget[]>;

  /**
   * Update widget data
   */
  updateWidgetData(
    importId: string,
    widgetId: string,
    data: unknown
  ): Promise<void>;

  /**
   * Save dashboard layout
   */
  saveLayout(
    importId: string,
    layout: DashboardLayout
  ): Promise<void>;

  /**
   * Get dashboard layout
   */
  getLayout(importId: string): Promise<DashboardLayout | null>;

  /**
   * Add error to dashboard
   */
  addError(
    importId: string,
    error: {
      message: string;
      severity: "low" | "medium" | "high" | "critical";
    }
  ): Promise<void>;

  /**
   * Add warning to dashboard
   */
  addWarning(
    importId: string,
    warning: {
      message: string;
    }
  ): Promise<void>;

  /**
   * Resolve error
   */
  resolveError(importId: string, errorId: string): Promise<void>;

  /**
   * Resolve warning
   */
  resolveWarning(importId: string, warningId: string): Promise<void>;

  /**
   * Get dashboard statistics
   */
  getDashboardStats(
    importId?: string,
    timeRange?: { since: Date; until: Date }
  ): Promise<{
    totalImports: number;
    activeImports: number;
    completedImports: number;
    failedImports: number;
    averageCompletionTime: number;
    successRate: number;
    widgetsCreated: number;
    errorsPerImport: number;
  }>;
}

export interface DashboardProviderConfig {
  maxWidgetsPerDashboard: number;
  maxWidgetSize: { width: number; height: number };
  updateInterval: number; // milliseconds
  enableRealTimeUpdates: boolean;
  enableMetrics: boolean;
  defaultLayout: DashboardLayout;
  widgetTypes: string[];
}
