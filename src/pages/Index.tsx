
import Profile from "@/components/Profile";
import Messages from "@/components/Messages";
import MessagesPersonal from "@/components/MessagesPersonal";
import { MessagesTab } from "@/components/admin/MessagesTab";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FoodDiary from "@/components/FoodDiary";

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPersonal, setIsPersonal] = useState(false);

  useEffect(() => {
    const checkRoles = async () => {
      const [adminResult, personalResult] = await Promise.all([
        supabase.rpc('has_role', { role: 'admin' }),
        supabase.rpc('has_role', { role: 'personal' })
      ]);
      
      setIsAdmin(!!adminResult.data);
      setIsPersonal(!!personalResult.data);
    };

    checkRoles();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkRoles();
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-8 flex flex-col items-center">
      <div className="w-full">
        <Profile />
      </div>
      <div className="w-full">
        <FoodDiary />
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
    </div>
  );
};

export default Index;
