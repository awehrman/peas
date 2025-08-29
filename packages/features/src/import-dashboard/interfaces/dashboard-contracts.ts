/**
 * Import Dashboard Contracts
 * Defines the contracts and events for dashboard operations
 */

import { type FeatureContext, type FeatureEvent } from "@peas/shared";
import {
  type DashboardState,
  type DashboardWidget,
  type DashboardLayout,
} from "./dashboard-provider";

export interface DashboardEvent extends FeatureEvent {
  type:
    | "dashboard-created"
    | "dashboard-updated"
    | "dashboard-widget-added"
    | "dashboard-widget-updated"
    | "dashboard-widget-removed"
    | "dashboard-error-added"
    | "dashboard-warning-added";
  payload: {
    importId: string;
    context: FeatureContext;
  };
}

export interface DashboardCreatedEvent extends DashboardEvent {
  type: "dashboard-created";
  payload: {
    importId: string;
    dashboard: DashboardState;
    layout?: DashboardLayout;
    context: FeatureContext;
  };
}

export interface DashboardUpdatedEvent extends DashboardEvent {
  type: "dashboard-updated";
  payload: {
    importId: string;
    dashboard: DashboardState;
    previousState?: Partial<DashboardState>;
    context: FeatureContext;
  };
}

export interface DashboardWidgetAddedEvent extends DashboardEvent {
  type: "dashboard-widget-added";
  payload: {
    importId: string;
    widget: DashboardWidget;
    context: FeatureContext;
  };
}

export interface DashboardWidgetUpdatedEvent extends DashboardEvent {
  type: "dashboard-widget-updated";
  payload: {
    importId: string;
    widget: DashboardWidget;
    previousWidget?: Partial<DashboardWidget>;
    context: FeatureContext;
  };
}

export interface DashboardWidgetRemovedEvent extends DashboardEvent {
  type: "dashboard-widget-removed";
  payload: {
    importId: string;
    widgetId: string;
    widgetType: DashboardWidget["type"];
    context: FeatureContext;
  };
}

export interface DashboardErrorAddedEvent extends DashboardEvent {
  type: "dashboard-error-added";
  payload: {
    importId: string;
    error: {
      id: string;
      message: string;
      severity: "low" | "medium" | "high" | "critical";
      timestamp: string;
    };
    context: FeatureContext;
  };
}

export interface DashboardWarningAddedEvent extends DashboardEvent {
  type: "dashboard-warning-added";
  payload: {
    importId: string;
    warning: {
      id: string;
      message: string;
      timestamp: string;
    };
    context: FeatureContext;
  };
}

export interface DashboardQuery {
  importId?: string;
  status?: DashboardState["status"];
  widgetType?: DashboardWidget["type"];
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface DashboardQueryResult {
  dashboards: DashboardState[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface DashboardWidgetQuery {
  importId: string;
  widgetType?: DashboardWidget["type"];
  includeData?: boolean;
}

export interface DashboardWidgetQueryResult {
  widgets: DashboardWidget[];
  total: number;
}

export interface DashboardBatchOperation {
  dashboards: Array<{
    importId: string;
    layout?: DashboardLayout;
    context?: Partial<FeatureContext>;
  }>;
}

export interface DashboardBatchResult {
  successCount: number;
  failedCount: number;
  dashboards: DashboardState[];
  errors: Array<{
    index: number;
    importId: string;
    error: string;
  }>;
}

export interface DashboardMetrics {
  totalDashboards: number;
  dashboardsByStatus: Record<DashboardState["status"], number>;
  dashboardsByImport: Record<string, number>;
  totalWidgets: number;
  widgetsByType: Record<DashboardWidget["type"], number>;
  averageWidgetsPerDashboard: number;
  errorsBySeverity: Record<string, number>;
  warnings: number;
  realTimeUpdates: {
    activeDashboards: number;
    updatesPerMinute: number;
  };
}
