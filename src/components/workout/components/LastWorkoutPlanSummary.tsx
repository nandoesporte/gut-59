
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Calendar, 
  Dumbbell, 
  Target, 
  Clock, 
  ChevronRight,
  BarChart3 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPlan } from "../types/workout-plan";
// Removing incorrect import and we're not using this component here anyway

export const LastWorkoutPlanSummary = () => {
  const [lastPlan, setLastPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlanDetailsOpen, setIsPlanDetailsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLastWorkoutPlan = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("Usuário não autenticado");
          setLoading(false);
          return;
        }

        // Fetch the most recent workout plan
        const { data, error } = await supabase
          .from('workout_plans')
          .select(`
            *,
            workout_sessions (
              *,
              session_exercises (
                *,
                exercise:exercises (*)
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Changed from .single() to .maybeSingle() to avoid errors when no data is found

        if (error) {
          console.error("Erro ao buscar último plano de treino:", error);
          setLoading(false);
          return;
        }

        if (data) {
          console.log("Último plano de treino encontrado:", data.id);
          setLastPlan(data as WorkoutPlan);
        }
      } catch (error) {
        console.error("Erro ao buscar último plano de treino:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastWorkoutPlan();
  }, []);

  const handleViewDetails = () => {
    navigate('/workout');
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) {
      return "Data indisponível";
    }
  };

  if (loading) {
    return (
      <Card className="w-full mt-4">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!lastPlan || !lastPlan.workout_sessions || lastPlan.workout_sessions.length === 0) {
    return null;
  }

  // Count total exercises across all sessions
  const totalExercises = lastPlan.workout_sessions.reduce((total, session) => {
    return total + (session.session_exercises?.length || 0);
  }, 0);

  // Find the focus areas (unique values)
  const focusAreas = Array.from(new Set(
    lastPlan.workout_sessions
      .map(session => session.focus)
      .filter(Boolean)
  )).join(', ');

  return (
    <Card className="w-full mt-4 overflow-hidden border-none shadow-sm bg-white">
      <CardContent className="p-4">
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 p-2 rounded-full">
                <Dumbbell className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-indigo-800">Seu Plano de Treino</h3>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleViewDetails}
              className="bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700 text-xs px-3 py-1 h-auto"
            >
              Ver completo <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>

          <p className="text-sm text-indigo-600/80 mb-2 -mt-1">
            {formatDate(lastPlan.created_at)}
          </p>

          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="bg-blue-50 rounded-lg p-2 transition-all">
              <div className="flex items-center justify-center text-blue-600 mb-1">
                <Target className="h-4 w-4" />
              </div>
              <p className="text-xs text-center text-blue-800 font-medium">Objetivo</p>
              <p className="text-sm font-bold text-center text-blue-700">{lastPlan.goal}</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-2 transition-all">
              <div className="flex items-center justify-center text-purple-600 mb-1">
                <Calendar className="h-4 w-4" />
              </div>
              <p className="text-xs text-center text-purple-800 font-medium">Dias</p>
              <p className="text-sm font-bold text-center text-purple-700">{lastPlan.workout_sessions.length}</p>
            </div>
            
            <div className="bg-pink-50 rounded-lg p-2 transition-all">
              <div className="flex items-center justify-center text-pink-600 mb-1">
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="text-xs text-center text-pink-800 font-medium">Exercícios</p>
              <p className="text-sm font-bold text-center text-pink-700">{totalExercises}</p>
            </div>
            
            <div className="bg-indigo-50 rounded-lg p-2 transition-all">
              <div className="flex items-center justify-center text-indigo-600 mb-1">
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-xs text-center text-indigo-800 font-medium">Intensidade</p>
              <p className="text-sm font-bold text-center text-indigo-700">
                {lastPlan.workout_sessions[0]?.intensity || "Média"}
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-lg p-2 transition-all text-center">
            <p className="text-xs text-slate-600 font-medium">Foco principal</p>
            <p className="text-sm font-bold text-primary-700">{focusAreas || "Completo"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
