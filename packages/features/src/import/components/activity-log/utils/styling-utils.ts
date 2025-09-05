import { ImportItem, ImportItemWithUploadProgress } from "../types";

export interface StylingConfig {
  backgroundColor: string;
  hoverBackgroundColor: string;
  textColor: string;
}

export function getImportItemStyling(
  item: ImportItem | ImportItemWithUploadProgress,
  hasDuplicate: boolean
): StylingConfig {
  // Only show amber styling if duplicates are actually found AND the item is completed
  // This prevents amber styling during the duplicate check process
  if (hasDuplicate && item.status === "completed") {
    return {
      backgroundColor: "bg-amber-50",
      hoverBackgroundColor: "hover:bg-amber-100",
      textColor: "text-amber-800",
    };
  }

  switch (item.status) {
    case "importing":
      return {
        backgroundColor: "bg-info-50",
        hoverBackgroundColor: "hover:bg-info-100",
        textColor: "text-info-800",
      };
    case "completed":
      return {
        backgroundColor: "bg-success-50",
        hoverBackgroundColor: "hover:bg-success-100",
        textColor: "text-success-800",
      };
    case "failed":
      return {
        backgroundColor: "bg-error-50",
        hoverBackgroundColor: "hover:bg-error-100",
        textColor: "text-error-800",
      };
    default:
      return {
        backgroundColor: "bg-info-50",
        hoverBackgroundColor: "hover:bg-info-100",
        textColor: "text-info-800",
      };
  }
}

export function getUploadItemStyling(status: string) {
  const getStatusColor = () => {
    switch (status) {
      case "uploaded":
        return "text-success-600";
      case "processing":
        return "text-info-600";
      case "completed":
        return "text-success-600";
      case "failed":
        return "text-error-600";
      case "cancelled":
        return "text-greyscale-600";
      default:
        return "text-greyscale-600";
    }
  };

  const getTextColor = () => {
    switch (status) {
      case "uploaded":
        return "text-success-800";
      case "processing":
        return "text-info-800";
      case "completed":
        return "text-success-800";
      case "failed":
        return "text-error-800";
      case "cancelled":
        return "text-greyscale-800";
      default:
        return "text-greyscale-800";
    }
  };

  return {
    statusColor: getStatusColor(),
    textColor: getTextColor(),
  };
}
