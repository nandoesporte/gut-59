import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { WorkoutSession } from "../types/workout-plan";
import { WorkoutExerciseDetail } from "./WorkoutExerciseDetail";
import { TrainingLoadInfo } from "./TrainingLoadInfo";

interface WorkoutSessionDetailProps {
  session: WorkoutSession;
  getDayName: (dayNumber: number) => string;
}

export const WorkoutSessionDetail = ({ session, getDayName }: WorkoutSessionDetailProps) => {
  // Improved function for filtering unique exercises
  const getUniqueExercises = () => {
    if (!session.session_exercises) return [];
    
    const uniqueExercisesMap = new Map();
    
    // First pass to collect only unique exercises by ID
    return session.session_exercises.filter(ex => {
      // Skip if exercise or exercise.id is undefined
      if (!ex.exercise || !ex.exercise.id) return false;
      
      const exerciseId = ex.exercise.id;
      
      // If we haven't seen this ID before, keep it and mark as seen
      if (!uniqueExercisesMap.has(exerciseId)) {
        uniqueExercisesMap.set(exerciseId, true);
        return true;
      }
      
      // Otherwise, it's a duplicate, so filter it out
      return false;
    });
  };

  const uniqueExercises = getUniqueExercises();

  return (
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
            <h4 className="font-medium text-primary mb-3">Exercícios ({uniqueExercises.length})</h4>
            <div className="space-y-4">
              {uniqueExercises.map((exerciseSession, index) => (
                <WorkoutExerciseDetail 
                  key={exerciseSession.id || `${session.day_number}-${exerciseSession.exercise.id}-${index}`}
                  exerciseSession={exerciseSession}
                />
              ))}
            </div>
          </div>
          
          {/* Training Load */}
          {session.training_load && <TrainingLoadInfo session={session} />}
          
          {/* Cooldown */}
          <div className="border-l-4 border-green-400 pl-4 py-1">
            <h4 className="font-medium text-green-800">Volta à Calma</h4>
            <p className="mt-1 text-gray-700">{session.cooldown_description}</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
