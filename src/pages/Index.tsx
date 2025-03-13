
import Profile from "@/components/Profile";
import Messages from "@/components/Messages";
import MessagesPersonal from "@/components/MessagesPersonal";
import { MessagesTab } from "@/components/admin/MessagesTab";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import FoodDiary from "@/components/FoodDiary";
import StepCounter from "@/components/StepCounter";
import TipsCalendar from "@/components/TipsCalendar";
import { useNavigate } from "react-router-dom";
import { WaterTracker } from "@/components/food-diary/WaterTracker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, 
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { LastMealPlanSummary } from "@/components/menu/components/LastMealPlanSummary";
import { MentalHealthSummary } from "@/components/mental/MentalHealthSummary";
import { LastWorkoutPlanSummary } from "@/components/workout/components/LastWorkoutPlanSummary";

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col items-center">
      {/* Profile Section */}
      <div className="w-full">
        <Profile />
      </div>
      
      {/* Summary cards with enhanced styling */}
      <div className="w-full grid grid-cols-1 gap-4">
        {/* Mental Health Summary */}
        <div className="w-full">
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-violet-50 to-white">
            <MentalHealthSummary />
          </Card>
        </div>
        
        {/* Meal Plan Summary */}
        <div className="w-full">
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-50 to-white">
            <LastMealPlanSummary />
          </Card>
        </div>
        
        {/* Workout Plan Summary */}
        <div className="w-full">
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
            <LastWorkoutPlanSummary />
          </Card>
        </div>
      </div>
      
      {/* Instructions Card */}
      <div className="w-full">
        <Card className="p-6 border-none shadow-md bg-gradient-to-br from-cyan-50 to-white overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-100 p-2.5 rounded-full">
                <GraduationCap className="h-6 w-6 text-cyan-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-cyan-800">Instruções</h2>
                <p className="text-sm text-cyan-600/80">Aprenda como utilizar a plataforma</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/instructions')} 
              variant="outline"
              className="bg-white hover:bg-cyan-50 border-cyan-200 text-cyan-700 gap-1"
            >
              Ver Instruções <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Tracking components */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="w-full">
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-orange-50 to-white">
            <StepCounter />
          </Card>
        </div>
        
        <div className="w-full">
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-sky-50 to-white">
            <WaterTracker />
          </Card>
        </div>
      </div>
      
      {/* Messages Section with role-specific display */}
      {isAdmin ? (
        <div className="w-full">
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-slate-50 to-white">
            <MessagesTab />
          </Card>
        </div>
      ) : isPersonal ? (
        <div className="w-full">
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-slate-50 to-white">
            <MessagesPersonal />
          </Card>
        </div>
      ) : (
        <div className="w-full">
          <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-white p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-indigo-100 p-2.5 rounded-full">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-indigo-800">Comunicação</h3>
            </div>
            <div className="space-y-3">
              <Messages />
              <MessagesPersonal />
            </div>
          </Card>
        </div>
      )}
      
      {/* Daily Challenges */}
      <div className="w-full">
        <TipsCalendar />
      </div>
    </div>
  );
};

export default Index;
