"use client";
import { Menu, X } from "lucide-react";
import { useNavigation } from "@/components/contexts/NavigationContext";
import { Button } from "@/components/atoms/Button";
import { usePathname } from "next/navigation";
import { NavLink } from "@/components/atoms/navigation/NavLink";
export function TopNav({ LinkComponent }) {
    const currentPath = usePathname();
    const { items, isTopNavOpen, setIsTopNavOpen } = useNavigation();
    const Link = LinkComponent || NavLink;
    return (<div className={`bg-green-600 text-white transition-all duration-300 ${isTopNavOpen ? "h-auto" : "h-16"} w-full md:hidden`}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-4">
        <h1 className="text-lg font-semibold">Peas App</h1>
        <Button variant="icon" onClick={() => setIsTopNavOpen(!isTopNavOpen)} className="text-white hover:bg-green-500 bg-transparent border-none">
          {isTopNavOpen ? <X size={24}/> : <Menu size={24}/>}
        </Button>
      </div>

      {/* Navigation Menu */}
      {isTopNavOpen && (<nav className="px-4 pb-4 space-y-2">
          {items.map((item) => {
                const Icon = item.icon;
                return (<Link key={item.name} href={item.href} active={currentPath === item.href} onClick={() => setIsTopNavOpen(false)}>
                <Icon size={20}/>
                <span className="text-sm font-medium">{item.name}</span>
              </Link>);
            })}
        </nav>)}
    </div>);
}
