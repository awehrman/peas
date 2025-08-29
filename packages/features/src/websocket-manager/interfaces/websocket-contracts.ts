/**
 * WebSocket Manager Contracts
 * Defines the contracts and events for WebSocket operations
 */

import { type FeatureContext, type FeatureEvent } from "@peas/shared";
import {
  type WebSocketConnection,
  type WebSocketMessage,
  type WebSocketSubscription,
} from "./websocket-provider";

export interface WebSocketEvent extends FeatureEvent {
  type:
    | "websocket-connected"
    | "websocket-disconnected"
    | "websocket-message-sent"
    | "websocket-message-received"
    | "websocket-subscribed"
    | "websocket-unsubscribed";
  payload: {
    connectionId: string;
    context: FeatureContext;
  };
}

export interface WebSocketConnectedEvent extends WebSocketEvent {
  type: "websocket-connected";
  payload: {
    connectionId: string;
    connection: WebSocketConnection;
    context: FeatureContext;
  };
}

export interface WebSocketDisconnectedEvent extends WebSocketEvent {
  type: "websocket-disconnected";
  payload: {
    connectionId: string;
    connection: WebSocketConnection;
    reason?: string;
    context: FeatureContext;
  };
}

export interface WebSocketMessageSentEvent extends WebSocketEvent {
  type: "websocket-message-sent";
  payload: {
    connectionId: string;
    message: WebSocketMessage;
    recipientCount: number;
    context: FeatureContext;
  };
}

export interface WebSocketMessageReceivedEvent extends WebSocketEvent {
  type: "websocket-message-received";
  payload: {
    connectionId: string;
    message: WebSocketMessage;
    context: FeatureContext;
  };
}

export interface WebSocketSubscribedEvent extends WebSocketEvent {
  type: "websocket-subscribed";
  payload: {
    connectionId: string;
    subscription: WebSocketSubscription;
    context: FeatureContext;
  };
}

export interface WebSocketUnsubscribedEvent extends WebSocketEvent {
  type: "websocket-unsubscribed";
  payload: {
    connectionId: string;
    subscriptionId: string;
    topic: string;
    context: FeatureContext;
  };
}

export interface WebSocketQuery {
  userId?: string;
  importId?: string;
  status?: WebSocketConnection["status"];
  topic?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface WebSocketQueryResult {
  connections: WebSocketConnection[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface WebSocketMessageQuery {
  connectionId?: string;
  type?: string;
  topic?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface WebSocketMessageQueryResult {
  messages: WebSocketMessage[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface WebSocketSubscriptionQuery {
  connectionId?: string;
  topic?: string;
  since?: Date;
  until?: Date;
  limit?: number;
  offset?: number;
}

export interface WebSocketSubscriptionQueryResult {
  subscriptions: WebSocketSubscription[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface WebSocketMetrics {
  totalConnections: number;
  activeConnections: number;
  connectionsByStatus: Record<WebSocketConnection["status"], number>;
  connectionsByUser: Record<string, number>;
  connectionsByImport: Record<string, number>;
  messagesSent: number;
  messagesReceived: number;
  messagesByType: Record<string, number>;
  subscriptions: number;
  subscriptionsByTopic: Record<string, number>;
  realTimeStats: {
    messagesPerMinute: number;
    connectionsPerMinute: number;
    averageMessageSize: number;
  };
}
