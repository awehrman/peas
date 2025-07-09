import { LucideIcon } from "lucide-react";
import { NavIcon } from "../../atoms/navigation/nav-icon";

interface NavItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
}

export function NavItem({
  name,
  href,
  icon,
  onClick,
  className,
  LinkComponent,
}: NavItemProps) {
  const content = (
    <>
      <NavIcon icon={icon} />
      <span>{name}</span>
    </>
  );

  const baseClassName = "flex items-center gap-3 w-full h-full";

  if (LinkComponent) {
    return (
      <LinkComponent
        href={href}
        className={`${baseClassName} ${className || ""}`}
      >
        {content}
      </LinkComponent>
    );
  }

  return (
    <a
      href={href}
      className={`${baseClassName} ${className || ""}`}
      onClick={onClick}
    >
      {content}
    </a>
  );
}
