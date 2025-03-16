
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FisioPreferences } from "./types";
import { RehabPlan } from "./types/rehab-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw, FileDown, Dumbbell } from "lucide-react";
import { WorkoutLoadingState } from "../workout/components/WorkoutLoadingState";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { REWARDS } from '@/constants/rewards';
import { useWallet } from "@/hooks/useWallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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

      // Direct API call to the Supabase function using fetch instead of invoke
      const functionUrl = `${process.env.SUPABASE_URL || 'https://sxjafhzikftdenqnkcri.supabase.co'}/functions/v1/generate-rehab-plan-groq`;
      const { data: authData } = await supabase.auth.getSession();
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.session?.access_token}`
        },
        body: JSON.stringify({ 
          preferences, 
          userData: { 
            id: user.id,
            weight: user.user_metadata?.weight,
            height: user.user_metadata?.height,
            age: user.user_metadata?.age,
            gender: user.user_metadata?.gender
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();

      if (responseData) {
        await addTransaction({
          amount: REWARDS.REHAB_PLAN,
          type: 'physio_plan',
          description: 'Geração de plano de reabilitação com Groq'
        });
        
        setRehabPlan(responseData);
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

  const renderExerciseItem = (exercise: any) => {
    if (!exercise) return null;
    
    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4 hover:bg-gray-50 transition-colors">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-primary">{exercise.name}</h4>
            <div className="flex flex-wrap gap-2 mt-1">
              {exercise.sets && exercise.reps && (
                <Badge variant="outline" className="bg-primary/5">
                  {exercise.sets} séries x {exercise.reps} repetições
                </Badge>
              )}
              {exercise.intensity && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  {exercise.intensity}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {exercise.description && (
          <div className="mt-3 text-sm text-gray-600">
            <p>{exercise.description}</p>
          </div>
        )}
        
        {exercise.restTime && (
          <div className="mt-2 text-xs text-gray-500 flex items-center">
            <span className="text-blue-600">Descanso: {exercise.restTime}</span>
          </div>
        )}
      </div>
    );
  };

  const renderDailyExercises = (exercises: any[]) => {
    if (!exercises || exercises.length === 0) return <p className="text-gray-500 text-center py-4">Nenhum exercício para este dia</p>;
    
    return (
      <div className="space-y-4">
        {exercises.map((exercise, idx) => (
          <div key={idx}>
            {renderExerciseItem(exercise)}
          </div>
        ))}
      </div>
    );
  };

  const renderDailyPlan = (day: string) => {
    if (rehabPlan?.days && rehabPlan.days[day]) {
      const dayPlan = rehabPlan.days[day];
      
      return (
        <div className="space-y-6">
          {/* Informações do dia */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Observações do Dia</h3>
            <p className="text-gray-700 mt-2">{dayPlan.notes || "Sem observações específicas para este dia."}</p>
          </div>
          
          {/* Exercícios */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Exercícios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dayPlan.exercises ? (
                renderDailyExercises(dayPlan.exercises.flatMap(section => section.exercises || []))
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum exercício para este dia</p>
              )}
            </CardContent>
          </Card>
          
          {/* Plano Nutricional */}
          {dayPlan.nutrition && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-green-600">🥗</span>
                  Plano Alimentar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dayPlan.nutrition.breakfast && (
                    <div className="border-l-4 border-green-400 pl-4 py-2">
                      <h4 className="font-medium text-green-800">Café da Manhã</h4>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
                        {dayPlan.nutrition.breakfast.foods.map((food: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {food.portion} {food.unit} {food.name} {food.details && `(${food.details})`}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-gray-600">
                        <p>
                          {dayPlan.nutrition.breakfast.calories} kcal | Carbs: {dayPlan.nutrition.breakfast.macros.carbs}g | 
                          Proteínas: {dayPlan.nutrition.breakfast.macros.protein}g | Gorduras: {dayPlan.nutrition.breakfast.macros.fats}g
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {dayPlan.nutrition.lunch && (
                    <div className="border-l-4 border-amber-400 pl-4 py-2">
                      <h4 className="font-medium text-amber-800">Almoço</h4>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
                        {dayPlan.nutrition.lunch.foods.map((food: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {food.portion} {food.unit} {food.name} {food.details && `(${food.details})`}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-gray-600">
                        <p>
                          {dayPlan.nutrition.lunch.calories} kcal | Carbs: {dayPlan.nutrition.lunch.macros.carbs}g | 
                          Proteínas: {dayPlan.nutrition.lunch.macros.protein}g | Gorduras: {dayPlan.nutrition.lunch.macros.fats}g
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {dayPlan.nutrition.dinner && (
                    <div className="border-l-4 border-purple-400 pl-4 py-2">
                      <h4 className="font-medium text-purple-800">Jantar</h4>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
                        {dayPlan.nutrition.dinner.foods.map((food: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {food.portion} {food.unit} {food.name} {food.details && `(${food.details})`}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-gray-600">
                        <p>
                          {dayPlan.nutrition.dinner.calories} kcal | Carbs: {dayPlan.nutrition.dinner.macros.carbs}g | 
                          Proteínas: {dayPlan.nutrition.dinner.macros.protein}g | Gorduras: {dayPlan.nutrition.dinner.macros.fats}g
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {dayPlan.nutrition.snacks && dayPlan.nutrition.snacks.map((snack: any, idx: number) => (
                    <div key={idx} className="border-l-4 border-blue-400 pl-4 py-2">
                      <h4 className="font-medium text-blue-800">Lanche {idx + 1}</h4>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
                        {snack.foods.map((food: any, foodIdx: number) => (
                          <li key={foodIdx} className="text-sm">
                            {food.portion} {food.unit} {food.name} {food.details && `(${food.details})`}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2 text-xs text-gray-600">
                        <p>
                          {snack.calories} kcal | Carbs: {snack.macros.carbs}g | 
                          Proteínas: {snack.macros.protein}g | Gorduras: {snack.macros.fats}g
                        </p>
                      </div>
                    </div>
                  ))}
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

  return (
    <div className="space-y-8 animate-fadeIn">
      <Card className="overflow-hidden border-primary/20">
        <CardHeader className={`${isMobile ? 'px-4 py-4' : ''}`}>
          <CardTitle className="flex justify-between items-center text-lg sm:text-xl">
            <span>Seu Plano de Reabilitação</span>
            {!isMobile && rehabPlan?.days && (
              <Badge variant="outline" className="text-xs ml-2">
                {Object.keys(rehabPlan.days).length} dias
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className={`space-y-4 ${isMobile ? 'p-4' : ''}`}>
          {/* Visão Geral */}
          {rehabPlan?.overview && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Visão Geral</h3>
              <p className="text-gray-600">{rehabPlan.overview}</p>
            </div>
          )}

          {/* Recomendações Gerais */}
          {rehabPlan?.recommendations && (
            <div className="bg-green-50 p-4 rounded-lg mb-4">
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
          
          {/* Dias de Tratamento */}
          {dayTabs.length > 0 && (
            <Tabs value={selectedDay} onValueChange={setSelectedDay}>
              <ScrollArea className="w-full">
                <TabsList className={`mb-4 w-full justify-start sm:justify-center gap-1 sm:gap-2 ${isMobile ? 'h-9' : ''}`}>
                  {dayTabs.map(tab => (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id} 
                      className={`${isMobile ? 'px-2 py-1 text-xs' : 'min-w-[80px] px-3'}`}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </ScrollArea>
              
              {dayTabs.map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="space-y-4 animate-fadeIn">
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <h2 className="text-lg font-bold text-primary">📅 {tab.label} – Plano de Reabilitação</h2>
                  </div>
                  {renderDailyPlan(tab.id)}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
      
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
