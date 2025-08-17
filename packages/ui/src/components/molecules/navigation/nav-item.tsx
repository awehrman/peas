import { LucideIcon } from "lucide-react";
import { NavIcon } from "../../atoms/navigation/nav-icon";
import { useNavigation } from "../../contexts/NavigationContext";

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
    onClick?: () => void;
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
  const { setIsExpanded } = useNavigation();

  const handleClick = () => {
    // Collapse the sidebar when a navigation item is clicked
    setIsExpanded(false);
    // Call the original onClick if provided
    if (onClick) {
      onClick();
    }
  };

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
      onClick={handleClick}
    >
      {content}
    </a>
  );
}
