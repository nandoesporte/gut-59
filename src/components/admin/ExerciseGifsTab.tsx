import { useMutation, useQuery } from "@tanstack/react-query";
import { ExerciseForm } from "./exercises/ExerciseForm";
import { BatchUploadForm } from "./exercises/BatchUploadForm";
import { FisioBatchUploadForm } from "./exercises/FisioBatchUploadForm";
import { MultipleGifsUploadForm } from "./exercises/MultipleGifsUploadForm";
import { ExerciseList } from "./exercises/ExerciseList";
import { Exercise, PhysioExercise } from "./exercises/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const ExerciseGifsTab = () => {
  const { data: exercises, refetch } = useQuery({
    queryKey: ['exercises'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ exerciseData, file }: { exerciseData: Omit<Exercise, 'id' | 'gif_url'>, file?: File }) => {
      if (!file) {
        throw new Error('Arquivo GIF é obrigatório');
      }

      // Upload the GIF file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('exercise-gifs')
        .upload(`${crypto.randomUUID()}.gif`, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('exercise-gifs')
        .getPublicUrl(uploadData.path);

      // Ensure the exercise type is valid according to the database constraints
      // Map "flexibility" to "mobility" if it's present in the data
      const validExerciseType = exerciseData.exercise_type === "strength" || 
                                exerciseData.exercise_type === "cardio" || 
                                exerciseData.exercise_type === "mobility" 
                                ? exerciseData.exercise_type 
                                : "mobility";
      
      // Create the exercise record with all the additional fields
      // Explicitly cast difficulty to "beginner" | "intermediate" | "advanced" for the database
      const safeData = {
        ...exerciseData,
        gif_url: publicUrl,
        exercise_type: validExerciseType,
        difficulty: exerciseData.difficulty as "beginner" | "intermediate" | "advanced",
        goals: exerciseData.goals || [],
        equipment_needed: exerciseData.equipment_needed || [],
        primary_muscles_worked: exerciseData.primary_muscles_worked || [],
        secondary_muscles_worked: exerciseData.secondary_muscles_worked || [],
        target_heart_rate_zone: exerciseData.target_heart_rate_zone || [],
        common_mistakes: exerciseData.common_mistakes || [],
        safety_considerations: exerciseData.safety_considerations || [],
        progression_variations: exerciseData.progression_variations || [],
        regression_variations: exerciseData.regression_variations || [],
        suitable_for_conditions: exerciseData.suitable_for_conditions || [],
        contraindicated_conditions: exerciseData.contraindicated_conditions || [],
        training_phases: exerciseData.training_phases || [],
        is_compound_movement: exerciseData.is_compound_movement || false,
        equipment_complexity: exerciseData.equipment_complexity || 'basic',
        mobility_requirements: exerciseData.mobility_requirements || 'moderate',
        stability_requirement: exerciseData.stability_requirement || 'moderate',
        balance_requirement: exerciseData.balance_requirement || 'moderate',
        coordination_requirement: exerciseData.coordination_requirement || 'moderate',
        flexibility_requirement: exerciseData.flexibility_requirement || 'moderate',
        power_requirement: exerciseData.power_requirement || 'moderate',
        preparation_time_minutes: exerciseData.preparation_time_minutes || 15,
        typical_duration_seconds: exerciseData.typical_duration_seconds || 60,
        tempo_recommendation: exerciseData.tempo_recommendation || '2-0-2-0',
        breathing_pattern: exerciseData.breathing_pattern || null,
        calories_burned_per_hour: exerciseData.calories_burned_per_hour || null,
        recommended_warm_up: exerciseData.recommended_warm_up || null,
        movement_pattern: exerciseData.movement_pattern || 'unspecified'
      };

      const { error: insertError } = await supabase
        .from('exercises')
        .insert(safeData);

      if (insertError) throw insertError;

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Exercício salvo com sucesso!');
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao salvar exercício: ' + error.message);
    }
  });

  const uploadPhysioExerciseMutation = useMutation({
    mutationFn: async ({ exerciseData, file }: { exerciseData: PhysioExercise, file: File }) => {
      if (!file) {
        throw new Error('Arquivo GIF é obrigatório');
      }

      // Upload the GIF file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('exercise-gifs')
        .upload(`physio/${crypto.randomUUID()}.gif`, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('exercise-gifs')
        .getPublicUrl(uploadData.path);

      // Ensure the exercise type is valid according to the database constraints
      const validExerciseType = exerciseData.exercise_type === "strength" || 
                                exerciseData.exercise_type === "cardio" || 
                                exerciseData.exercise_type === "mobility" 
                                ? exerciseData.exercise_type 
                                : "mobility";

      // Cast the difficulty type for database compatibility
      const safeData = {
        ...exerciseData,
        gif_url: publicUrl,
        exercise_type: validExerciseType,
        difficulty: exerciseData.difficulty as "beginner" | "intermediate" | "advanced"
      };

      // Create the exercise record in the physio_exercises table
      const { error: insertError } = await supabase
        .from('physio_exercises')
        .insert(safeData);

      if (insertError) throw insertError;

      return { success: true };
    },
    onSuccess: () => {
      toast.success('Exercício de fisioterapia salvo com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar exercício de fisioterapia: ' + error.message);
    }
  });

  const handleSubmit = async (exerciseData: Omit<Exercise, 'id' | 'gif_url'>, file?: File) => {
    await uploadMutation.mutateAsync({ exerciseData, file });
  };

  const handlePhysioSubmit = async (exerciseData: PhysioExercise, file: File) => {
    await uploadPhysioExerciseMutation.mutateAsync({ exerciseData, file });
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="individual">Upload Individual</TabsTrigger>
          <TabsTrigger value="multiple">Upload Múltiplo</TabsTrigger>
          <TabsTrigger value="batch">Upload em Lote</TabsTrigger>
          <TabsTrigger value="fisio">Exercícios Fisioterapia</TabsTrigger>
        </TabsList>
        
        <TabsContent value="individual">
          <ExerciseForm 
            onSuccess={() => refetch()} 
            onCancel={() => {}} 
          />
        </TabsContent>

        <TabsContent value="multiple">
          <MultipleGifsUploadForm
            onSuccess={() => refetch()}
            onCancel={() => {}}
          />
        </TabsContent>

        <TabsContent value="batch">
          <BatchUploadForm 
            onSuccess={() => refetch()} 
            onCancel={() => {}} 
          />
        </TabsContent>

        <TabsContent value="fisio">
          <FisioBatchUploadForm
            onUpload={handlePhysioSubmit}
            uploading={uploadPhysioExerciseMutation.isPending}
          />
        </TabsContent>
      </Tabs>

      <h2 className="text-2xl font-bold mt-12">Exercícios Cadastrados</h2>
      <ExerciseList />
    </div>
  );
};
