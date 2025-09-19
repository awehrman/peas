import React, { ReactElement } from "react";

import { RenderOptions, render } from "@testing-library/react";
import { vi } from "vitest";

import { ActivityProvider } from "../import/context/activity";
// Import all the context providers
import { ImportProvider } from "../import/context/import-provider";
import { StatsProvider } from "../import/context/stats";
import { ImportUploadProvider } from "../import/context/upload";
import { WsProvider } from "../import/context/ws";

// Mock functions for providers
const mockStatsRefresh = vi.fn();
const mockStatusUpdate = vi.fn();

interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ImportProvider onStatsRefresh={mockStatsRefresh}>
      <ActivityProvider>
        <StatsProvider>
          <ImportUploadProvider>
            <WsProvider onStatusUpdate={mockStatusUpdate}>
              {children}
            </WsProvider>
          </ImportUploadProvider>
        </StatsProvider>
      </ActivityProvider>
    </ImportProvider>
  );
};

// Individual provider wrappers for isolated testing
export const ActivityProviderWrapper = ({ children }: AllTheProvidersProps) => (
  <ActivityProvider>{children}</ActivityProvider>
);

export const StatsProviderWrapper = ({ children }: AllTheProvidersProps) => (
  <StatsProvider>{children}</StatsProvider>
);

export const UploadProviderWrapper = ({ children }: AllTheProvidersProps) => (
  <ImportUploadProvider>{children}</ImportUploadProvider>
);

export const WsProviderWrapper = ({ children }: AllTheProvidersProps) => (
  <WsProvider onStatusUpdate={mockStatusUpdate}>{children}</WsProvider>
);

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from "@testing-library/react";
export { customRender as render };

// Export mock functions for test access
export { mockStatsRefresh, mockStatusUpdate };
