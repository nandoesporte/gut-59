
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dumbbell, ChevronDown, ChevronUp, Info, Calendar, 
  Target, BarChart, Clock, Zap
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { WorkoutExerciseDetail } from "./WorkoutExerciseDetail";

interface CurrentWorkoutPlanProps {
  plan: any;
}

export const CurrentWorkoutPlan = ({ plan }: CurrentWorkoutPlanProps) => {
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();
  
  console.log('CurrentWorkoutPlan: received plan:', plan);
  console.log('CurrentWorkoutPlan: plan.workout_sessions:', plan?.workout_sessions);
  
  // Reset states when plan changes
  useEffect(() => {
    setExpandedExercises({});
    setActiveSessionIndex(0);
  }, [plan?.id]);

  const toggleExerciseExpanded = (exerciseId: string) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  // Format goal for display
  const formatGoal = (goal: string | undefined) => {
    if (!goal) return "Não definido";
    
    switch(goal) {
      case "gain_mass":
        return "Ganho de Massa";
      case "lose_weight":
        return "Perda de Peso";
      case "maintain":
        return "Manter Peso";
      default:
        return goal.charAt(0).toUpperCase() + goal.slice(1).replace(/_/g, ' ');
    }
  };

  // Verificar se há sessões de treino
  if (!plan?.workout_sessions || !Array.isArray(plan.workout_sessions) || plan.workout_sessions.length === 0) {
    console.log('CurrentWorkoutPlan: No workout sessions found');
    return (
      <Card className="w-full border-primary/20">
        <CardHeader className={`pb-2 ${isMobile ? 'px-3 py-3' : ''}`}>
          <CardTitle className="flex justify-between items-center text-lg sm:text-xl">
            <span>Seu Plano de Treino</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-4 ${isMobile ? 'p-3' : ''}`}>
          <div className="text-center p-6 text-muted-foreground">
            <p>Nenhuma sessão de treino encontrada neste plano.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-primary/20">
      <CardHeader className={`pb-2 ${isMobile ? 'px-3 py-3' : ''}`}>
        <CardTitle className="flex justify-between items-center text-lg sm:text-xl">
          <span>Seu Plano de Treino</span>
          {!isMobile && (
            <Badge variant="outline" className="text-xs ml-2">
              {plan?.workout_sessions?.length || 0} dias
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={`space-y-4 ${isMobile ? 'p-3' : ''}`}>
        {/* Mobile plan summary */}
        {isMobile && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center bg-primary/5 p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-primary mr-1.5" />
              <span className="text-xs font-medium">{plan?.workout_sessions?.length || 0} dias</span>
            </div>
            <div className="flex items-center bg-primary/5 p-2 rounded-lg">
              <Target className="h-4 w-4 text-primary mr-1.5" />
              <span className="text-xs font-medium">{formatGoal(plan?.goal)}</span>
            </div>
          </div>
        )}
        
        <Tabs value={`session-${activeSessionIndex + 1}`} className="space-y-4">
          <ScrollArea className={`w-full ${isMobile ? 'pb-1' : ''}`}>
            <TabsList className={`mb-2 w-full justify-start ${isMobile ? 'h-9' : ''}`}>
              {plan.workout_sessions.map((session: any, index: number) => (
                <TabsTrigger
                  key={`tab-${session.id || index}`}
                  value={`session-${index + 1}`}
                  onClick={() => setActiveSessionIndex(index)}
                  className={`${isMobile ? 'px-2 py-1 text-xs' : 'min-w-[80px] px-3'}`}
                >
                  {`Dia ${index + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          
          {plan.workout_sessions.map((session: any, index: number) => {
            console.log(`CurrentWorkoutPlan: session ${index}:`, session);
            console.log(`CurrentWorkoutPlan: session exercises:`, session?.session_exercises);
            
            return (
              <TabsContent key={`content-${session.id || index}`} value={`session-${index + 1}`} className="space-y-3 sm:space-y-4 animate-fadeIn">
                <div className="rounded-lg bg-primary/5 p-2 sm:p-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm sm:text-lg font-semibold text-primary">
                      {`Dia ${index + 1}`}
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-card rounded p-2 text-center flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">Exercícios</span>
                      <div className="flex items-center">
                        <Dumbbell className="w-3 h-3 mr-1 text-primary" />
                        <span className="font-medium text-sm">{session.session_exercises?.length || 0}</span>
                      </div>
                    </div>
                    <div className="bg-card rounded p-2 text-center flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground">Tempo Total</span>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1 text-primary" />
                        <span className="font-medium text-sm">~{(session.session_exercises?.length || 0) * 5} min</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs sm:text-sm font-semibold">Aquecimento</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">Realize sempre o aquecimento antes do treino principal</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                    {session.warmup_description || "Aquecimento de 5-10 minutos com movimentos dinâmicos"}
                  </p>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-semibold">Exercícios</h4>
                    <Badge variant="outline" className="text-xs">
                      {session.session_exercises?.length || 0} exercícios
                    </Badge>
                  </div>
                  
                  {!session.session_exercises || session.session_exercises.length === 0 ? (
                    <div className="text-center p-4 text-muted-foreground">
                      <p className="text-sm">Nenhum exercício encontrado para esta sessão.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {session.session_exercises.map((exerciseSession: any, exIndex: number) => {
                        const uniqueKey = `exercise-${session.id || index}-${exIndex}-${exerciseSession.id || 'unknown'}-${exerciseSession.exercise?.id || 'no-id'}`;
                        
                        console.log(`CurrentWorkoutPlan: exercise ${exIndex}:`, exerciseSession);
                        
                        return (
                          <WorkoutExerciseDetail 
                            key={uniqueKey}
                            exerciseSession={exerciseSession}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-xs sm:text-sm font-semibold">Resfriamento</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                    {session.cooldown_description || "Alongamento e relaxamento de 5-10 minutos"}
                  </p>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
};
