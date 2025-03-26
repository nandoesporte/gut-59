

import { Accordion } from "@/components/ui/accordion";
import { WorkoutPlan } from "../types/workout-plan";
import { WorkoutGeneralInfo } from "./WorkoutGeneralInfo";
import { WorkoutCritique } from "./WorkoutCritique";
import { WorkoutSessionDetail } from "./WorkoutSessionDetail";
import { useIsMobile } from "@/hooks/use-mobile";

interface WorkoutPlanDetailedProps {
  plan: WorkoutPlan;
}

export const WorkoutPlanDetailed = ({ plan }: WorkoutPlanDetailedProps) => {
  const isMobile = useIsMobile();
  
  // Get day names from workout sessions or generate a default
  const getDayName = (dayNumber: number) => {
    const dayNames = [
      "Treino Superior",
      "Treino Inferior",
      "Treino de Push",
      "Treino de Pull",
      "Treino de Legs",
      "Treino Full Body",
      "Treino de Core"
    ];
    
    const session = plan.workout_sessions.find(s => s.day_number === dayNumber);
    
    // If session has a day_name, use it, otherwise generate a default name
    if (session?.day_name) {
      return session.day_name;
    }
    
    // Determine the day name based on pattern for different workout splits
    if (plan.workout_sessions.length <= 3) {
      return `Full Body - Dia ${dayNumber}`;
    } else if (plan.workout_sessions.length === 4) {
      const patterns = ["Peito e Tríceps", "Costas e Bíceps", "Pernas", "Ombros e Core"];
      return patterns[(dayNumber - 1) % patterns.length];
    } else if (plan.workout_sessions.length === 5) {
      const patterns = ["Peito", "Costas", "Pernas", "Ombros", "Braços e Core"];
      return patterns[(dayNumber - 1) % patterns.length];
    } else {
      // 6-day PPL split
      const patterns = ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"];
      return patterns[(dayNumber - 1) % patterns.length];
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        <WorkoutGeneralInfo plan={plan} />
        {plan.critique && <WorkoutCritique plan={plan} />}
      </div>
      
      <Accordion type="single" collapsible className="w-full">
        {plan.workout_sessions.map((session) => (
          <WorkoutSessionDetail 
            key={session.day_number}
            session={session} 
            getDayName={getDayName}
          />
        ))}
      </Accordion>
    </div>
  );
};
