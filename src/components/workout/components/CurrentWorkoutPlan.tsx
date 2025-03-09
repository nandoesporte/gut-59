
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dumbbell, ChevronDown, ChevronUp, Info } from "lucide-react";
import { formatImageUrl } from "@/utils/imageUtils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CurrentWorkoutPlanProps {
  plan: any;
}

export const CurrentWorkoutPlan = ({ plan }: CurrentWorkoutPlanProps) => {
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();
  
  // Reset states when plan changes
  useEffect(() => {
    setImageLoadErrors({});
    setExpandedExercises({});
  }, [plan?.id]);
  
  const handleImageError = (exerciseId: string) => {
    console.log(`Error loading GIF: ${exerciseId}`);
    setImageLoadErrors(prev => ({
      ...prev,
      [exerciseId]: true
    }));
  };

  const toggleExerciseExpanded = (exerciseId: string) => {
    setExpandedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const renderExerciseImage = (exercise: any) => {
    const hasError = imageLoadErrors[exercise.id];
    const gifUrl = exercise.gif_url;
    
    if (hasError || !gifUrl) {
      return (
        <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg h-32 w-full">
          <Dumbbell className="h-12 w-12 text-gray-400 dark:text-gray-600" />
        </div>
      );
    }
    
    return (
      <img
        src={formatImageUrl(gifUrl)}
        alt={`${exercise.name} demonstration`}
        className="h-32 w-full object-cover rounded-lg"
        onError={() => handleImageError(exercise.id)}
      />
    );
  };

  return (
    <Card className="w-full border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Seu Plano de Treino</span>
          {!isMobile && (
            <Badge variant="outline" className="text-xs ml-2">
              {plan?.workout_sessions?.length || 0} dias
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue={`session-${activeSessionIndex + 1}`} className="space-y-4">
          <ScrollArea className="w-full">
            <TabsList className="mb-2 w-full justify-start">
              {plan?.workout_sessions?.map((session: any, index: number) => (
                <TabsTrigger
                  key={session.id}
                  value={`session-${index + 1}`}
                  onClick={() => setActiveSessionIndex(index)}
                  className="min-w-[80px] px-3"
                >
                  {session.day_name}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          
          {plan?.workout_sessions?.map((session: any, index: number) => (
            <TabsContent key={session.id} value={`session-${index + 1}`} className="space-y-4">
              <div className="rounded-lg bg-primary/5 p-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-primary">{session.day_name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {session.focus}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-card rounded p-2 text-center">
                    <span className="text-xs text-muted-foreground block">Exercícios</span>
                    <span className="font-medium">{session.session_exercises?.length || 0}</span>
                  </div>
                  <div className="bg-card rounded p-2 text-center">
                    <span className="text-xs text-muted-foreground block">Intensidade</span>
                    <span className="font-medium">{session.intensity || "Média"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-semibold">Aquecimento</h4>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">Realize sempre o aquecimento antes do treino principal</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                  {session.warmup_description}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Exercícios</h4>
                <div className="space-y-3">
                  {session?.session_exercises?.map((exerciseSession: any) => (
                    <Collapsible 
                      key={exerciseSession.id}
                      open={expandedExercises[exerciseSession.id]}
                      onOpenChange={() => toggleExerciseExpanded(exerciseSession.id)}
                      className="border rounded-lg overflow-hidden bg-card transition-all duration-200 hover:border-primary/30"
                    >
                      <CollapsibleTrigger asChild>
                        <div className="p-3 flex justify-between items-center cursor-pointer">
                          <div>
                            <h5 className="text-sm font-medium">{exerciseSession.exercise.name}</h5>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {exerciseSession.sets} séries × {exerciseSession.reps} repetições
                            </Badge>
                          </div>
                          {expandedExercises[exerciseSession.id] ? 
                            <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          }
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 space-y-2">
                          {renderExerciseImage(exerciseSession.exercise)}
                          <div className="mt-2 text-xs text-muted-foreground">
                            <p>{exerciseSession.exercise.description}</p>
                            {exerciseSession.rest_time && (
                              <p className="mt-1.5 font-medium text-primary-500">
                                Descanso: {exerciseSession.rest_time} segundos
                              </p>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Resfriamento</h4>
                <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                  {session.cooldown_description}
                </p>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
