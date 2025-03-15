
import { WorkoutPlan } from "../types/workout-plan";
import { WorkoutGeneralInfo } from "./WorkoutGeneralInfo";
import { WorkoutCritique } from "./WorkoutCritique";
import { WorkoutSessionDetail } from "./WorkoutSessionDetail";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Dumbbell, Clock } from "lucide-react";

interface WorkoutPlanDetailedProps {
  plan: WorkoutPlan;
}

export const WorkoutPlanDetailed = ({ plan }: WorkoutPlanDetailedProps) => {
  const isMobile = useIsMobile();
  const [activeDay, setActiveDay] = useState<string>("1");
  
  // Sort sessions by day number
  const sortedSessions = [...plan.workout_sessions].sort((a, b) => 
    a.day_number - b.day_number
  );
  
  // Get day names from workout sessions
  const getDayName = (dayNumber: number) => {
    const session = plan.workout_sessions.find(s => s.day_number === dayNumber);
    return session?.day_name || `Dia ${dayNumber}`;
  };
  
  // Calculate session stats
  const getSessionExerciseCount = (dayNumber: string) => {
    const session = sortedSessions.find(s => s.day_number === parseInt(dayNumber));
    return session?.session_exercises?.length || 0;
  };
  
  // Estimate workout duration (in minutes)
  const estimateSessionDuration = (dayNumber: string) => {
    const session = sortedSessions.find(s => s.day_number === parseInt(dayNumber));
    if (!session) return "0";
    
    // Base duration for warmup and cooldown
    let totalMinutes = 15;
    
    // Add time for exercises (approximately 3-5 min per exercise)
    const exerciseCount = session.session_exercises?.length || 0;
    totalMinutes += exerciseCount * 4;
    
    return `~${totalMinutes}`;
  };

  return (
    <div className="space-y-4">
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        <WorkoutGeneralInfo plan={plan} />
        {plan.critique && <WorkoutCritique plan={plan} />}
      </div>
      
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="p-4 pb-2 border-b">
          <h2 className="text-xl font-semibold">Seu Plano de Treino</h2>
          <div className="text-right text-sm text-gray-500">
            {sortedSessions.length} dias
          </div>
        </div>
        
        <Tabs defaultValue={activeDay} onValueChange={setActiveDay} className="w-full">
          <TabsList className="bg-gray-100 w-full h-auto flex overflow-x-auto p-1 border-b">
            {sortedSessions.map((session) => (
              <TabsTrigger 
                key={session.day_number} 
                value={session.day_number.toString()}
                className="py-2 px-4 data-[state=active]:bg-white rounded-md"
              >
                {`Dia ${session.day_number}`}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {sortedSessions.map((session) => (
            <TabsContent 
              key={session.day_number} 
              value={session.day_number.toString()}
              className="p-0"
            >
              <div className="p-4 border-b">
                <h3 className="text-xl font-medium text-primary mb-4">
                  {`Dia ${session.day_number}`}
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-gray-500 mb-1">Exercícios</div>
                    <div className="flex items-center">
                      <Dumbbell className="w-5 h-5 text-primary mr-2" />
                      <span className="text-xl font-medium">
                        {getSessionExerciseCount(session.day_number.toString())}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center">
                    <div className="text-gray-500 mb-1">Tempo Total</div>
                    <div className="flex items-center">
                      <Clock className="w-5 h-5 text-primary mr-2" />
                      <span className="text-xl font-medium">
                        {estimateSessionDuration(session.day_number.toString())} min
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {/* Warmup */}
                  <div>
                    <h4 className="font-medium text-lg mb-2">Aquecimento</h4>
                    <p className="text-gray-700">{session.warmup_description}</p>
                  </div>
                  
                  {/* Exercises */}
                  <WorkoutSessionDetail 
                    session={session}
                    getDayName={getDayName}
                    showAccordion={false}
                  />
                  
                  {/* Cooldown */}
                  <div>
                    <h4 className="font-medium text-lg mb-2">Volta à Calma</h4>
                    <p className="text-gray-700">{session.cooldown_description}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};
