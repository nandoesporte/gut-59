
import { Link, useLocation } from "react-router-dom";
import { Home, LineChart, ShoppingBag, Settings, ScrollText, UtensilsCrossed, Dumbbell, Stethoscope, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const isMobile = useIsMobile();
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data } = await supabase.rpc('has_role', { role: 'admin' });
      setIsAdmin(!!data);
    };

    checkAdminRole();
  }, []);

  return (
    <nav className="bg-card/90 backdrop-blur-lg shadow-lg fixed bottom-0 left-0 right-0 z-50 border-t border-border">
      <div className="container mx-auto px-1 py-2 md:py-3">
        <div className="flex items-center justify-between">
          <NavLink
            to="/"
            icon={<Home className="w-5 h-5 md:w-6 md:h-6" />}
            text="Início"
            active={isActive("/")}
          />
          <NavLink
            to="/workout"
            icon={<Dumbbell className="w-5 h-5 md:w-6 md:h-6" />}
            text="Treino"
            active={isActive("/workout")}
          />
          <NavLink
            to="/menu"
            icon={<UtensilsCrossed className="w-5 h-5 md:w-6 md:h-6" />}
            text="Nutri"
            active={isActive("/menu")}
          />
          <NavLink
            to="/fisio"
            icon={<Stethoscope className="w-5 h-5 md:w-6 md:h-6" />}
            text="Fisio"
            active={isActive("/fisio")}
          />
          <NavLink
            to="/mental"
            icon={<Brain className="w-5 h-5 md:w-6 md:h-6" />}
            text="Psico"
            active={isActive("/mental")}
          />
          <a
            href="https://katiasantin.com.br/loja"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center space-y-1 px-1 py-1 rounded-lg transition-colors text-muted-foreground hover:text-primary"
          >
            <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-xs font-medium">Produtos</span>
          </a>
          {isAdmin && (
            <NavLink
              to="/admin"
              icon={<Settings className="w-5 h-5 md:w-6 md:h-6" />}
              text="Admin"
              active={isActive("/admin")}
            />
          )}
        </div>
      </div>
    </nav>
  );
};

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  active?: boolean;
}

const NavLink = ({ to, icon, text, active }: NavLinkProps) => (
  <Link
    to={to}
    className={`flex flex-col items-center space-y-1 px-1 py-1 rounded-lg transition-colors ${
      active 
        ? "text-primary" 
        : "text-muted-foreground hover:text-primary"
    }`}
  >
    {icon}
    <span className="text-xs font-medium">{text}</span>
  </Link>
);

export default Navigation;
