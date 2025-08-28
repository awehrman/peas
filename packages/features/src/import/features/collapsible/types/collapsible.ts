import React from "react";

export interface CollapsibleState {
  isExpanded: boolean;
  isAnimating: boolean;
  contentHeight: number;
  transitionDuration: number;
}

export interface UseCollapsibleOptions {
  defaultExpanded?: boolean;
  transitionDuration?: number;
  onToggle?: (isExpanded: boolean) => void;
}

export interface UseCollapsibleReturn extends CollapsibleState {
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  setExpanded: (expanded: boolean) => void;
}

export interface CollapsibleWrapperProps {
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  transitionDuration?: number;
  disabled?: boolean;
}

export interface CollapsibleHeaderProps {
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  className?: string;
  disabled?: boolean;
  showIcon?: boolean;
}

export interface CollapsibleContentProps {
  children: React.ReactNode;
  isExpanded: boolean;
  className?: string;
  transitionDuration?: number;
}

export interface CollapsibleContextValue {
  state: CollapsibleState;
  actions: {
    toggle: () => void;
    expand: () => void;
    collapse: () => void;
    setExpanded: (expanded: boolean) => void;
  };
}

export interface CollapsibleGroupState {
  expandedItems: Set<string>;
  defaultExpanded?: boolean;
  allowMultiple?: boolean;
}

export interface UseCollapsibleGroupOptions {
  defaultExpanded?: boolean;
  allowMultiple?: boolean;
  onItemToggle?: (itemId: string, isExpanded: boolean) => void;
}
