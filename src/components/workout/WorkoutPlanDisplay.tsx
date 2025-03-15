import React, { useState, useEffect, useCallback } from 'react';
import { WorkoutPreferences } from './types';
import { WorkoutPlan } from './types/workout-plan';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { WorkoutLoadingState } from './components/WorkoutLoadingState';

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
  onPlanGenerated: () => void;
}

export const WorkoutPlanDisplay = ({ preferences, onReset, onPlanGenerated }: WorkoutPlanDisplayProps) => {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTime, setLoadingTime] = useState(0);
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    let interval: number | null = null;
    if (loading) {
      interval = window.setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [loading]);

  const generateWorkoutPlan = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingTime(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Fetch AI model settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('ai_model_settings')
        .select('*')
        .eq('name', 'trene2025')
        .maybeSingle();

      if (settingsError) {
        console.error('Error fetching AI settings:', settingsError);
        toast.error('Erro ao carregar configurações de IA');
      }

      // Ensure preferences has all required fields, including days_per_week
      const enhancedPreferences = {
        ...preferences,
        days_per_week: preferences.days_per_week || getDaysPerWeekFromActivityLevel(preferences.activity_level)
      };

      // Add console log to debug the preferences being sent
      console.log('Sending preferences to workout plan generator:', enhancedPreferences);

      const { data: response, error } = await supabase.functions.invoke('generate-workout-plan-llama', {
        body: { 
          preferences: enhancedPreferences, 
          userId: user.id,
          settings: settingsData || {}
        }
      });

      if (error) throw error;
      if (!response) throw new Error("Nenhum plano foi gerado");

      console.log('Workout plan response received:', response);

      if (response.workoutPlan) {
        setWorkoutPlan(response.workoutPlan);
        toast.success("Plano de treino gerado com sucesso!");
        onPlanGenerated();

        // Update URL with plan ID and view mode
        const planId = response.workoutPlan.id;
        if (planId) {
          navigate(`/workout?planId=${planId}&view=details`);
        }
      } else {
        console.error("Erro ao gerar plano:", response.message);
        toast.error(response.message || "Erro ao gerar plano de treino");
        setWorkoutPlan(null);
      }
    } catch (error: any) {
      console.error("Erro ao gerar plano:", error);
      toast.error(error.message || "Erro ao gerar plano de treino");
      setWorkoutPlan(null);
    } finally {
      setLoading(false);
    }
  }, [preferences, onPlanGenerated, navigate]);

  useEffect(() => {
    generateWorkoutPlan();
  }, [generateWorkoutPlan]);

  const getDaysPerWeekFromActivityLevel = (activityLevel: string): number => {
    switch (activityLevel) {
      case 'sedentary': return 2; // Tuesday and Thursday
      case 'light': return 3; // Monday, Wednesday, Friday
      case 'moderate': return 5; // Monday through Friday
      case 'intense': return 6; // Monday through Saturday
      default: return 3; // Default to 3 days
    }
  };

  const renderExerciseItem = (exercise: any) => {
    if (!exercise || !exercise.exercise) {
      console.error("Invalid exercise data:", exercise);
      return null;
    }
    
    return (
      <div key={exercise.exercise.id} className="mb-4 p-4 bg-gray-50 rounded-md shadow-sm">
        <h4 className="text-lg font-semibold flex items-center mb-2">
          <span className="mr-2">💪</span> {exercise.exercise.name}
        </h4>
        <p className="text-sm text-gray-600">{exercise.exercise.description}</p>
        <div className="mt-2">
          <p className="text-sm">
            <span className="font-medium">Séries:</span> {exercise.sets}, <span className="font-medium">Repetições:</span> {exercise.reps}, <span className="font-medium">Descanso:</span> {exercise.rest_time_seconds}s
          </p>
        </div>
        {exercise.weight_recommendations && (
          <div className="mt-2 p-2 bg-gray-50 rounded border-l-2 border-primary">
            <p className="text-sm font-medium">Recomendações de Carga:</p>
            <ul className="text-xs space-y-1 mt-1">
              <li><span className="font-medium">Iniciante:</span> {exercise.weight_recommendations.beginner}</li>
              <li><span className="font-medium">Moderado:</span> {exercise.weight_recommendations.moderate}</li>
              <li><span className="font-medium">Avançado:</span> {exercise.weight_recommendations.advanced}</li>
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <WorkoutLoadingState 
      loadingTime={loadingTime} 
      onRetry={() => generateWorkoutPlan()}
      timePassed={loadingTime > 30}
    />;
  }

  if (!workoutPlan) {
    return (
      <div className="text-center space-y-4 p-12">
        <h3 className="text-xl font-semibold text-red-600">
          Erro ao gerar o plano de treino
        </h3>
        <p className="text-muted-foreground">
          Não foi possível gerar seu plano. Por favor, tente novamente.
        </p>
        <Button onClick={onReset} variant="outline" size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seu Plano de Treino Personalizado</CardTitle>
          <CardDescription>
            Baseado nas suas preferências, aqui está o plano de treino gerado para você.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Objetivo: {workoutPlan.goal}</h3>
            <p className="text-sm text-muted-foreground">
              Início: {new Date(workoutPlan.start_date).toLocaleDateString()} - Fim: {new Date(workoutPlan.end_date).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {workoutPlan.workout_sessions && workoutPlan.workout_sessions.map((session, index) => (
        <Card key={index} className="transform transition-all duration-300 hover:scale-[1.01]">
          <CardHeader>
            <CardTitle>
              {session.day_name}
            </CardTitle>
            <CardDescription>
              {session.focus}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-md font-medium">Aquecimento</h4>
              <p className="text-sm text-gray-600">{session.warmup_description}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-md font-medium">Exercícios</h4>
              {session.session_exercises && session.session_exercises.map(exercise => renderExerciseItem(exercise))}
            </div>
            <div className="space-y-2">
              <h4 className="text-md font-medium">Volta à Calma</h4>
              <p className="text-sm text-gray-600">{session.cooldown_description}</p>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-center gap-4">
        <Button 
          onClick={onReset} 
          variant="outline"
          size="lg"
          className="hover:bg-primary/5"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Gerar Novo Plano
        </Button>
        
        <Button 
          variant="default"
          size="lg"
          className="hover:bg-primary/90"
          onClick={() => toast.info("Funcionalidade em desenvolvimento")}
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Salvar Plano
        </Button>
      </div>
    </div>
  );
};
