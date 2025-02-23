
import { ReactNode, useEffect, useState } from "react";
import Navigation from "./Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { PaymentConfirmationDialog } from "./menu/components/PaymentConfirmationDialog";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const location = useLocation();

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

      // Check for payment confirmation in URL
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status');
      const message = urlParams.get('message');
      
      if (paymentStatus === 'success' && message) {
        setPaymentMessage(decodeURIComponent(message));
        setShowPaymentConfirmation(true);
      }

      return () => {
        supabase.removeChannel(channel);
      };
    };

    fetchUser();
  }, []);

  // Reset scroll position when route changes or page loads
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/70 backdrop-blur-lg shadow-sm fixed top-0 left-0 right-0 z-50 border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-center relative">
          <div className="flex items-center gap-3">
            <img 
              src="/lovable-uploads/9456a3bf-9bc8-45d6-9105-dd939e3362f5.png" 
              alt="Mais Saúde" 
              className="h-8 w-auto sm:h-10"
            />
            <h1 className="text-xl sm:text-2xl font-bold text-primary-500">
              Mais Saúde
            </h1>
          </div>
          {hasNewMessage && (
            <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
      </header>
      <main className="w-full px-2 sm:px-6 lg:px-8 py-4 pb-24 animate-fadeIn mt-16">
        {children}
      </main>
      <Navigation />
      
      <PaymentConfirmationDialog
        open={showPaymentConfirmation}
        onOpenChange={setShowPaymentConfirmation}
        message={paymentMessage}
      />
    </div>
  );
};

export default Layout;
