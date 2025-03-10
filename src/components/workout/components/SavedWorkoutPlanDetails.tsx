
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Target, 
  Dumbbell,
  BarChart3,
  Clock,
  CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WorkoutPlan } from "../types/workout-plan";

interface SavedWorkoutPlanDetailsProps {
  plan: WorkoutPlan;
}

export const SavedWorkoutPlanDetails = ({ plan }: SavedWorkoutPlanDetailsProps) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) {
      return "Data indisponível";
    }
  };

  // Count total exercises across all sessions
  const totalExercises = plan.workout_sessions.reduce((total, session) => {
    return total + (session.session_exercises?.length || 0);
  }, 0);

  // Find the focus areas (unique values)
  const focusAreas = Array.from(new Set(
    plan.workout_sessions
      .map(session => session.focus)
      .filter(Boolean)
  ));

  return (
    <Card className="border border-primary/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Detalhes do Plano
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="font-medium">Objetivo:</span>
              <span>{plan.goal}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-medium">Criado em:</span>
              <span>{formatDate(plan.created_at)}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="font-medium">Duração:</span>
              <span>{plan.workout_sessions.length} dias</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="font-medium">Total de exercícios:</span>
              <span>{totalExercises}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">Intensidade:</span>
              <span>{plan.workout_sessions[0]?.intensity || "Média"}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Foco das sessões:</h3>
          <div className="flex flex-wrap gap-2">
            {focusAreas.length > 0 ? (
              focusAreas.map((focus, index) => (
                <Badge key={index} variant="secondary">
                  {focus}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">Treino completo</span>
            )}
          </div>
        </div>
        
        {plan.critique && (
          <div className="mt-4 bg-muted/30 p-3 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Observações:</h3>
            <p className="text-sm text-muted-foreground">{plan.critique.notes}</p>
            
            {plan.critique.strengths && plan.critique.strengths.length > 0 && (
              <div className="mt-2">
                <h4 className="text-xs font-medium text-green-600">Pontos fortes:</h4>
                <ul className="text-xs text-muted-foreground ml-4 list-disc">
                  {plan.critique.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {plan.critique.suggestions && plan.critique.suggestions.length > 0 && (
              <div className="mt-2">
                <h4 className="text-xs font-medium text-amber-600">Sugestões:</h4>
                <ul className="text-xs text-muted-foreground ml-4 list-disc">
                  {plan.critique.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
