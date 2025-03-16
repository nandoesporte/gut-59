
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
import { formatImageUrl } from "@/utils/imageUtils";

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

      // Direct API call to the Supabase function using fetch
      const functionUrl = `${process.env.SUPABASE_URL || 'https://sxjafhzikftdenqnkcri.supabase.co'}/functions/v1/generate-rehab-plan-groq`;
      const { data: authData } = await supabase.auth.getSession();
      
      console.log("Starting fetch request to:", functionUrl);
      
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

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Error: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log("Rehab plan data received:", responseData);

      if (responseData) {
        await addTransaction({
          amount: REWARDS.REHAB_PLAN,
          type: 'physio_plan',
          description: 'Geração de plano de reabilitação com Groq'
        });
        
        // Process the plan to ensure proper exercise display
        const processedPlan = processRehabPlan(responseData);
        setRehabPlan(processedPlan);
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

  // Process the rehab plan to ensure proper structure and add gif URLs
  const processRehabPlan = (plan: any): RehabPlan => {
    console.log("Processing rehab plan:", plan);
    
    // If the plan doesn't have the expected format, try to normalize it
    if (!plan.days && plan.rehab_sessions) {
      // Convert from database format to display format
      const days: Record<string, any> = {};
      
      plan.rehab_sessions.forEach((session: any, index: number) => {
        const dayKey = `day${index + 1}`;
        
        days[dayKey] = {
          notes: session.notes || `Dia ${index + 1} do tratamento`,
          exercises: [{
            title: "Exercícios de Reabilitação",
            exercises: session.exercises.map((ex: any) => ({
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              restTime: `${Math.floor(ex.rest_time_seconds / 60)} minutos ${ex.rest_time_seconds % 60} segundos`,
              description: ex.notes || "Realize o exercício com cuidado e atenção à técnica.",
              gifUrl: ex.gifUrl || null
            }))
          }]
        };
      });
      
      plan.days = days;
    }
    
    // Ensure the plan has days
    if (!plan.days) {
      console.warn("Plan doesn't have days structure:", plan);
      plan.days = {};
    }
    
    // Assign default GIFs based on exercise names if missing
    Object.keys(plan.days).forEach(dayKey => {
      const day = plan.days[dayKey];
      
      if (day.exercises) {
        day.exercises.forEach((exerciseGroup: any) => {
          if (exerciseGroup.exercises) {
            exerciseGroup.exercises.forEach((exercise: any) => {
              if (!exercise.gifUrl) {
                // Try to assign a default GIF based on the exercise name
                exercise.gifUrl = getExerciseGifByName(exercise.name);
              }
            });
          }
        });
      }
    });
    
    return plan as RehabPlan;
  };
  
  // Function to get a GIF URL based on exercise name
  const getExerciseGifByName = (name: string): string | null => {
    if (!name) return "/placeholder.svg";
    
    // Map common exercise names to GIF URLs
    const exerciseGifMap: Record<string, string> = {
      // Knee exercises
      "Flexão de Joelho": "knee_flexion.gif",
      "Extensão de Joelho": "knee_extension.gif",
      "Fortalecimento de Quadríceps": "quad_strengthening.gif",
      "Elevação de Perna Reta": "straight_leg_raise.gif",
      "Agachamento Parcial": "partial_squat.gif",
      
      // Ankle exercises
      "Flexão Plantar": "plantar_flexion.gif",
      "Dorsiflexão": "dorsiflexion.gif",
      "Inversão do Tornozelo": "ankle_inversion.gif",
      "Eversão do Tornozelo": "ankle_eversion.gif",
      
      // Shoulder exercises
      "Rotação Externa": "external_rotation.gif",
      "Rotação Interna": "internal_rotation.gif",
      "Elevação de Ombro": "shoulder_elevation.gif",
      
      // Generic exercises
      "Alongamento": "stretching.gif",
      "Fortalecimento": "strengthening.gif",
      "Caminhada": "walking.gif",
      "Equilíbrio": "balance.gif"
    };
    
    console.log("Looking for GIF for exercise:", name);
    
    // Try to find an exact match
    if (exerciseGifMap[name]) {
      const gifUrl = `${process.env.SUPABASE_URL || 'https://sxjafhzikftdenqnkcri.supabase.co'}/storage/v1/object/public/exercise-gifs/${exerciseGifMap[name]}`;
      console.log("Found exact match GIF:", gifUrl);
      return gifUrl;
    }
    
    // Try to find a partial match
    const lowerName = name.toLowerCase();
    for (const [key, url] of Object.entries(exerciseGifMap)) {
      if (lowerName.includes(key.toLowerCase())) {
        const gifUrl = `${process.env.SUPABASE_URL || 'https://sxjafhzikftdenqnkcri.supabase.co'}/storage/v1/object/public/exercise-gifs/${url}`;
        console.log("Found partial match GIF:", gifUrl);
        return gifUrl;
      }
    }
    
    // Default placeholder
    console.log("No GIF found, using placeholder");
    return `/placeholder.svg`;
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
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1">
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
          
          {/* Exercise GIF */}
          {exercise.gifUrl && (
            <div className="w-full md:w-32 h-32 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 border">
              <img 
                src={formatImageUrl(exercise.gifUrl)} 
                alt={`Demonstração: ${exercise.name}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to placeholder on error
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder.svg';
                  console.log("Image failed to load:", exercise.gifUrl);
                }}
              />
            </div>
          )}
        </div>
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
          {/* Day information */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Observações do Dia</h3>
            <p className="text-gray-700 mt-2">{dayPlan.notes || "Sem observações específicas para este dia."}</p>
          </div>
          
          {/* Exercises */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Exercícios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dayPlan.exercises ? (
                <>
                  {dayPlan.exercises.map((section: any, idx: number) => (
                    <div key={idx} className="mb-6 last:mb-0">
                      {section.title && (
                        <h3 className="font-medium text-sm uppercase text-gray-500 mb-3">{section.title}</h3>
                      )}
                      {renderDailyExercises(section.exercises || [])}
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum exercício para este dia</p>
              )}
            </CardContent>
          </Card>
          
          {/* Nutritional Plan */}
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
                        {dayPlan.nutrition.breakfast.foods && dayPlan.nutrition.breakfast.foods.map((food: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {food.portion} {food.unit} {food.name} {food.details && `(${food.details})`}
                          </li>
                        ))}
                      </ul>
                      {dayPlan.nutrition.breakfast.macros && (
                        <div className="mt-2 text-xs text-gray-600">
                          <p>
                            {dayPlan.nutrition.breakfast.calories} kcal | Carbs: {dayPlan.nutrition.breakfast.macros.carbs}g | 
                            Proteínas: {dayPlan.nutrition.breakfast.macros.protein}g | Gorduras: {dayPlan.nutrition.breakfast.macros.fats}g
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {dayPlan.nutrition.lunch && (
                    <div className="border-l-4 border-amber-400 pl-4 py-2">
                      <h4 className="font-medium text-amber-800">Almoço</h4>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
                        {dayPlan.nutrition.lunch.foods && dayPlan.nutrition.lunch.foods.map((food: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {food.portion} {food.unit} {food.name} {food.details && `(${food.details})`}
                          </li>
                        ))}
                      </ul>
                      {dayPlan.nutrition.lunch.macros && (
                        <div className="mt-2 text-xs text-gray-600">
                          <p>
                            {dayPlan.nutrition.lunch.calories} kcal | Carbs: {dayPlan.nutrition.lunch.macros.carbs}g | 
                            Proteínas: {dayPlan.nutrition.lunch.macros.protein}g | Gorduras: {dayPlan.nutrition.lunch.macros.fats}g
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {dayPlan.nutrition.dinner && (
                    <div className="border-l-4 border-purple-400 pl-4 py-2">
                      <h4 className="font-medium text-purple-800">Jantar</h4>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
                        {dayPlan.nutrition.dinner.foods && dayPlan.nutrition.dinner.foods.map((food: any, idx: number) => (
                          <li key={idx} className="text-sm">
                            {food.portion} {food.unit} {food.name} {food.details && `(${food.details})`}
                          </li>
                        ))}
                      </ul>
                      {dayPlan.nutrition.dinner.macros && (
                        <div className="mt-2 text-xs text-gray-600">
                          <p>
                            {dayPlan.nutrition.dinner.calories} kcal | Carbs: {dayPlan.nutrition.dinner.macros.carbs}g | 
                            Proteínas: {dayPlan.nutrition.dinner.macros.protein}g | Gorduras: {dayPlan.nutrition.dinner.macros.fats}g
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {dayPlan.nutrition.snacks && dayPlan.nutrition.snacks.map((snack: any, idx: number) => (
                    <div key={idx} className="border-l-4 border-blue-400 pl-4 py-2">
                      <h4 className="font-medium text-blue-800">Lanche {idx + 1}</h4>
                      <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
                        {snack.foods && snack.foods.map((food: any, foodIdx: number) => (
                          <li key={foodIdx} className="text-sm">
                            {food.portion} {food.unit} {food.name} {food.details && `(${food.details})`}
                          </li>
                        ))}
                      </ul>
                      {snack.macros && (
                        <div className="mt-2 text-xs text-gray-600">
                          <p>
                            {snack.calories} kcal | Carbs: {snack.macros.carbs}g | 
                            Proteínas: {snack.macros.protein}g | Gorduras: {snack.macros.fats}g
                          </p>
                        </div>
                      )}
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
          {/* Overview */}
          {rehabPlan?.overview && (
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Visão Geral</h3>
              <p className="text-gray-600">{rehabPlan.overview}</p>
            </div>
          )}

          {/* General Recommendations */}
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
          
          {/* Treatment Days */}
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
