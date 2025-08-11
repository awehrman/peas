import { CountableStepStatus, StepStatus } from "./types";

export const getStepIcon = (
  status: "pending" | "processing" | "completed" | "failed"
) => {
  switch (status) {
    case "pending":
      return "⏳";
    case "processing":
      return "⏳";
    case "completed":
      return "✅";
    case "failed":
      return "❌";
    default:
      return "🙃";
  }
};

export const getStepText = (
  step: StepStatus | CountableStepStatus,
  stepName: string
) => {
  if ("current" in step && "total" in step) {
    const countableStep = step as CountableStepStatus;
    const baseText = `${countableStep.current}/${countableStep.total} ${stepName}`;

    if (countableStep.errors > 0) {
      return `${baseText} (${countableStep.errors} error${countableStep.errors > 1 ? "s" : ""})`;
    }
    return baseText;
  }

  return stepName;
};
