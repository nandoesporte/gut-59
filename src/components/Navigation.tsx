
import { Link, useLocation } from "react-router-dom";
import { Book, Home, LineChart, ShoppingBag, Settings, ScrollText, UtensilsCrossed, Dumbbell, Stethoscope } from "lucide-react";
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
      toast("Logout realizado com sucesso", {
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error("Error logging out:", error);
      toast("Erro ao desconectar", {
        description: "Ocorreu um erro ao tentar desconectar.",
        style: { background: 'red', color: 'white' }
      });
    }
  };

  return (
    <nav className="bg-white shadow-sm fixed bottom-0 left-0 right-0 z-50">
      <div className="container mx-auto px-2 py-2">
        <div className="flex items-center justify-between">
          <NavLink
            to="/"
            icon={<Home className="w-6 h-6 md:w-7 md:h-7" />}
            text="Início"
            active={isActive("/")}
          />
          <NavLink
            to="/menu"
            icon={<UtensilsCrossed className="w-6 h-6 md:w-7 md:h-7" />}
            text="Nutri"
            active={isActive("/menu")}
          />
          <NavLink
            to="/instructions"
            icon={<Book className="w-6 h-6 md:w-7 md:h-7" />}
            text="Instruções"
            active={isActive("/instructions")}
          />
          <NavLink
            to="/workout"
            icon={<Dumbbell className="w-6 h-6 md:w-7 md:h-7" />}
            text="Treino"
            active={isActive("/workout")}
          />
          <NavLink
            to="/fisio"
            icon={<Stethoscope className="w-6 h-6 md:w-7 md:h-7" />}
            text="Fisio"
            active={isActive("/fisio")}
          />
          <a
            href="https://katiasantin.com.br/loja"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors text-gray-700 hover:text-primary-500"
          >
            <ShoppingBag className="w-6 h-6 md:w-7 md:h-7" />
            <span className="text-sm md:text-base font-medium">Produtos</span>
          </a>
          <NavLink
            to="/progress"
            icon={<LineChart className="w-6 h-6 md:w-7 md:h-7" />}
            text="Diário"
            active={isActive("/progress")}
          />
          {isAdmin && (
            <NavLink
              to="/admin"
              icon={<Settings className="w-6 h-6 md:w-7 md:h-7" />}
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
  showText?: boolean;
}

const NavLink = ({ to, icon, text, active, showText = true }: NavLinkProps) => (
  <Link
    to={to}
    className={`flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors ${
      active ? "text-primary-500" : "text-gray-700 hover:text-primary-500"
    }`}
  >
    {icon}
    <span className="text-sm md:text-base font-medium">{text}</span>
  </Link>
);

export default Navigation;
