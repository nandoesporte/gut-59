import { ReactNode } from "react";
import Navigation from "./Navigation";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container py-4">
          <h1 className="text-2xl font-bold text-primary-500">ModulaçãoGI</h1>
        </div>
      </header>
      <main className="container py-6 pb-24 animate-fadeIn">{children}</main>
      <Navigation />
    </div>
  );
};

export default Layout;