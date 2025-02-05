import { ReactNode } from "react";
import Navigation from "./Navigation";
import { Heart } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-primary-400 to-primary-500 shadow-sm">
        <div className="container py-4 px-4 flex items-center gap-2">
          <Heart className="w-6 h-6 text-white" />
          <h1 className="text-2xl font-bold text-white">VitaGut</h1>
        </div>
      </header>
      <main className="container py-6 pb-24 animate-fadeIn">{children}</main>
      <Navigation />
    </div>
  );
};

export default Layout;