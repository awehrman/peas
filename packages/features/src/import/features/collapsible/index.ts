// Types
export type {
  CollapsibleState,
  UseCollapsibleOptions,
  UseCollapsibleReturn,
  CollapsibleWrapperProps,
  CollapsibleHeaderProps,
  CollapsibleContentProps,
  CollapsibleContextValue,
  CollapsibleGroupState,
  UseCollapsibleGroupOptions,
} from "./types/collapsible";

// Reducers
export { collapsibleReducer, collapsibleGroupReducer } from "./reducers/collapsible-reducer";
export type { CollapsibleAction, CollapsibleGroupAction } from "./reducers/collapsible-reducer";

// Hooks
export { useCollapsible } from "./hooks/use-collapsible";
export { useCollapsibleGroup } from "./hooks/use-collapsible-group";

// Components
export { CollapsibleWrapper, CollapsibleHeader, CollapsibleContent } from "./components";

// Utils
export {
  calculateTransitionDuration,
  shouldExpandByDefault,
  getNextExpandedItem,
  scrollToElement,
  isInViewport,
} from "./utils/collapsible-utils";
