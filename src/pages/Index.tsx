
import Profile from "@/components/Profile";
import SymptomTracker from "@/components/SymptomTracker";
import FoodDiary from "@/components/FoodDiary";
import Education from "@/components/Education";
import Messages from "@/components/Messages";
import ShoppingList from "@/components/ShoppingList";
import { MessagesTab } from "@/components/admin/MessagesTab";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data } = await supabase.rpc('has_role', { role: 'admin' });
      setIsAdmin(!!data);
    };

    checkAdminRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminRole();
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
      {isAdmin ? (
        <div className="w-full">
          <MessagesTab />
        </div>
      ) : (
        <div className="w-full">
          <Messages />
        </div>
      )}
      <div className="w-full">
        <SymptomTracker />
      </div>
      <div className="w-full">
        <FoodDiary />
      </div>
      <div className="w-full">
        <ShoppingList />
      </div>
      <div className="w-full">
        <Education />
      </div>
    </div>
  );
};

export default Index;
