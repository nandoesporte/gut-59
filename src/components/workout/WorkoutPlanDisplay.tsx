
import { Button } from "@/components/ui/button";
import { WorkoutPreferences } from "./types";
import { CurrentWorkoutPlan } from "./components/CurrentWorkoutPlan";
import { WorkoutLoadingState } from "./components/WorkoutLoadingState";
import { WorkoutProgressChart } from "./components/WorkoutProgressChart";
import { WorkoutError } from "./components/WorkoutError";
import { Badge } from "@/components/ui/badge";
import { FileDown, RotateCcw, Bot, ThumbsUp } from "lucide-react";
import { generateWorkoutPDF } from "./utils/pdf-generator";
import { useWorkoutPlanGeneration } from "./hooks/useWorkoutPlanGeneration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface WorkoutPlanDisplayProps {
  preferences: WorkoutPreferences;
  onReset: () => void;
}

export const WorkoutPlanDisplay = ({ preferences, onReset }: WorkoutPlanDisplayProps) => {
  const { loading, workoutPlan, progressData, error, generatePlan } = useWorkoutPlanGeneration(preferences);

  const handleExportPDF = async () => {
    if (!workoutPlan) return;
    await generateWorkoutPDF(workoutPlan);
  };

  const handleRetry = () => {
    generatePlan();
  };

  if (loading) {
    return <WorkoutLoadingState message="Gerando seu plano de treino personalizado com Trenner2025" />;
  }

  if (error || !workoutPlan) {
    return <WorkoutError 
      onReset={onReset} 
      errorMessage={error || "Não foi possível gerar seu plano. Por favor, tente novamente com diferentes preferências ou mais tarde."} 
    />;
  }

  // Get day names from workout sessions
  const getDayName = (dayNumber: number) => {
    const session = workoutPlan.workout_sessions.find(s => s.day_number === dayNumber);
    return session?.day_name || `Dia ${dayNumber}`;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Seu Plano de Treino</h2>
          <div className="flex items-center mt-2 gap-2">
            <Badge variant="outline" className="flex items-center gap-1 bg-primary/5">
              <Bot className="w-3 h-3" />
              Gerado por Trenner2025 (Llama 3 8B via Groq)
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRetry} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Gerar Novo
          </Button>
          <Button onClick={handleExportPDF} variant="outline">
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="details">Detalhes Completos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <CurrentWorkoutPlan plan={workoutPlan} />
        </TabsContent>
        
        <TabsContent value="details">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-medium border-b pb-2 mb-2">Informações Gerais</h3>
                <p><strong>Objetivo:</strong> {workoutPlan.goal}</p>
                <p><strong>Data de Início:</strong> {new Date(workoutPlan.start_date).toLocaleDateString('pt-BR')}</p>
                <p><strong>Data de Término:</strong> {new Date(workoutPlan.end_date).toLocaleDateString('pt-BR')}</p>
              </div>
              
              {workoutPlan.critique && (
                <div className="bg-white rounded-lg shadow p-4">
                  <h3 className="text-lg font-medium border-b pb-2 mb-2">Análise do Plano</h3>
                  
                  {workoutPlan.critique.strengths && workoutPlan.critique.strengths.length > 0 && (
                    <div className="mb-3">
                      <p className="font-medium text-green-600 flex items-center">
                        <ThumbsUp className="w-4 h-4 mr-1" /> Pontos Fortes:
                      </p>
                      <ul className="list-disc pl-5 mt-1">
                        {workoutPlan.critique.strengths.map((strength: string, idx: number) => (
                          <li key={idx}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {workoutPlan.critique.suggestions && workoutPlan.critique.suggestions.length > 0 && (
                    <div className="mb-3">
                      <p className="font-medium text-amber-600">Sugestões:</p>
                      <ul className="list-disc pl-5 mt-1">
                        {workoutPlan.critique.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {workoutPlan.critique.notes && (
                    <div>
                      <p className="font-medium text-gray-700">Notas Adicionais:</p>
                      <p className="text-gray-600 mt-1">{workoutPlan.critique.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              {workoutPlan.workout_sessions.map((session) => (
                <AccordionItem key={session.day_number} value={`day-${session.day_number}`}>
                  <AccordionTrigger className="bg-white rounded-t-lg shadow px-4 hover:no-underline hover:bg-gray-50">
                    <div className="flex items-center gap-3 text-left">
                      <span className="font-semibold">
                        {session.day_name || getDayName(session.day_number)}
                      </span>
                      {session.focus && (
                        <Badge variant="outline" className="bg-primary/5">
                          {session.focus}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="bg-white rounded-b-lg shadow px-6 pb-4 pt-2">
                    <div className="space-y-6">
                      {/* Warmup */}
                      <div className="border-l-4 border-blue-400 pl-4 py-1">
                        <h4 className="font-medium text-blue-800">Aquecimento</h4>
                        <p className="mt-1 text-gray-700">{session.warmup_description}</p>
                      </div>
                      
                      {/* Exercises */}
                      <div>
                        <h4 className="font-medium text-primary mb-3">Exercícios</h4>
                        <div className="space-y-4">
                          {session.session_exercises.map((exerciseSession) => (
                            <div 
                              key={exerciseSession.id || `${session.day_number}-${exerciseSession.exercise.id}`}
                              className="bg-gray-50 rounded-lg p-4"
                            >
                              <div className="flex flex-col md:flex-row gap-4">
                                {exerciseSession.exercise?.gif_url && (
                                  <div className="w-full md:w-48 h-48 rounded overflow-hidden bg-white flex-shrink-0">
                                    <img 
                                      src={exerciseSession.exercise.gif_url} 
                                      alt={exerciseSession.exercise.name}
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                )}
                                <div className="flex-grow">
                                  <div className="flex justify-between items-start mb-2">
                                    <h5 className="font-medium text-gray-900">
                                      {exerciseSession.exercise?.name}
                                    </h5>
                                    {exerciseSession.exercise?.muscle_group && (
                                      <Badge variant="outline">
                                        {exerciseSession.exercise.muscle_group.replace('_', ' ')}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                    <div className="bg-white p-2 rounded">
                                      <span className="text-xs text-gray-500">Séries</span>
                                      <p className="font-medium">{exerciseSession.sets}</p>
                                    </div>
                                    <div className="bg-white p-2 rounded">
                                      <span className="text-xs text-gray-500">Repetições</span>
                                      <p className="font-medium">{exerciseSession.reps}</p>
                                    </div>
                                    <div className="bg-white p-2 rounded">
                                      <span className="text-xs text-gray-500">Descanso</span>
                                      <p className="font-medium">{exerciseSession.rest_time_seconds}s</p>
                                    </div>
                                    {exerciseSession.intensity && (
                                      <div className="bg-white p-2 rounded">
                                        <span className="text-xs text-gray-500">Intensidade</span>
                                        <p className="font-medium">{exerciseSession.intensity}</p>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {exerciseSession.exercise?.description && (
                                    <p className="text-sm text-gray-700 mt-2">
                                      {exerciseSession.exercise.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Training Load */}
                      {session.training_load && (
                        <div className="bg-gray-100 rounded-lg p-4">
                          <h4 className="font-medium text-gray-800 mb-2">Carga de Treino</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {session.training_load.intensity && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Intensidade:</span>
                                <p className="text-sm">{session.training_load.intensity}</p>
                              </div>
                            )}
                            {session.training_load.volume && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Volume:</span>
                                <p className="text-sm">{session.training_load.volume}</p>
                              </div>
                            )}
                            {session.training_load.progression && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">Progressão:</span>
                                <p className="text-sm">{session.training_load.progression}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Cooldown */}
                      <div className="border-l-4 border-green-400 pl-4 py-1">
                        <h4 className="font-medium text-green-800">Volta à Calma</h4>
                        <p className="mt-1 text-gray-700">{session.cooldown_description}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </TabsContent>
      </Tabs>
      
      <WorkoutProgressChart progressData={progressData} />
      
      <div className="flex justify-center">
        <Button 
          onClick={onReset} 
          variant="outline"
          size="lg"
          className="hover:bg-primary/5"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Criar Novo Plano
        </Button>
      </div>
    </div>
  );
};
