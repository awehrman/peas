import * as React from "react";

import { cn } from "../lib/utils";

export interface UnderlineInputProps extends React.ComponentProps<"input"> {
  /**
   * Classes for the wrapper. Put typography (font size, weight) here so the
   * input and its underline measure the same text.
   */
  className?: string;
  inputClassName?: string;
  /** Size the field to its text (or placeholder) instead of the full width, so it can sit inline. */
  fitContent?: boolean;
}

/**
 * Borderless text input whose underline only spans the typed text and grows
 * as you type; an empty field (placeholder only) has no underline. The underline appears on hover and focus (where the text takes
 * the underline's color), and stays visible in the error color while the field
 * is `aria-invalid`.
 */
function UnderlineInput({
  className,
  inputClassName,
  value,
  defaultValue,
  onChange,
  type = "text",
  fitContent = false,
  ...props
}: UnderlineInputProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(() =>
    String(defaultValue ?? "")
  );
  const isControlled = value !== undefined;
  const text = isControlled ? String(value) : uncontrolledValue;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setUncontrolledValue(event.target.value);
    onChange?.(event);
  }

  return (
    <div
      data-slot="underline-input"
      className={cn(
        "relative min-w-0 pb-[3px]",
        fitContent ? "inline-grid max-w-full" : "w-full",
        className
      )}
    >
      {fitContent ? (
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 overflow-hidden whitespace-pre pt-1 pr-1 leading-tight"
        >
          {text || props.placeholder || " "}
        </span>
      ) : null}
      <input
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        size={fitContent ? 1 : undefined}
        className={cn(
          "peer block w-full min-w-0 border-0 bg-transparent p-0 pt-1 leading-tight caret-primary-600 outline-none transition-colors duration-150",
          fitContent && "col-start-1 row-start-1",
          "placeholder:italic placeholder:text-muted-foreground",
          "focus:text-primary-600",
          "aria-invalid:text-error-700 aria-invalid:focus:text-error-700",
          "disabled:cursor-not-allowed disabled:opacity-50",
          inputClassName
        )}
        {...props}
      />
      {text ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute bottom-0 left-0 h-0 max-w-full select-none overflow-hidden whitespace-pre text-transparent",
            "border-t-[3px] border-transparent transition-colors duration-150",
            "peer-hover:border-greyscale-200 peer-focus:border-primary-600 peer-aria-invalid:border-error-500"
          )}
        >
          {text}
        </span>
      ) : null}
    </div>
  );
}

export { UnderlineInput };
