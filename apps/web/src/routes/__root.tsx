/// <reference types="vite/client" />
import { NotFoundState } from "~/components/route-states";
import { CacheCoordinatorProvider } from "~/lib/apollo/cache-coordinator-provider";
import appCss from "~/styles/app.css?url";

import { type ReactNode, useEffect } from "react";

import type { ApolloClientIntegration } from "@apollo/client-integration-tanstack-start";
import { ThemeProvider } from "@peas/features";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";

export const Route =
  createRootRouteWithContext<ApolloClientIntegration.RouterContext>()({
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Peas" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.ico" },
      ],
    }),
    component: RootComponent,
    notFoundComponent: NotFoundState,
    shellComponent: RootDocument,
  });

function RootComponent() {
  // End-to-end tests wait for this before interacting with server-rendered markup.
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

  return (
    <ThemeProvider>
      <CacheCoordinatorProvider>
        <Outlet />
      </CacheCoordinatorProvider>
    </ThemeProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
