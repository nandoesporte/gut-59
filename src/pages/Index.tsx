
import Profile from "@/components/Profile";
import Messages from "@/components/Messages";
import MessagesPersonal from "@/components/MessagesPersonal";
import { MessagesTab } from "@/components/admin/MessagesTab";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FoodDiary from "@/components/FoodDiary";
import StepCounter from "@/components/StepCounter";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPersonal, setIsPersonal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/auth');
          return;
        }

        const [adminResult, personalResult] = await Promise.all([
          supabase.rpc('has_role', { role: 'admin' }),
          supabase.rpc('has_role', { role: 'personal' })
        ]);
        
        setIsAdmin(!!adminResult.data);
        setIsPersonal(!!personalResult.data);
      } catch (error) {
        console.error('Error checking session:', error);
        navigate('/auth');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/auth');
        return;
      }
      checkSession();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 flex flex-col items-center">
      <div className="w-full">
        <Profile />
      </div>
      <div className="w-full">
        <StepCounter />
      </div>
      {isAdmin ? (
        <div className="w-full">
          <MessagesTab />
        </div>
      ) : isPersonal ? (
        <div className="w-full">
          <MessagesPersonal />
        </div>
      ) : (
        <>
          <div className="w-full">
            <Messages />
          </div>
          <div className="w-full">
            <MessagesPersonal />
          </div>
        </>
      )}
      <div className="w-full">
        <FoodDiary />
      </div>
    </div>
  );
};

export default Index;
