
import { Link, useLocation } from "react-router-dom";
import { Book, Home, LineChart, ShoppingBag, Settings, ScrollText, UtensilsCrossed, Dumbbell, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const isMobile = useIsMobile();
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data } = await supabase.rpc('has_role', { role: 'admin' });
      setIsAdmin(!!data);
    };

    const setupMessageSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const channel = supabase
          .channel('messages')
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`
          }, () => {
            setHasNewMessage(true);
            toast("Nova mensagem recebida!", {
              description: "Você tem uma nova mensagem.",
            });
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    checkAdminRole();
    setupMessageSubscription();
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
            icon={<Home className="w-5 h-5 md:w-6 md:h-6" />}
            text="Início"
            active={isActive("/")}
            showText={!isMobile}
          />
          <NavLink
            to="/menu"
            icon={<UtensilsCrossed className="w-5 h-5 md:w-6 md:h-6" />}
            text="Cardápio"
            active={isActive("/menu")}
            showText={!isMobile}
          />
          <NavLink
            to="/trainer"
            icon={<Dumbbell className="w-5 h-5 md:w-6 md:h-6" />}
            text="Treino"
            active={isActive("/trainer")}
            showText={!isMobile}
          />
          <a
            href="https://katiasantin.com.br/loja"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center space-y-1 px-2 py-1 rounded-lg transition-colors text-gray-400 hover:text-primary-500"
          >
            <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" />
            {!isMobile && <span className="text-xs font-medium">Produtos</span>}
          </a>
          <NavLink
            to="/progress"
            icon={<LineChart className="w-5 h-5 md:w-6 md:h-6" />}
            text="Diário"
            active={isActive("/progress")}
            showText={!isMobile}
          />
          <div className="relative">
            <NavLink
              to="/messages"
              icon={<MessageSquare className="w-5 h-5 md:w-6 md:h-6" />}
              text="Mensagens"
              active={isActive("/messages")}
              showText={!isMobile}
            />
            {hasNewMessage && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </div>
          {isAdmin && (
            <NavLink
              to="/admin"
              icon={<Settings className="w-5 h-5 md:w-6 md:h-6" />}
              text="Admin"
              active={isActive("/admin")}
              showText={!isMobile}
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
      active ? "text-primary-500" : "text-gray-400 hover:text-primary-500"
    }`}
  >
    {icon}
    {showText && <span className="text-xs font-medium">{text}</span>}
  </Link>
);

export default Navigation;
