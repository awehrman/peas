"use client";

import { ReactNode } from "react";

import { PhysicsBackground } from "@peas/features";

interface UnauthenticatedLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function UnauthenticatedLayout({
  children,
  title,
  subtitle,
}: UnauthenticatedLayoutProps) {
  return (
    <div className="min-h-screen bg-greyscale-50 dark:bg-greyscale-900">
      <PhysicsBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {(title || subtitle) && (
              <div className="text-center mb-8 bg-background">
                {title && (
                  <h1 className="text-2xl font-bold text-greyscale-900 dark:text-greyscale-100 mb-2">
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

            <div className="bg-card/90 dark:bg-greyscale-800/90 backdrop-blur-sm rounded-lg shadow-lg p-10 bg-background">
              {children}
            </div>
          </div>
        </div>
      </PhysicsBackground>
    </div>
  );
}
