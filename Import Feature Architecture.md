# Import Feature Architecture

This document outlines the proposed organization, state management, and architectural decisions for the **Import feature** within a Next.js monorepo.

---

## High-Level Overview

The `/import` route displays three main sections:

- **File Upload** – upload new files, view current/previous batches.
- **Import Statistics** – aggregate stats (ingredients, notes, errors).
- **Activity Log** – virtualized, paginated cards showing the status of each file’s import process.

Each card listens for **WebSocket events** that broadcast the status of individual imports across defined categories (uploaded note, cleaning note, saved note, processing ingredients/instructions/images, saving source, adding tags/categories, checking duplicates).

---

## State Management

The feature is split into multiple **context layers** for separation of concerns:

### Upload Context

- **State**

  ```ts
  type UploadBatch = {
    importId: string;
    createdAt: string;
    numberOfFiles: number;
    successMessage?: string;
    errorMessage?: string;
  };

  interface UploadState {
    currentBatch?: UploadBatch;
    previousBatches: UploadBatch[];
  }
  ```

- **Actions**

  ```ts
  type UploadAction =
    | {
        type: "START_BATCH";
        importId: string;
        createdAt: string;
        numberOfFiles: number;
      }
    | { type: "COMPLETE_BATCH"; successMessage: string }
    | { type: "FAIL_BATCH"; errorMessage: string }
    | { type: "RESET_CURRENT_BATCH" };
  ```

- **Provider/Hook**
  - `UploadProvider`
  - `useUpload()`

### WebSocket Context

- **State**

  ```ts
  interface WsConnectionState {
    lastSuccessfulConnectionAt?: string;
    status: "idle" | "connecting" | "connected" | "error" | "reconnecting";
    reconnectionAttempts: number;
  }
  ```

- **Actions**

  ```ts
  type WsAction =
    | { type: "WS_CONNECTING" }
    | { type: "WS_CONNECTED"; timestamp: string }
    | { type: "WS_DISCONNECTED" }
    | { type: "WS_RETRY" }
    | { type: "WS_ERROR" };
  ```

- **Provider/Hook**
  - `WsProvider`
  - `useWs()`

- **Connection Strategy**
  - Singleton WebSocket per user session.
  - Reconnection uses exponential backoff.
  - Errors are only surfaced after 3 failed attempts.

### Stats Context

- **State**

  ```ts
  interface ImportStatsState {
    numberOfIngredients: number;
    numberOfNotes: number;
    numberOfParsingErrors: number;
  }
  ```

- **Actions**

  ```ts
  type StatsAction =
    | { type: "INCREMENT_INGREDIENTS"; count: number }
    | { type: "INCREMENT_NOTES"; count: number }
    | { type: "INCREMENT_ERRORS"; count: number }
    | { type: "RESET_STATS" };
  ```

- **Provider/Hook**
  - `StatsProvider`
  - `useStats()`

- **Behavior**
  - Stats are updated automatically per step in real-time.

### Activity Context

- **Types**

  ```ts
  type StepStatus = {
    started: boolean;
    completed: boolean;
    hasError: boolean;
    startMessage?: string;
    completedMessage?: string;
    errorMessage?: string;
    progressMessage?: string;
    steps?: number;
    processedSteps?: number;
    erroredSteps?: number;
  };

  type ImportCard = {
    id: string;
    isExpanded: boolean;
    imageThumbnail?: string;
    status: {
      uploaded: StepStatus;
      cleanedNote: StepStatus;
      savedNote: StepStatus;
      ingredientProcessing: StepStatus;
      instructionProcessing: StepStatus;
      connectingSource: StepStatus;
      addingImages: StepStatus;
      addingTags: StepStatus;
      addingCategories: StepStatus;
      checkDuplicates: StepStatus;
    };
  };

  interface ActivityState {
    totalImported: number;
    totalFailed: number;
    numPages: number;
    currentPageIndex: number;
    imports: Record<number, ImportCard[]>; // keyed by page index
  }
  ```

- **Actions**

  ```ts
  type ActivityAction =
    | { type: "ADD_IMPORT_CARD"; pageIndex: number; card: ImportCard }
    | { type: "TOGGLE_CARD_EXPANDED"; pageIndex: number; cardId: string }
    | {
        type: "UPDATE_CARD_STATUS";
        pageIndex: number;
        cardId: string;
        step: keyof ImportCard["status"];
        statusUpdate: Partial<StepStatus>;
      }
    | { type: "SET_PAGE"; pageIndex: number }
    | { type: "RESET_ACTIVITY" };
  ```

- **Provider/Hook**
  - `ActivityProvider`
  - `useActivity()`

- **Behavior**
  - Pagination handled client-side, memory only (no persistence across refreshes).
  - Card expansion state kept in memory only.
  - Use `react-window` for virtualization.
  - Two generic action types for steps: a base one for standard steps and one for steps with zero or more dynamic steps.

### Combined Import Types

```ts
type ImportAction = UploadAction | WsAction | StatsAction | ActivityAction;
interface ImportState {
  uploads: UploadState;
  wsConnection: WsConnectionState;
  stats: ImportStatsState;
  activity: ActivityState;
}
```

### Import Reducer Skeleton

```ts
function importReducer(state: ImportState, action: ImportAction): ImportState {
  switch (action.type) {
    // handle UploadAction, WsAction, StatsAction, ActivityAction separately
    default:
      return state;
  }
}
```

### Import Provider

- Wraps all sub-contexts into a single tree.
- **Usage**: in `apps/web/routes/import/page.tsx`

  ```tsx
  <ImportProvider>
    <ImportPage />
  </ImportProvider>
  ```

---

## Feature Folder Structure

```
/packages/features/import
  /context
    import-provider.tsx
    upload-context.tsx
    ws-context.tsx
    stats-context.tsx
    activity-context.tsx

  /hooks
    use-import.ts
    use-upload.ts
    use-ws.ts
    use-stats.ts
    use-activity.ts

  /ui
    import-page.tsx
    upload-section.tsx
    stats-section.tsx
    activity-log.tsx
    activity-card.tsx
    activity-status-step.tsx

  /utils
    import-types.ts
    import-reducer.ts
    ws-messages.ts
    formatters.ts
```

---

## UI Composition

- **apps/web/routes/import/page.tsx**

  ```tsx
  <ImportProvider>
    <ImportPage />
  </ImportProvider>
  ```

- **import-page.tsx**

  ```tsx
  <UploadSection />
  <StatsSection />
  <ActivityLog />
  ```

- **UploadSection**
  - Handles file uploads, current batch, and past batches.
  - Remains import-specific for now, with the potential to extract generic UI components.

- **ActivityLog**
  - Renders paginated, virtualized `ActivityCard`s using `react-window`.
  - Each card listens to WebSocket events and updates statuses.
