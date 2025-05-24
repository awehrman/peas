"use client";
import { TopNav } from "./TopNav";
import { SidebarNav } from "./SidebarNav";
import { NavigationProvider } from "@/components/contexts/NavigationContext";
export function Navigation({ LinkComponent }) {
    return (<NavigationProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation for Mobile */}
        <TopNav LinkComponent={LinkComponent}/>

        <div className="flex">
          {/* Sidebar Navigation for Desktop */}
          <div className="hidden md:block">
            <SidebarNav LinkComponent={LinkComponent}/>
          </div>
        </div>
      </div>
    </NavigationProvider>);
}
