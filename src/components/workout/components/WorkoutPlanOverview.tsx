
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkoutPlan } from "../types/workout-plan";
import { 
  BarChart3, 
  Target, 
  Clock, 
  Zap,
  Calendar,
  AlertCircle
} from "lucide-react";

interface WorkoutPlanOverviewProps {
  plan: WorkoutPlan;
}

export const WorkoutPlanOverview = ({ plan }: WorkoutPlanOverviewProps) => {
  // Calculate total exercises across all sessions
  const totalExercises = plan.workout_sessions?.reduce((total, session) => {
    return total + (session.session_exercises?.length || 0);
  }, 0) || 0;

  // Get unique muscle groups
  const muscleGroups = Array.from(new Set(
    plan.workout_sessions?.flatMap(session => 
      session.session_exercises?.map(ex => ex.exercise?.muscle_group).filter(Boolean) || []
    ) || []
  ));

  // Get focus areas
  const focusAreas = Array.from(new Set(
    plan.workout_sessions?.map(session => session.focus).filter(Boolean) || []
  ));

  // Get intensity levels
  const intensityLevels = Array.from(new Set(
    plan.workout_sessions?.map(session => session.intensity).filter(Boolean) || []
  ));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Visão Geral do Plano
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sessions */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {plan.workout_sessions?.length || 0}
              </span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-medium">
              Dias de Treino
            </p>
          </div>

          {/* Total Exercises */}
          <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Target className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                {totalExercises}
              </span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
              Total de Exercícios
            </p>
          </div>

          {/* Muscle Groups */}
          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Zap className="w-5 h-5 text-purple-600" />
              <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {muscleGroups.length}
              </span>
            </div>
            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1 font-medium">
              Grupos Musculares
            </p>
          </div>

          {/* Average Intensity */}
          <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Clock className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
                {intensityLevels.length > 0 ? intensityLevels[0] : "Média"}
              </span>
            </div>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1 font-medium">
              Intensidade
            </p>
          </div>
        </div>

        {/* Additional Details */}
        <div className="mt-6 space-y-4">
          {/* Focus Areas */}
          {focusAreas.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Foco do Treino:</h4>
              <div className="flex flex-wrap gap-2">
                {focusAreas.map((focus, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {focus}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Muscle Groups */}
          {muscleGroups.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Grupos Musculares Trabalhados:</h4>
              <div className="flex flex-wrap gap-2">
                {muscleGroups.slice(0, 8).map((group, index) => (
                  <Badge key={index} variant="secondary" className="text-xs capitalize">
                    {group}
                  </Badge>
                ))}
                {muscleGroups.length > 8 && (
                  <Badge variant="outline" className="text-xs">
                    +{muscleGroups.length - 8} mais
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Critique */}
          {plan.critique && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">
                    Observações do Plano
                  </h4>
                  {plan.critique.notes && (
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {plan.critique.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
