import { useActivity } from "../context/activity";
import { useStats } from "../context/stats";
import { useImportUpload } from "../context/upload";
import { useWs } from "../context/ws";
import type {
  ActivityContextValue,
  StatsContextValue,
  UploadContextValue,
  WsContextValue,
} from "../types/import-types";

interface UseImportReturn {
  upload: UploadContextValue;
  ws: WsContextValue;
  stats: StatsContextValue;
  activity: ActivityContextValue;
}

/**
 * Combined hook that provides access to all import-related contexts
 * This is a convenience hook for components that need multiple contexts
 */
export function useImport(): UseImportReturn {
  const upload = useImportUpload();
  const ws = useWs();
  const stats = useStats();
  const activity = useActivity();

  return {
    upload,
    ws,
    stats,
    activity,
  };
}
