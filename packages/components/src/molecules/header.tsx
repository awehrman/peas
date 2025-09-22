import { cn } from "@peas/components";
import { useScreenSize } from "@peas/features";

export interface HeaderProps {
  routeName?: string;
  className?: string;
}

export function Header({
  routeName = "Dashboard",
  className = "",
}: HeaderProps) {
  const { isMobile } = useScreenSize();

  return (
    <header
      className={cn(
        `bg-header border-b border-border p-10 md:block ${className}`,
        isMobile && "mt-12"
      )}
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light text-header-foreground">
          {routeName}
        </h1>
      </div>
    </header>
  );
}
