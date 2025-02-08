
import { ReactNode, useEffect, useState } from "react";
import Navigation from "./Navigation";
import { Activity } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/70 backdrop-blur-lg shadow-sm fixed top-0 left-0 right-0 z-50 border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-center relative">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary-500" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                VitaGut
              </h1>
            </div>
            <span className="text-sm font-medium text-gray-700">Katia Santin</span>
            <span className="text-xs font-medium text-gray-600">Nutricionista</span>
          </div>
          {hasNewMessage && (
            <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </header>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6 pb-28 animate-fadeIn mt-24">
        {children}
      </main>
      <Navigation />
    </div>
  );
};

export default Layout;
