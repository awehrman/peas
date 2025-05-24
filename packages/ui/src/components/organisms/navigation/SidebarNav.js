"use client";
import { useNavigation } from "@/components/contexts/NavigationContext";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { usePathname } from "next/navigation";
import { NavLink } from "@/components/atoms/navigation/NavLink";
export function SidebarNav({ LinkComponent }) {
    const { items, isExpanded, setIsExpanded } = useNavigation();
    const currentPath = usePathname();
    const Link = LinkComponent || NavLink;
    return (<div className={`bg-green-600 text-white transition-all duration-300 ${isExpanded ? "w-64" : "w-16"} min-h-screen`}>
      {/* Toggle Button */}
      <div className="p-4 border-b border-green-500">
        <Button variant="icon" onClick={() => setIsExpanded(!isExpanded)} className="text-white hover:bg-green-500 bg-transparent border-none">
          <MoreVertical size={16} className={isExpanded ? "rotate-90" : ""}/>
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="p-4 space-y-2">
        {items.map((item) => {
            const Icon = item.icon;
            return (<Link key={item.name} href={item.href} active={currentPath === item.href}>
              <Icon size={20} className="flex-shrink-0"/>
              {isExpanded && (<span className="text-sm font-medium">{item.name}</span>)}
            </Link>);
        })}
      </nav>
    </div>);
}
