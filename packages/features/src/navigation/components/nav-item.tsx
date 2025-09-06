import { LucideIcon } from "lucide-react";

import { useNavigation } from "../contexts/NavigationContext";

interface NavItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
    style?: React.CSSProperties;
  }>;
}

export function NavItem({
  name,
  href,
  icon,
  onClick,
  className,
  style,
  LinkComponent,
}: NavItemProps) {
  const { setIsExpanded } = useNavigation();

  const handleClick = () => {
    // Collapse the sidebar when a navigation item is clicked
    setIsExpanded(false);
    // Call the original onClick if provided
    if (onClick) {
      onClick();
    }
  };

  const IconComponent = icon;
  const content = (
    <>
      <IconComponent className="h-4 w-4" style={style} />
      <span style={style}>{name}</span>
    </>
  );

  const baseClassName = "flex items-center gap-3 w-full h-full";

  if (LinkComponent) {
    return (
      <LinkComponent
        href={href}
        className={`${baseClassName} ${className || ""}`}
        style={style}
        onClick={handleClick}
      >
        {content}
      </LinkComponent>
    );
  }

  return (
    <a
      href={href}
      className={`${baseClassName} ${className || ""}`}
      style={style}
      onClick={handleClick}
    >
      {content}
    </a>
  );
}
