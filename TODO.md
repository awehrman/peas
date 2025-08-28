# TODO: Import Feature Cleanup & Refactor

## 🏗️ **Phase 1: Architecture & Structure**

### **1.1 Create New Feature Directories**

- [ ] Create `features/pagination/` directory with:
  - [ ] `contexts/pagination-context.tsx`
  - [ ] `reducers/pagination-reducer.ts`
  - [ ] `components/PaginationControls.tsx`
  - [ ] `components/PaginationSummary.tsx`
  - [ ] `types/pagination.ts`
  - [ ] `hooks/use-pagination.ts` (move from root hooks)
  - [ ] `index.ts`

- [ ] Create `features/virtualized-list/` directory with:
  - [ ] `components/VirtualizedList.tsx` (generic wrapper)
  - [ ] `hooks/use-virtualization.ts` (move from root hooks)
  - [ ] `types/virtualization.ts`
  - [ ] `index.ts`

- [ ] Create `features/collapsible/` directory with:
  - [ ] `contexts/collapsible-context.tsx`
  - [ ] `reducers/collapsible-reducer.ts`
  - [ ] `components/CollapsibleWrapper.tsx`
  - [ ] `types/collapsible.ts`
  - [ ] `hooks/use-collapsible.ts` (extract from activity-monitoring)
  - [ ] `index.ts`

- [ ] Create `features/import-card/` directory with:
  - [ ] `contexts/import-card-context.tsx`
  - [ ] `reducers/import-card-reducer.ts`
  - [ ] `types/import-card.ts`
  - [ ] `hooks/use-import-card.ts`
  - [ ] `index.ts`

- [ ] Create `features/websocket-manager/` directory with:
  - [ ] `contexts/websocket-context.tsx` (move from contexts)
  - [ ] `reducers/websocket-reducer.ts`
  - [ ] `types/websocket.ts`
  - [ ] `hooks/use-websocket.ts` (move from root hooks)
  - [ ] `index.ts`

### **1.2 Create UI Atomic Design Structure**

- [ ] Create `ui/atoms/` directory with:
  - [ ] `StatusIcon.tsx` (extract from activity-log)
  - [ ] `Title.tsx`
  - [ ] `ProgressBar.tsx`
  - [ ] `Button.tsx`
  - [ ] `Icon.tsx`
  - [ ] `index.ts`

- [ ] Create `ui/molecules/` directory with:
  - [ ] `StatusList.tsx`
  - [ ] `StatusListItem.tsx`
  - [ ] `CardHeader.tsx`
  - [ ] `CardContent.tsx`
  - [ ] `ProgressStatusBar.tsx` (move from activity-log)
  - [ ] `index.ts`

- [ ] Create `ui/organisms/` directory with:
  - [ ] `ImportCard.tsx` (main organism)
  - [ ] `ActivityLog.tsx` (orchestrator)
  - [ ] `FileUpload.tsx` (move from file-upload)
  - [ ] `index.ts`

- [ ] Create `ui/templates/` directory with:
  - [ ] `ImportPageTemplate.tsx`
  - [ ] `DashboardTemplate.tsx`
  - [ ] `index.ts`

### **1.3 Create Shared Infrastructure**

- [ ] Create `shared/types/` directory with:
  - [ ] `status.ts` (move core status types)
  - [ ] `common.ts` (shared interfaces)
  - [ ] `index.ts`

- [ ] Create `shared/utils/` directory with:
  - [ ] `formatting.ts` (move from utils)
  - [ ] `validation.ts`
  - [ ] `constants.ts`
  - [ ] `index.ts`

- [ ] Create `shared/hooks/` directory with:
  - [ ] `use-performance-monitoring.ts` (move from root hooks)
  - [ ] `use-optimized-upload.ts` (move from root hooks)
  - [ ] `index.ts`

## 🔧 **Phase 2: Extract & Refactor Components**

### **2.1 Extract Generic Features**

#### **Pagination Feature**

- [ ] Extract pagination logic from `hooks/use-pagination.ts`
- [ ] Create generic `PaginationContext` with reducer
- [ ] Move `components/activity-log/pagination-controls.tsx` to `features/pagination/`
- [ ] Ensure no early returns before hooks in pagination components
- [ ] Add unit tests for pagination feature
- [ ] Create pagination utilities for different data types

#### **Virtualized List Feature**

- [ ] Extract virtualization logic from `hooks/use-dynamic-virtualization.ts`
- [ ] Create generic `VirtualizedList` component with TypeScript generics
- [ ] Move `components/activity-log/components/virtualized-activity-items-list.tsx` logic
- [ ] Ensure no early returns before hooks in virtualization components
- [ ] Add unit tests for virtualized list feature
- [ ] Create virtualized list utilities for different item types

#### **Collapsible Feature**

- [ ] Extract collapsible logic from `contexts/` and activity-log components
- [ ] Create generic `CollapsibleContext` with reducer
- [ ] Move collapsible components from activity-log
- [ ] Ensure no early returns before hooks in collapsible components
- [ ] Add unit tests for collapsible feature
- [ ] Create collapsible utilities for different content types

#### **WebSocket Manager Feature**

- [ ] Extract websocket logic from `contexts/websocket-manager.ts`
- [ ] Create generic `WebSocketContext` with reducer
- [ ] Move websocket components and hooks
- [ ] Ensure no early returns before hooks in websocket components
- [ ] Add unit tests for websocket feature
- [ ] Create websocket utilities for different event types

### **2.2 Extract Import Card Components**

- [ ] Break `collapsible-import-item.tsx` into smaller components:
  - [ ] `ImportCardHeader.tsx`
  - [ ] `ImportCardStatusIcon.tsx`
  - [ ] `ImportCardTitle.tsx`
  - [ ] `ImportCardCompletionStatus.tsx`
  - [ ] `ImportCardContent.tsx`
  - [ ] `ImportCardNoteStatusBar.tsx`
  - [ ] `ImportCardNoteStatusList.tsx`
  - [ ] `ImportCardImagePlaceholder.tsx`
  - [ ] `ImportCardProgressBar.tsx`

- [ ] Create `ImportCardContext` with its own reducer
- [ ] Ensure no early returns before hooks in all ImportCard components
- [ ] Add unit tests for each ImportCard component
- [ ] Create import card utilities for different status types

### **2.3 Extract UI Components**

- [ ] Extract `StatusIcon` from activity-log to `ui/atoms/`
- [ ] Extract `ProgressBar` from activity-log to `ui/atoms/`
- [ ] Extract `Title` components to `ui/atoms/`
- [ ] Extract `Button` components to `ui/atoms/`
- [ ] Ensure no early returns before hooks in all UI components
- [ ] Add unit tests for UI atoms and molecules
- [ ] Create UI utilities for consistent styling

### **2.4 Extract File Upload Components**

- [ ] Move `components/file-upload/` to `features/file-upload/`
- [ ] Create `FileUploadContext` with reducer
- [ ] Extract reusable upload components
- [ ] Ensure no early returns before hooks in upload components
- [ ] Add unit tests for file upload feature

## 🧹 **Phase 3: Cleanup & Consolidation**

### **3.1 Consolidate Hooks**

- [ ] Review and consolidate `hooks/` directory:
  - [ ] Merge similar hooks (e.g., count updaters)
  - [ ] Move feature-specific hooks to their respective feature directories
  - [ ] Keep only generic hooks in main `hooks/` directory
  - [ ] Ensure no early returns before hooks in all hooks
  - [ ] Add unit tests for all hooks
  - [ ] Create hook utilities for common patterns

### **3.2 Consolidate Contexts**

- [ ] Review `contexts/` directory:
  - [ ] Move feature-specific contexts to their respective feature directories
  - [ ] Keep only the main import state context
  - [ ] Ensure no early returns before hooks in all contexts
  - [ ] Add unit tests for all contexts
  - [ ] Create context utilities for common patterns

### **3.3 Consolidate Types**

- [ ] Review `types/` directory:
  - [ ] Move feature-specific types to their respective feature directories
  - [ ] Keep only shared types in main `types/` directory
  - [ ] Create proper type exports and imports
  - [ ] Add type guards and validation
  - [ ] Create type utilities for common patterns

### **3.4 Consolidate Utils**

- [ ] Review `utils/` directory:
  - [ ] Move feature-specific utils to their respective feature directories
  - [ ] Keep only shared utils in main `utils/` directory
  - [ ] Ensure proper export patterns
  - [ ] Create util utilities for common patterns

### **3.5 Consolidate Actions**

- [ ] Review `actions/` directory:
  - [ ] Move feature-specific actions to their respective feature directories
  - [ ] Keep only shared actions in main `actions/` directory
  - [ ] Ensure proper action patterns
  - [ ] Create action utilities for common patterns

## 🎯 **Phase 4: Activity Log Refactor**

### **4.1 Break Down Activity Log**

- [ ] Refactor `components/activity-log/activity-log.tsx`:
  - [ ] Extract orchestration logic only
  - [ ] Move component rendering to `ui/organisms/ActivityLog.tsx`
  - [ ] Use new feature contexts for state management
  - [ ] Ensure no early returns before hooks

### **4.2 Simplify Activity Log Components**

- [ ] Remove duplicate logic from activity-log components
- [ ] Use new feature components instead of custom implementations
- [ ] Ensure proper prop drilling and context usage
- [ ] Ensure no early returns before hooks
- [ ] Create activity log utilities for common patterns

### **4.3 Extract Activity Log Utilities**

- [ ] Move activity log specific utilities to `features/activity-log/`
- [ ] Create activity log context and reducer
- [ ] Ensure no early returns before hooks in activity log utilities
- [ ] Add unit tests for activity log utilities

## 🧪 **Phase 5: Testing & Quality**

### **5.1 Early Returns Prevention**

- [ ] Add ESLint rule to prevent early returns before hooks
- [ ] Review all components for early return violations
- [ ] Fix any remaining early return issues
- [ ] Add documentation about early return patterns
- [ ] Create linting utilities for early return prevention

### **5.2 Testing Strategy**

- [ ] Add unit tests for all new feature components
- [ ] Add integration tests for feature interactions
- [ ] Add E2E tests for critical user flows
- [ ] Ensure 100% test coverage for new components
- [ ] Create test utilities for common testing patterns

### **5.3 Performance Optimization**

- [ ] Add React.memo to all appropriate components
- [ ] Optimize re-renders with proper dependency arrays
- [ ] Add performance monitoring for new components
- [ ] Ensure proper code splitting
- [ ] Create performance utilities for monitoring

### **5.4 Error Handling**

- [ ] Create error boundary components for each feature
- [ ] Add error handling utilities
- [ ] Ensure proper error reporting
- [ ] Create error handling patterns

## 📚 **Phase 6: Documentation & Standards**

### **6.1 Documentation**

- [ ] Add README for each feature directory
- [ ] Document component patterns and best practices
- [ ] Add migration guide from old components
- [ ] Document early return prevention patterns
- [ ] Create documentation utilities

### **6.2 Code Standards**

- [ ] Establish naming conventions (ImportCard*, Status*, etc.)
- [ ] Create component template for new components
- [ ] Establish proper import/export patterns
- [ ] Create linting rules for the new structure
- [ ] Create code style utilities

### **6.3 Type Safety**

- [ ] Ensure proper TypeScript usage throughout
- [ ] Add strict type checking
- [ ] Create type utilities for common patterns
- [ ] Ensure proper type exports and imports

## 🔄 **Phase 7: Migration**

### **7.1 Gradual Migration**

- [ ] Migrate one feature at a time
- [ ] Keep old components working during migration
- [ ] Add feature flags for gradual rollout
- [ ] Monitor for regressions
- [ ] Create migration utilities

### **7.2 Cleanup**

- [ ] Remove old components after migration
- [ ] Clean up unused imports and dependencies
- [ ] Update all references to use new structure
- [ ] Remove dead code
- [ ] Create cleanup utilities

## 🎯 **Additional Improvements & Recommendations**

### **Early Returns Prevention Pattern**

```typescript
// ❌ Bad: Early return before hooks
function Component() {
  if (someCondition) return null;
  const [state, setState] = useState();
  // ...
}

// ✅ Good: All hooks called before any returns
function Component() {
  const [state, setState] = useState();
  const memoizedValue = useMemo(() => calculate(), []);

  if (someCondition) return null;
  // ...
}
```

### **Component Structure Pattern**

```typescript
// Feature component structure
features/import-card/
  ├── contexts/
  │   └── import-card-context.tsx
  ├── reducers/
  │   └── import-card-reducer.ts
  ├── components/
  │   ├── ImportCardHeader.tsx
  │   ├── ImportCardContent.tsx
  │   └── index.ts
  ├── types/
  │   └── import-card.ts
  ├── hooks/
  │   └── use-import-card.ts
  ├── utils/
  │   └── import-card-utils.ts
  ├── constants/
  │   └── import-card-constants.ts
  └── index.ts
```

### **Additional Organizational Improvements**

#### **Feature-Specific Utilities**

- [ ] Create feature-specific utility functions
- [ ] Create feature-specific constants
- [ ] Create feature-specific type guards
- [ ] Create feature-specific validation functions

#### **Shared Infrastructure**

- [ ] Create shared error handling patterns
- [ ] Create shared loading states
- [ ] Create shared form handling
- [ ] Create shared data fetching patterns

#### **Performance Optimizations**

- [ ] Implement proper memoization strategies
- [ ] Create lazy loading patterns
- [ ] Implement proper code splitting
- [ ] Create performance monitoring utilities

#### **Accessibility Improvements**

- [ ] Add proper ARIA labels
- [ ] Implement keyboard navigation
- [ ] Add screen reader support
- [ ] Create accessibility utilities

#### **Internationalization**

- [ ] Prepare for i18n support
- [ ] Create translation utilities
- [ ] Implement proper text handling
- [ ] Create locale utilities

This comprehensive TODO provides a roadmap for cleaning up the `@import/` directory while following best practices and ensuring we avoid early returns throughout the process.
