import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FisioPreferences } from "./types";
import { RehabPlan } from "./types/rehab-plan";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, FileDown } from "lucide-react";
import { WorkoutLoadingState } from "../workout/components/WorkoutLoadingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REWARDS } from '@/constants/rewards';
import { useWallet } from "@/hooks/useWallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ExercisePlanDisplayProps {
  preferences: FisioPreferences;
  onReset: () => void;
}

export const ExercisePlanDisplay = ({ preferences, onReset }: ExercisePlanDisplayProps) => {
  const { addTransaction } = useWallet();
  const [loading, setLoading] = useState(true);
  const [rehabPlan, setRehabPlan] = useState<RehabPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("day1");
  const [loadingTime, setLoadingTime] = useState(0);

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

  const generatePlan = async () => {
    try {
      setLoading(true);
      setLoadingTime(0);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: response, error } = await supabase.functions.invoke('fisio-plus-agent', {
        body: { 
          preferences, 
          userId: user.id
        }
      });

      if (error) throw error;
      if (!response) throw new Error("Nenhum plano foi gerado");

      if (response) {
        await addTransaction({
          amount: REWARDS.REHAB_PLAN,
          type: 'physio_plan',
          description: 'Geração de plano de reabilitação com Fisio+ (Llama 3)'
        });
        
        setRehabPlan(response);
        toast.success(`Plano de reabilitação gerado com sucesso! +${REWARDS.REHAB_PLAN} FITs`);
      }
    } catch (error: any) {
      console.error("Erro ao gerar plano:", error);
      toast.error(error.message || "Erro ao gerar plano de reabilitação");
      setRehabPlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePlan();
  }, []);

  if (loading) {
    return <WorkoutLoadingState 
      loadingTime={loadingTime} 
      onRetry={() => generatePlan()}
      timePassed={loadingTime > 30} // Convert number to boolean by comparison
    />;
  }

  if (!rehabPlan) {
    return (
      <div className="text-center space-y-4 p-12">
        <h3 className="text-xl font-semibold text-red-600">
          Erro ao gerar o plano de reabilitação
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

  const renderMealItem = (mealName: string, mealDetails: any) => {
    if (!mealDetails || !mealDetails.foods || mealDetails.foods.length === 0) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center mb-3">
          <span className="text-primary mr-2">🍽️</span> {mealName}
        </h3>
        <div className="space-y-2 pl-5">
          {mealDetails.foods.map((food: any, idx: number) => (
            <div key={idx} className="flex items-baseline">
              <span className="mr-1">{food.portion}</span>
              {food.unit && <span className="mr-1">{food.unit} de</span>}
              <span className="font-medium">{food.name}</span>
              {food.details && (
                <span className="text-sm text-gray-500 ml-2">({food.details})</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t text-sm">
          <p>
            Total: {mealDetails.calories} kcal | Carboidratos: {mealDetails.macros.carbs}g | 
            Proteínas: {mealDetails.macros.protein}g | Gorduras: {mealDetails.macros.fats}g
            {mealDetails.macros.fiber > 0 && ` | Fibras: ${mealDetails.macros.fiber}g`}
          </p>
        </div>
      </div>
    );
  };

  const renderExerciseItem = (exerciseName: string, exerciseDetails: any) => {
    if (!exerciseDetails || !exerciseDetails.exercises || exerciseDetails.exercises.length === 0) return null;
    
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold flex items-center mb-3">
          <span className="text-primary mr-2">💪</span> {exerciseName}
        </h3>
        <div className="space-y-2 pl-5">
          {exerciseDetails.exercises.map((exercise: any, idx: number) => (
            <div key={idx} className="flex flex-col mb-3">
              <div className="flex items-baseline font-medium">
                <span className="mr-1">{exercise.name}</span>
                {exercise.sets && exercise.reps && (
                  <span className="text-sm text-gray-700 ml-2">
                    {exercise.sets} séries x {exercise.reps} repetições
                  </span>
                )}
              </div>
              {exercise.description && (
                <span className="text-sm text-gray-500 ml-2 mt-1">{exercise.description}</span>
              )}
              {exercise.restTime && (
                <span className="text-sm text-blue-600 ml-2 mt-1">Descanso: {exercise.restTime}</span>
              )}
            </div>
          ))}
        </div>
        {exerciseDetails.notes && (
          <div className="mt-3 pt-2 border-t text-sm">
            <p className="font-medium text-gray-700">Observações:</p>
            <p className="text-gray-600">{exerciseDetails.notes}</p>
          </div>
        )}
      </div>
    );
  };

  const renderDailyPlan = (day: string) => {
    if (rehabPlan.days && rehabPlan.days[day]) {
      const dayPlan = rehabPlan.days[day];
      return (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Observações do Dia</h3>
            <p className="text-gray-700 mt-2">{dayPlan.notes || "Sem observações específicas para este dia."}</p>
          </div>
          
          {dayPlan.exercises?.map((section: any, idx: number) => (
            <Card key={idx} className="overflow-hidden">
              <CardContent className="p-6">
                {renderExerciseItem(section.title, section)}
              </CardContent>
            </Card>
          ))}

          {dayPlan.nutrition && (
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <span className="text-green-600 mr-2">🥗</span> Plano Alimentar
                </h3>
                <div className="space-y-4">
                  {dayPlan.nutrition.breakfast && renderMealItem("Café da Manhã", dayPlan.nutrition.breakfast)}
                  {dayPlan.nutrition.morningSnack && renderMealItem("Lanche da Manhã", dayPlan.nutrition.morningSnack)}
                  {dayPlan.nutrition.lunch && renderMealItem("Almoço", dayPlan.nutrition.lunch)}
                  {dayPlan.nutrition.afternoonSnack && renderMealItem("Lanche da Tarde", dayPlan.nutrition.afternoonSnack)}
                  {dayPlan.nutrition.dinner && renderMealItem("Jantar", dayPlan.nutrition.dinner)}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }
    
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Detalhes do plano para este dia não disponíveis.</p>
      </div>
    );
  };

  const generateDayTabs = () => {
    if (!rehabPlan || !rehabPlan.days) return [];
    
    return Object.keys(rehabPlan.days).map(day => {
      const dayNumber = day.replace('day', '');
      return {
        id: day,
        label: `Dia ${dayNumber}`
      };
    });
  };

  const dayTabs = generateDayTabs();

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Seu Plano de Reabilitação
        </h2>
        
        {rehabPlan.overview && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Visão Geral</h3>
            <p className="text-gray-600">{rehabPlan.overview}</p>
          </div>
        )}

        {rehabPlan.recommendations && (
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-green-800">Recomendações Gerais</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
              {typeof rehabPlan.recommendations === 'string' ? (
                <li>{rehabPlan.recommendations}</li>
              ) : (
                Array.isArray(rehabPlan.recommendations) && 
                rehabPlan.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))
              )}
            </ul>
          </div>
        )}
      </Card>
      
      {dayTabs.length > 0 && (
        <Card className="p-6">
          <Tabs value={selectedDay} onValueChange={setSelectedDay}>
            <TabsList className="mb-6 w-full flex flex-nowrap overflow-x-auto pb-2 justify-start sm:justify-center gap-1 sm:gap-2">
              {dayTabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="whitespace-nowrap">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {dayTabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id}>
                <div className="p-4 bg-muted rounded-md mb-6">
                  <h2 className="text-xl font-bold">📅 {tab.label} – Plano de Reabilitação</h2>
                </div>
                {renderDailyPlan(tab.id)}
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      )}
      
      <div className="flex justify-center gap-4">
        <Button 
          onClick={onReset} 
          variant="outline"
          size="lg"
          className="hover:bg-primary/5"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Criar Novo Plano
        </Button>
        
        <Button 
          variant="default"
          size="lg"
          className="hover:bg-primary/90"
          onClick={() => toast.info("Funcionalidade de download em implementação")}
        >
          <FileDown className="w-4 h-4 mr-2" />
          Baixar PDF
        </Button>
      </div>
    </div>
  );
};
