import * as React from "react";

import { cn } from "../lib/utils";

export interface UnderlineInputProps extends React.ComponentProps<"input"> {
  /**
   * Classes for the wrapper. Put typography (font size, weight) here so the
   * input and its underline measure the same text.
   */
  className?: string;
  inputClassName?: string;
}

/**
 * Borderless text input whose underline only spans the typed text and grows
 * as you type. The underline appears on hover and focus, and stays visible in
 * the error color while the field is `aria-invalid`.
 */
function UnderlineInput({
  className,
  inputClassName,
  value,
  defaultValue,
  onChange,
  type = "text",
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
    <div data-slot="underline-input" className={cn("relative w-full min-w-0 pb-[3px]", className)}>
      <input
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        className={cn(
          "peer block w-full min-w-0 border-0 bg-transparent p-0 py-1 leading-tight caret-primary-600 outline-none",
          "placeholder:italic placeholder:text-muted-foreground",
          "aria-invalid:text-error-700",
          "disabled:cursor-not-allowed disabled:opacity-50",
          inputClassName
        )}
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-0 left-0 h-0 min-w-6 max-w-full select-none overflow-hidden whitespace-pre text-transparent",
          "border-t-[3px] border-transparent transition-colors duration-150",
          "peer-hover:border-greyscale-200 peer-focus:border-primary-500 peer-aria-invalid:border-error-500"
        )}
      >
        {text}
      </span>
    </div>
  );
}

export { UnderlineInput };
