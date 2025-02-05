import { Link, useLocation } from "react-router-dom";
import { Activity, Book, Home, UtensilsCrossed, LineChart } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-primary-500 text-2xl font-bold">
            ModulaçãoGI
          </Link>
          <div className="flex space-x-8">
            <NavLink
              to="/"
              icon={<Home className="w-5 h-5" />}
              text="Início"
              active={isActive("/")}
            />
            <NavLink
              to="/symptoms"
              icon={<Activity className="w-5 h-5" />}
              text="Sintomas"
              active={isActive("/symptoms")}
            />
            <NavLink
              to="/diary"
              icon={<UtensilsCrossed className="w-5 h-5" />}
              text="Diário"
              active={isActive("/diary")}
            />
            <NavLink
              to="/education"
              icon={<Book className="w-5 h-5" />}
              text="Educação"
              active={isActive("/education")}
            />
            <NavLink
              to="/progress"
              icon={<LineChart className="w-5 h-5" />}
              text="Progresso"
              active={isActive("/progress")}
            />
          </div>
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
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
      active
        ? "text-primary-500 bg-primary-50"
        : "text-gray-600 hover:text-primary-500 hover:bg-primary-50"
    }`}
  >
    {icon}
    <span className="font-medium">{text}</span>
  </Link>
);

export default Navigation;