"use client";

import * as React from "react";

type PlaceholderProps = {
  label?: React.ReactNode;
  icon?: React.ReactNode | null;
  button?: React.ReactElement<{ className?: string }> | null;
  buttonSize?: "sm" | "md" | "lg";
};

const Placeholder = ({
  label,
  icon = null,
  button = null,
  buttonSize = "md",
}: PlaceholderProps) => {
  return (
    <div className="flex-1 self-center flex flex-col items-center justify-center gap-y-2">
      {icon && React.isValidElement(icon)
        ? React.cloneElement(
            icon as React.ReactElement<{ className?: string }>,
            {
              className: "w-16 h-16",
            }
          )
        : null}
      {label &&
        (React.isValidElement(label) ? (
          label
        ) : (
          <h2 className="text-md text-center">{label as React.ReactNode}</h2>
        ))}
      {button &&
        React.cloneElement(button, {
          className: `${button.props.className ?? ""} ${
            buttonSize === "sm" ? "h-8" : buttonSize === "lg" ? "h-12" : "h-10"
          }`,
        })}
    </div>
  );
};

export { Placeholder };
export default Placeholder;
