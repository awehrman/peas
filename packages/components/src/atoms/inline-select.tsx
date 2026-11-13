import * as React from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "../lib/utils";

/** The label of the `<option>` whose value matches, from the select's children. */
function selectedLabel(
  children: React.ReactNode,
  value: string
): React.ReactNode {
  for (const child of React.Children.toArray(children)) {
    if (
      !React.isValidElement<{ value?: unknown; children?: React.ReactNode }>(
        child
      )
    )
      continue;
    if (String(child.props.value ?? "") === value) return child.props.children;
  }
  return null;
}

/**
 * A native select styled as a colored word inside a sentence ("canned tomatoes *is processed from* tomato"), with the same underline language as `UnderlineInput`: a light underline at rest, a stronger one on hover, and the full color on focus. It is exactly as wide as the selected option: the label is drawn as text and the real (invisible) select sits on top of it, so clicks and the keyboard still reach the native control.
 *
 * @example
 * <InlineSelect aria-label="How canned tomatoes relates to tomato" value={type} onChange={...}>
 *   <option value="IS_A">is a kind of</option>
 * </InlineSelect>
 */
function InlineSelect({
  className,
  children,
  value,
  defaultValue,
  onChange,
  ...props
}: React.ComponentProps<"select">) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
    String(defaultValue ?? "")
  );
  const isControlled = value !== undefined;
  const current = isControlled ? String(value) : uncontrolledValue;

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    if (!isControlled) setUncontrolledValue(event.target.value);
    onChange?.(event);
  }

  return (
    <span
      data-slot="inline-select"
      className={cn(
        "group relative inline-flex items-center gap-0.5 border-b-2 border-secondary-200 font-medium leading-tight text-secondary-600 transition-colors duration-150",
        "hover:border-secondary-400 focus-within:border-secondary-600 focus-within:text-secondary-700",
        "has-[select:disabled]:cursor-not-allowed has-[select:disabled]:opacity-50",
        className
      )}
    >
      <span aria-hidden="true" className="whitespace-nowrap">
        {selectedLabel(children, current)}
      </span>
      <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <select
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0 disabled:cursor-not-allowed"
        {...props}
      >
        {children}
      </select>
    </span>
  );
}

export { InlineSelect };
