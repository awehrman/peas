export interface ImportStats {
  noteCount: number;
  ingredientCount: number;
  parsingErrorCount: number;
}

export interface DashboardConfig {
  autoRefresh?: boolean;
  refreshInterval?: number;
  showDetails?: boolean;
  className?: string;
}

export interface DashboardState {
  isLoading: boolean;
  stats: ImportStats;
  lastUpdated: Date;
  error?: string;
}

export interface DashboardMetrics {
  totalNotes: number;
  totalIngredients: number;
  totalErrors: number;
  successRate: number;
  averageProcessingTime?: number;
}

export interface DashboardFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: "all" | "completed" | "failed" | "processing";
  type?: "all" | "notes" | "ingredients" | "errors";
}

export interface DashboardSummary {
  period: string;
  metrics: DashboardMetrics;
  trends: {
    notes: number;
    ingredients: number;
    errors: number;
  };
}
