"use client";

import React from "react";
import { CollapsibleWrapperProps } from "../types/collapsible";
import { CollapsibleHeader } from "./CollapsibleHeader";
import { CollapsibleContent } from "./CollapsibleContent";

export function CollapsibleWrapper({
  children,
  isExpanded,
  onToggle,
  className = "",
  headerClassName = "",
  contentClassName = "",
  transitionDuration = 300,
  disabled = false,
}: CollapsibleWrapperProps): React.ReactElement {
  // Split children into header and content
  const childrenArray = Array.isArray(children) ? children : [children];
  const headerChild = childrenArray.find(child => 
    React.isValidElement(child) && child.type === CollapsibleHeader
  );
  const contentChild = childrenArray.find(child => 
    React.isValidElement(child) && child.type === CollapsibleContent
  );

  return (
    <div className={`collapsible-wrapper ${className}`}>
      {headerChild && React.cloneElement(headerChild, {
        isExpanded,
        onToggle,
        disabled,
        className: headerClassName,
      })}
      {contentChild && React.cloneElement(contentChild, {
        isExpanded,
        className: contentClassName,
        transitionDuration,
      })}
    </div>
  );
}
