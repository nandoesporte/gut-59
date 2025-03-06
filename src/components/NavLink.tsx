
import { Link, LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavLinkProps extends Omit<LinkProps, 'to'> {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export const NavLink = ({ href, children, className, ...props }: NavLinkProps) => {
  return (
    <Link 
      to={href} 
      className={cn(className)}
      {...props}
    >
      {children}
    </Link>
  );
};
