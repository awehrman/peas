import { Navigation, NavigationProvider } from "@peas/ui";
import Link from "next/link";

export default function HomePage() {
  return (
    <NavigationProvider>
      <div className="min-h-screen">
        {/* Desktop Navigation */}
        <div className="flex">
          <Navigation LinkComponent={Link} />

          {/* Main Content */}
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
              {/* Test colors */}
              <div className="space-y-4 p-4">
                MAIN
                <div className="h-20 bg-mint-500 text-primary-500-foreground flex items-center justify-center">
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
        </div>
      </div>
    </NavigationProvider>
  );
}
