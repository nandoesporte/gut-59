import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dumbbell } from "lucide-react";
import { formatImageUrl } from "@/utils/imageUtils";

interface CurrentWorkoutPlanProps {
  plan: any;
}

// Add or update the imageLoadError state and handler
export const CurrentWorkoutPlan = ({ plan }: CurrentWorkoutPlanProps) => {
  const [activeSessionIndex, setActiveSessionIndex] = useState(0);
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({});
  
  // Reset image errors when plan changes
  useEffect(() => {
    setImageLoadErrors({});
  }, [plan?.id]);
  
  const handleImageError = (exerciseId: string) => {
    console.log(`Error loading GIF: ${exerciseId}`);
    setImageLoadErrors(prev => ({
      ...prev,
      [exerciseId]: true
    }));
  };

  const renderExerciseImage = (exercise: any) => {
    const hasError = imageLoadErrors[exercise.id];
    const gifUrl = exercise.gif_url;
    
    if (hasError || !gifUrl) {
      return (
        <div className="flex items-center justify-center bg-gray-100 rounded-lg h-32 w-full">
          <Dumbbell className="h-12 w-12 text-gray-400" />
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Plano de Treino</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue={`session-${activeSessionIndex + 1}`} className="space-y-4">
          <TabsList>
            {plan?.workout_sessions?.map((session: any, index: number) => (
              <TabsTrigger
                key={session.id}
                value={`session-${index + 1}`}
                onClick={() => setActiveSessionIndex(index)}
              >
                {session.day_name}
              </TabsTrigger>
            ))}
          </TabsList>
          {plan?.workout_sessions?.map((session: any, index: number) => (
            <TabsContent key={session.id} value={`session-${index + 1}`}>
              <div className="grid gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{session.day_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Foco: {session.focus}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-md font-semibold">Aquecimento</h4>
                  <p className="text-sm text-muted-foreground">
                    {session.warmup_description}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-md font-semibold">Treino</h4>
                  <ScrollArea className="h-[400px] w-full rounded-md border">
                    <div className="p-4 space-y-4">
                      {session?.session_exercises?.map((exerciseSession: any) => (
                        <div key={exerciseSession.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-medium">{exerciseSession.exercise.name}</h5>
                            <Badge variant="secondary">
                              {exerciseSession.sets} séries x {exerciseSession.reps} repetições
                            </Badge>
                          </div>
                          {renderExerciseImage(exerciseSession.exercise)}
                          <p className="text-xs text-muted-foreground">
                            {exerciseSession.exercise.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <h4 className="text-md font-semibold">Resfriamento</h4>
                  <p className="text-sm text-muted-foreground">
                    {session.cooldown_description}
                  </p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};
