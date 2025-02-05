import { Link } from "react-router-dom";
import { Activity, Book, Home, UtensilsCrossed, LineChart } from "lucide-react";

const Navigation = () => {
  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-primary-500 text-xl font-semibold">
            ModulaçãoGI
          </Link>
          <div className="flex space-x-6">
            <NavLink to="/" icon={<Home className="w-5 h-5" />} text="Início" />
            <NavLink
              to="/symptoms"
              icon={<Activity className="w-5 h-5" />}
              text="Sintomas"
            />
            <NavLink
              to="/diary"
              icon={<UtensilsCrossed className="w-5 h-5" />}
              text="Diário"
            />
            <NavLink
              to="/education"
              icon={<Book className="w-5 h-5" />}
              text="Educação"
            />
            <NavLink
              to="/progress"
              icon={<LineChart className="w-5 h-5" />}
              text="Progresso"
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
}

const NavLink = ({ to, icon, text }: NavLinkProps) => (
  <Link
    to={to}
    className="flex items-center space-x-1 text-gray-600 hover:text-primary-500 transition-colors"
  >
    {icon}
    <span>{text}</span>
  </Link>
);

export default Navigation;