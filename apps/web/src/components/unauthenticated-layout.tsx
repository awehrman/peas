import type { ReactNode } from "react";

import { PhysicsBackground } from "@peas/features";

interface UnauthenticatedLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

/** The sign-in, sign-up, and password-reset shell. */
export function UnauthenticatedLayout({
  children,
  title,
  subtitle,
}: UnauthenticatedLayoutProps) {
  return (
    <div className="min-h-screen bg-greyscale-50 dark:bg-greyscale-900">
      <PhysicsBackground>
        <main className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            {(title || subtitle) && (
              <div className="mb-8 bg-background text-center">
                {title && (
                  <h1 className="mb-2 text-2xl font-bold text-greyscale-900 dark:text-greyscale-100">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-greyscale-600 dark:text-greyscale-400">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            <div className="rounded-lg bg-background bg-card/90 p-10 shadow-lg backdrop-blur-sm dark:bg-greyscale-800/90">
              {children}
            </div>
          </div>
        </main>
      </PhysicsBackground>
    </div>
  );
}
