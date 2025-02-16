
import { ReactNode, useEffect, useState } from "react";
import Navigation from "./Navigation";
import { supabase } from "@/integrations/supabase/client";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [hasNewMessage, setHasNewMessage] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        }, () => {
          setHasNewMessage(true);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchUser();
  }, []);

  // Efeito para garantir que a página sempre inicie no topo
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/70 backdrop-blur-lg shadow-sm fixed top-0 left-0 right-0 z-50 border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center relative">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/9456a3bf-9bc8-45d6-9105-dd939e3362f5.png" 
              alt="Mais Saúde" 
              className="h-10 w-auto"
            />
            <h1 className="text-2xl font-bold text-primary-500">
              Mais Saúde
            </h1>
          </div>
          {hasNewMessage && (
            <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </header>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 pb-28 animate-fadeIn mt-16">
        {children}
      </main>
      <Navigation />
    </div>
  );
};

export default Layout;
