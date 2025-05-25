import { colors } from "@peas/theme";
import { SidebarNav, TopNav } from "@peas/ui";
import { NavigationProvider } from "@peas/ui";

export default function HomePage() {
  return (
    <NavigationProvider>
      <div className="min-h-screen">
        {/* Test colors */}
        <div className="space-y-4 p-4">
          <div className="h-20 bg-primary-500 text-primary-foreground flex items-center justify-center">
            Primary 500
          </div>
          <div className="h-20 bg-primary-600 text-primary-foreground flex items-center justify-center">
            Primary 600
          </div>
          <div className="h-20 bg-secondary-500 text-secondary-foreground flex items-center justify-center">
            Secondary 500
          </div>
          <div className="h-20 bg-background text-foreground border border-border flex items-center justify-center">
            Background
          </div>
        </div>

        {/* Mobile Navigation */}
        <TopNav />

        {/* Desktop Navigation */}
        <div className="flex">
          <SidebarNav />

          {/* Main Content */}
          <main className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">Home page content</div>
          </main>
        </div>
      </div>
    </NavigationProvider>
  );
}
