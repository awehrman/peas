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
  if (hasDuplicate) {
    return {
      backgroundColor: "bg-amber-50",
      hoverBackgroundColor: "hover:bg-amber-100",
      textColor: "text-amber-800",
    };
  }

  switch (item.status) {
    case "importing":
      return {
        backgroundColor: "bg-blue-50",
        hoverBackgroundColor: "hover:bg-blue-100",
        textColor: "text-blue-800",
      };
    case "completed":
      return {
        backgroundColor: "bg-green-50",
        hoverBackgroundColor: "hover:bg-green-100",
        textColor: "text-green-800",
      };
    case "failed":
      return {
        backgroundColor: "bg-red-50",
        hoverBackgroundColor: "hover:bg-red-100",
        textColor: "text-red-800",
      };
    default:
      return {
        backgroundColor: "bg-blue-50",
        hoverBackgroundColor: "hover:bg-blue-100",
        textColor: "text-blue-800",
      };
  }
}

export function getUploadItemStyling(status: string) {
  const getStatusColor = () => {
    switch (status) {
      case "uploaded":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getTextColor = () => {
    switch (status) {
      case "uploaded":
        return "text-green-800";
      case "failed":
        return "text-red-800";
      default:
        return "text-gray-800";
    }
  };

  return {
    statusColor: getStatusColor(),
    textColor: getTextColor(),
  };
}
