"use client";

import { NavigationProvider } from "@/components/contexts/NavigationContext";
import { NavigationProps } from "@/components/types/navigation";

export function Navigation({ LinkComponent }: NavigationProps) {
  return (
    <NavigationProvider>
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-4 p-4">
            NAVIGATION COMPONENT
            <div className="h-20 bg-primary-500 text-primary-500-foreground flex items-center justify-center">
              primary 500
            </div>
            <div className="h-20 bg-primary-600 text-primary-500-foreground flex items-center justify-center">
              primary 600
            </div>
            <div className="h-20 bg-secondary-500 text-secondary-foreground flex items-center justify-center">
              Secondary 500
            </div>
            <div className="h-20 bg-background text-foreground border border-border flex items-center justify-center">
              Background
            </div>
          </div>
        </div>
      </main>
    </NavigationProvider>
  );
}
