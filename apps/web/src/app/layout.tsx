import { Suspense } from "react";

import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";

import { Spinner } from "@peas/components";
import "@peas/components/styles.css";
import { ThemeProvider } from "@peas/features";
import "@peas/features/styles.css";

import { AuthErrorBoundary } from "../lib/auth/components/error-boundary";

import "./fonts.css";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Peas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} font-sans`}>
        <ThemeProvider>
          <AuthErrorBoundary>
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <Spinner />
                </div>
              }
            >
              {children}
            </Suspense>
          </AuthErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
