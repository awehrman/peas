"use client";
import { LucideMessageSquareWarning } from "lucide-react";
import * as React from "react";

type PlaceholderProps = {
  label?: string;
  icon?: React.ReactElement<any>;
  button?: React.ReactElement;
  buttonSize?: "sm" | "md" | "lg";
};

const Placeholder = ({
  label,
  icon = <LucideMessageSquareWarning />,
  button = <div />,
  buttonSize = "md",
}: PlaceholderProps) => {
  return (
    <div className="flex-1 self-center flex flex-col items-center justify-center gap-y-2">
      {React.cloneElement(icon, {
        className: "w-16 h-16",
      })}
      {label && <h2 className="text-lg text-center">{label}</h2>}
      {React.cloneElement(button as React.ReactElement<any>, {
        className: `${(button as any).props?.className || ""} ${
          buttonSize === "sm" ? "h-8" : buttonSize === "lg" ? "h-12" : "h-10"
        }`,
      })}
    </div>
  );
};

export { Placeholder };
export default Placeholder;
