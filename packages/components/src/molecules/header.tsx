import { cn } from "@peas/components";

export interface HeaderProps {
  routeName?: string;
  className?: string;
}

export function Header({
  routeName = "Dashboard",
  className = "",
}: HeaderProps) {
  return (
    <header
      className={cn(
        "bg-header border-b border-border p-10 md:block mt-12 md:mt-0",
        className
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
