
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkoutPlan } from "../types/workout-plan";
import { WorkoutSessionCard } from "./WorkoutSessionCard";
import { WorkoutPlanOverview } from "./WorkoutPlanOverview";
import { 
  Calendar, 
  Target, 
  Dumbbell,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CurrentWorkoutPlanProps {
  plan: WorkoutPlan;
}

export const CurrentWorkoutPlan = ({ plan }: CurrentWorkoutPlanProps) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) {
      return "Data indisponível";
    }
  };

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
        return goal;
    }
  };

  // Ensure workout_sessions is an array
  const sessions = Array.isArray(plan.workout_sessions) ? plan.workout_sessions : [];
  
  // Sort sessions by day_number
  const sortedSessions = [...sessions].sort((a, b) => a.day_number - b.day_number);

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <Card className="overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-primary">
                Plano de Treino - {formatGoal(plan.goal)}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Criado em {formatDate(plan.created_at)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4" />
                  <span>{sessions.length} dias de treino</span>
                </div>
              </div>
            </div>
            <Badge variant="secondary" className="self-start sm:self-center">
              <Dumbbell className="w-3 h-3 mr-1" />
              Ativo
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Plan Overview */}
      <WorkoutPlanOverview plan={plan} />

      {/* Workout Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Sessões de Treino
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Nenhuma sessão de treino encontrada neste plano.</p>
            </div>
          ) : (
            <Tabs defaultValue={`session-${sortedSessions[0]?.day_number}`} className="w-full">
              <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 h-auto p-1">
                {sortedSessions.map((session) => (
                  <TabsTrigger 
                    key={session.id} 
                    value={`session-${session.day_number}`}
                    className="text-xs py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    Dia {session.day_number}
                    {session.focus && (
                      <span className="block text-xs opacity-70 mt-0.5 truncate">
                        {session.focus}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {sortedSessions.map((session) => (
                <TabsContent 
                  key={session.id} 
                  value={`session-${session.day_number}`}
                  className="mt-6"
                >
                  <WorkoutSessionCard session={session} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
