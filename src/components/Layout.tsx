
import { ReactNode } from "react";
import Navigation from "./Navigation";
import { Heart } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-lg mx-auto h-20 flex items-center justify-center relative px-4">
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-primary-500" />
              <h1 className="text-xl font-semibold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                VitaGut
              </h1>
            </div>
            <span className="text-sm font-medium text-gray-700">Katia Santin</span>
            <span className="text-xs text-gray-600">Nutricionista</span>
          </div>
        </div>
      </header>
      <main className="container py-6 pb-24 animate-fadeIn mt-20">
        {children}
      </main>
      <Navigation />
    </div>
  );
};

export default Layout;
