
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
  Lightbulb,
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
      {/* Profile Section with shadow effect */}
      <div className="w-full">
        <Profile />
      </div>
      
      {/* Summary cards with enhanced styling */}
      <div className="w-full grid grid-cols-1 gap-4">
        {/* Mental Health Summary with enhanced styling */}
        <div className="w-full transform transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg">
          <MentalHealthSummary />
        </div>
        
        {/* Meal Plan Summary with enhanced styling */}
        <div className="w-full transform transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg">
          <LastMealPlanSummary />
        </div>
        
        {/* Workout Plan Summary with enhanced styling */}
        <div className="w-full transform transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg">
          <LastWorkoutPlanSummary />
        </div>
      </div>
      
      {/* Instructions Card with better visual hierarchy */}
      <div className="w-full">
        <Card className="p-6 border-none shadow-sm bg-gradient-to-br from-blue-50 to-white overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-blue-800">Instruções</h2>
                <p className="text-sm text-blue-600/80">Aprenda como utilizar a plataforma</p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/instructions')} 
              variant="outline"
              className="bg-white hover:bg-blue-50 border-blue-200 text-blue-700 gap-1"
            >
              Ver Instruções <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
      
      {/* Reorganizing tracking components */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="w-full transform transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg">
          <StepCounter />
        </div>
        
        <div className="w-full transform transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg">
          <WaterTracker />
        </div>
      </div>
      
      {/* Messages Section with role-specific display */}
      {isAdmin ? (
        <div className="w-full">
          <MessagesTab />
        </div>
      ) : isPersonal ? (
        <div className="w-full">
          <MessagesPersonal />
        </div>
      ) : (
        <div className="w-full grid grid-cols-1 gap-4">
          <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-50 to-white p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-indigo-100 p-2 rounded-full">
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
      
      {/* Tips Calendar with improved styling */}
      <div className="w-full transform transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg">
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 flex items-center gap-3">
            <div className="bg-amber-100 p-2 rounded-full">
              <Lightbulb className="h-5 w-5 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-amber-800">Atividades Diárias</h3>
          </div>
          <div className="p-4">
            <TipsCalendar />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Index;
