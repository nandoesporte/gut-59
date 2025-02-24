
import { Link, useLocation } from "react-router-dom";
import { Home, LineChart, ShoppingBag, Settings, ScrollText, UtensilsCrossed, Dumbbell, Stethoscope } from "lucide-react";
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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
      toast.success("Logout realizado com sucesso");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Erro ao desconectar");
    }
  };

  return (
    <nav className="bg-[#1E1E1E] border-t border-white/10 shadow-lg fixed bottom-0 left-0 right-0 z-50">
      <div className="container mx-auto px-2 py-2">
        <div className="flex items-center justify-between">
          <NavLink
            to="/"
            icon={<Home className="w-6 h-6 md:w-7 md:h-7" />}
            text="Início"
            active={isActive("/")}
          />
          <NavLink
            to="/workout"
            icon={<Dumbbell className="w-6 h-6 md:w-7 md:h-7" />}
            text="Treino"
            active={isActive("/workout")}
          />
          <NavLink
            to="/menu"
            icon={<UtensilsCrossed className="w-6 h-6 md:w-7 md:h-7" />}
            text="Nutri"
            active={isActive("/menu")}
          />
          <NavLink
            to="/fisio"
            icon={<Stethoscope className="w-6 h-6 md:w-7 md:h-7" />}
            text="Fisio"
            active={isActive("/fisio")}
          />
          <NavLink
            to="/progress"
            icon={<LineChart className="w-6 h-6 md:w-7 md:h-7" />}
            text="Progress"
            active={isActive("/progress")}
          />
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
    className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
      active 
        ? "text-cyan-400" 
        : "text-gray-400 hover:text-cyan-400"
    }`}
  >
    {icon}
    <span className="text-xs md:text-sm font-medium">{text}</span>
  </Link>
);

export default Navigation;
