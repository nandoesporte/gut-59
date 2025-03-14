
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
  
  // Get day names from workout sessions
  const getDayName = (dayNumber: number) => {
    const session = plan.workout_sessions.find(s => s.day_number === dayNumber);
    return session?.day_name || `Dia ${dayNumber}`;
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
