
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <WorkoutGeneralInfo plan={plan} />
        {plan.critique && <WorkoutCritique plan={plan} />}
      </div>
      
      <Accordion 
        type="single" 
        collapsible 
        className="w-full"
      >
        {plan.workout_sessions.map((session) => (
          <AccordionItem key={session.day_number} value={`day-${session.day_number}`}>
            <AccordionTrigger className={`text-sm sm:text-base px-2 py-1.5 ${isMobile ? 'hover:no-underline' : ''}`}>
              <span className="flex items-center gap-1.5">
                <span className="bg-primary/10 text-primary rounded-md p-1 text-xs">
                  {session.day_number}
                </span>
                {getDayName(session.day_number)}
                {session.focus && (
                  <span className="text-2xs sm:text-xs text-muted-foreground ml-1">
                    - {session.focus}
                  </span>
                )}
              </span>
            </AccordionTrigger>
            <AccordionContent className={isMobile ? "p-2 pt-3" : "p-3 pt-4"}>
              <WorkoutSessionDetail 
                session={session} 
                getDayName={getDayName}
              />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
