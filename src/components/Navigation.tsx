
import { Link, useLocation } from "react-router-dom";
import { Book, Home, LineChart, ShoppingBag, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
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
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <NavLink
            to="/"
            icon={<Home className="w-6 h-6" />}
            text="Início"
            active={isActive("/")}
          />
          <NavLink
            to="/store"
            icon={<ShoppingBag className="w-6 h-6" />}
            text="Loja"
            active={isActive("/store")}
          />
          <NavLink
            to="/education"
            icon={<Book className="w-6 h-6" />}
            text="Educação"
            active={isActive("/education")}
          />
          <NavLink
            to="/progress"
            icon={<LineChart className="w-6 h-6" />}
            text="Diário"
            active={isActive("/progress")}
          />
          {isAdmin && (
            <NavLink
              to="/admin"
              icon={<Settings className="w-6 h-6" />}
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
    className={`flex flex-col items-center space-y-1 px-4 py-2 rounded-lg transition-colors ${
      active ? "text-primary-500" : "text-gray-400 hover:text-primary-500"
    }`}
  >
    {icon}
    <span className="text-xs font-medium">{text}</span>
  </Link>
);

export default Navigation;
