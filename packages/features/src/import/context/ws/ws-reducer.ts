import type { WsAction, WsConnectionState } from "../../types/import-types";

/**
 * WebSocket reducer - handles connection state
 */
export function wsReducer(
  state: WsConnectionState,
  action: WsAction
): WsConnectionState {
  switch (action.type) {
    case "WS_CONNECTING":
      return {
        ...state,
        status: "connecting",
      };

    case "WS_CONNECTED":
      return {
        ...state,
        status: "connected",
        lastSuccessfulConnectionAt: action.timestamp,
        reconnectionAttempts: 0,
      };

    case "WS_DISCONNECTED":
      return {
        ...state,
        status: "idle",
      };

    case "WS_RETRY":
      return {
        ...state,
        status: "reconnecting",
        reconnectionAttempts: state.reconnectionAttempts + 1,
      };

    case "WS_ERROR":
      return {
        ...state,
        status: "error",
      };

    default:
      return state;
  }
}

export const defaultWsState: WsConnectionState = {
  status: "idle",
  reconnectionAttempts: 0,
};
