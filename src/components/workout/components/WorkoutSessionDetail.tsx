import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { WorkoutSession } from "../types/workout-plan";
import { WorkoutExerciseDetail } from "./WorkoutExerciseDetail";
import { TrainingLoadInfo } from "./TrainingLoadInfo";

interface WorkoutSessionDetailProps {
  session: WorkoutSession;
  getDayName: (dayNumber: number) => string;
  showAccordion?: boolean;
}

export const WorkoutSessionDetail = ({ 
  session, 
  getDayName, 
  showAccordion = true 
}: WorkoutSessionDetailProps) => {
  // Improved function for filtering unique exercises
  const getUniqueExercises = () => {
    if (!session.session_exercises) return [];
    
    const uniqueExercisesMap = new Map();
    
    // First pass to collect only unique exercises by ID
    return session.session_exercises.filter(ex => {
      // Skip if exercise or exercise.id is undefined
      if (!ex.exercise || !ex.exercise.id) {
        console.log('Exercício inválido encontrado', ex);
        return false;
      }
      
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
  console.log(`Sessão ${session.day_number}: ${uniqueExercises.length} exercícios únicos encontrados`);
  
  // Group exercises by muscle group
  const exercisesByMuscleGroup: Record<string, any[]> = {};
  uniqueExercises.forEach((ex) => {
    const muscleGroup = ex.exercise.muscle_group || 'other';
    if (!exercisesByMuscleGroup[muscleGroup]) {
      exercisesByMuscleGroup[muscleGroup] = [];
    }
    exercisesByMuscleGroup[muscleGroup].push(ex);
  });

  // Get all muscle groups present in the workout
  const muscleGroups = Object.keys(exercisesByMuscleGroup).sort();

  // If showAccordion is false, render only the content part
  if (!showAccordion) {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-medium text-lg mb-3">
            Exercícios <span className="text-gray-500 text-sm">({uniqueExercises.length})</span>
          </h4>
          
          {/* Display exercises grouped by muscle group */}
          <div className="space-y-6">
            {muscleGroups.map((muscleGroup) => (
              <div key={`mg-${session.day_number}-${muscleGroup}`} className="space-y-4">
                <h5 className="font-medium text-gray-700 uppercase border-b pb-1">
                  {muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1)}
                </h5>
                <div className="space-y-5">
                  {exercisesByMuscleGroup[muscleGroup].map((exerciseSession, index) => {
                    // Create a truly unique key using multiple identifiers
                    const uniqueKey = `ex-${session.day_number}-${muscleGroup}-${index}-${exerciseSession.id || 'unknown'}-${exerciseSession.exercise.id || 'no-id'}`;
                    
                    return (
                      <WorkoutExerciseDetail 
                        key={uniqueKey}
                        exerciseSession={exerciseSession}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Training Load */}
        {session.training_load && <TrainingLoadInfo session={session} />}
      </div>
    );
  }

  // Otherwise, render with Accordion (for WorkoutHistory)
  return (
    <AccordionItem key={session.day_number} value={`day-${session.day_number}`}>
      <AccordionTrigger className="bg-white rounded-t-lg shadow px-4 hover:no-underline hover:bg-gray-50">
        <div className="flex items-center gap-3 text-left">
          <span className="font-semibold text-base md:text-lg">
            {session.day_name || getDayName(session.day_number)}
          </span>
          {session.focus && (
            <Badge variant="outline" className="bg-primary/5 text-sm">
              {session.focus}
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="bg-white rounded-b-lg shadow px-6 pb-4 pt-2">
        <div className="space-y-6">
          {/* Warmup */}
          <div className="border-l-4 border-blue-400 pl-4 py-1">
            <h4 className="font-medium text-blue-800 text-base md:text-lg">Aquecimento</h4>
            <p className="mt-1 text-gray-700 text-sm md:text-base">{session.warmup_description}</p>
          </div>
          
          {/* Exercises by Muscle Group */}
          <div>
            <h4 className="font-medium text-primary mb-3 text-base md:text-lg">
              Exercícios ({uniqueExercises.length})
            </h4>
            
            {/* Display exercises grouped by muscle group */}
            <div className="space-y-6">
              {muscleGroups.map((muscleGroup) => (
                <div key={`mg-${session.day_number}-${muscleGroup}`} className="space-y-4">
                  <h5 className="font-medium text-sm md:text-base text-gray-700 uppercase border-b pb-1">
                    {muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1)}
                  </h5>
                  <div className="space-y-4 pl-2">
                    {exercisesByMuscleGroup[muscleGroup].map((exerciseSession, index) => {
                      // Create a truly unique key using multiple identifiers
                      const uniqueKey = `ex-${session.day_number}-${muscleGroup}-${index}-${exerciseSession.id || 'unknown'}-${exerciseSession.exercise.id || 'no-id'}`;
                      
                      return (
                        <WorkoutExerciseDetail 
                          key={uniqueKey}
                          exerciseSession={exerciseSession}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Training Load */}
          {session.training_load && <TrainingLoadInfo session={session} />}
          
          {/* Cooldown */}
          <div className="border-l-4 border-green-400 pl-4 py-1">
            <h4 className="font-medium text-green-800 text-base md:text-lg">Volta à Calma</h4>
            <p className="mt-1 text-gray-700 text-sm md:text-base">{session.cooldown_description}</p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
