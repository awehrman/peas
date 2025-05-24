import { NavIcon } from "@/components/atoms/navigation/NavIcon";
export function NavItem({ name, href, icon, onClick, className, }) {
    return (<a href={href} className={className} onClick={onClick}>
      <NavIcon icon={icon}/>
      <span>{name}</span>
    </a>);
}
