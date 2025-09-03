"use client";

import { ReactNode } from "react";

import { PhysicsBackground } from "@peas/components";

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PhysicsBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            {(title || subtitle) && (
              <div className="text-center mb-8 bg-background">
                {title && (
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-gray-600 dark:text-gray-400">{subtitle}</p>
                )}
              </div>
            )}

            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg p-10 bg-background">
              {children}
            </div>
          </div>
        </div>
      </PhysicsBackground>
    </div>
  );
}
