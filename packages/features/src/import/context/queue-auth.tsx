"use client";

import { createContext, useContext } from "react";

/** Returns a short-lived token that authorizes requests to the queue service */
export type QueueTokenProvider = () => Promise<string>;

export const QueueAuthContext = createContext<QueueTokenProvider | undefined>(
  undefined
);

export function useQueueTokenProvider(): QueueTokenProvider | undefined {
  return useContext(QueueAuthContext);
}
