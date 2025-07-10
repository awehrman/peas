"use client";

import { ReactNode } from "react";

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        {(title || subtitle) && (
          <div className="text-center mb-8">
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
