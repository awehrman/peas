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
        "bg-header border-b border-border px-6 py-4 md:px-8 md:py-5 mt-12 md:mt-0",
        className
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <h1 className="text-2xl font-extralight text-header-foreground">
          {routeName}
        </h1>
      </div>
    </header>
  );
}
