
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPreferences, ActivityLevel, ExerciseType } from "../types";
import { toast } from "sonner";
import { usePaymentHandling } from "@/components/menu/hooks/usePaymentHandling";

const formSchema = z.object({
  age: z.number().min(16, "Idade mínima é 16 anos").max(100, "Idade máxima é 100 anos"),
  weight: z.number().min(30, "Peso mínimo é 30kg").max(200, "Peso máximo é 200kg"),
  height: z.number().min(100, "Altura mínima é 100cm").max(250, "Altura máxima é 250cm"),
  gender: z.enum(["male", "female"]),
  goal: z.enum(["lose_weight", "maintain", "gain_mass"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "intense"]),
  preferred_exercise_types: z.array(z.enum(["strength", "cardio", "mobility"])).min(1, "Selecione pelo menos um tipo de exercício"),
  training_location: z.enum(["gym", "home", "outdoors", "no_equipment"])
});

export type FormSchema = z.infer<typeof formSchema>;

export const useWorkoutForm = (onSubmit: (data: WorkoutPreferences) => void) => {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormSchema | null>(null);
  const [isPaymentEnabled, setIsPaymentEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  
  const {
    isProcessingPayment,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue
  } = usePaymentHandling('workout');

  // Create form with default values
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      age: 30,
      weight: 70,
      height: 170,
      gender: "male",
      goal: "maintain",
      activity_level: "moderate",
      preferred_exercise_types: ["strength"],
      training_location: "gym",
    }
  });

  // Setup form watch to detect changes
  const formValues = form.watch();

  useEffect(() => {
    const checkPaymentSettings = async () => {
      try {
        const { data: settings, error } = await supabase
          .from('payment_settings')
          .select('is_active')
          .eq('plan_type', 'workout')
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar configurações de pagamento:', error);
          return;
        }

        setIsPaymentEnabled(settings?.is_active ?? false);
      } catch (error) {
        console.error('Erro ao verificar configurações de pagamento:', error);
      }
    };

    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    checkPaymentSettings();
    getCurrentUser();
    loadUserPreferences();
  }, []);

  // Effect to save form values when they change
  useEffect(() => {
    // Don't try to save if user is not logged in, form is not initialized, 
    // or we're in the middle of setting initial values
    if (!user || isSaving) return;

    // We need to check validity before saving
    const isValid = form.formState.isValid;
    
    // Use a debounce to avoid too many saves
    const timeoutId = setTimeout(() => {
      // Only save if the form is valid and we have a user ID
      if (isValid) {
        savePartialData(formValues);
      }
    }, 1000); // 1 second debounce

    return () => clearTimeout(timeoutId);
  }, [formValues, user]);

  const savePartialData = async (data: FormSchema) => {
    // Skip if not authenticated
    if (!user) return;
    
    try {
      setIsSaving(true);
      
      // Convert training location to available equipment format
      const availableEquipment = data.training_location === "gym" 
        ? ["all"] 
        : data.training_location === "home"
        ? ["bodyweight", "resistance-bands", "dumbbells"]
        : data.training_location === "outdoors"
        ? ["bodyweight", "resistance-bands"]
        : ["bodyweight"];

      console.log('Salvando parcialmente para usuário:', user.id);

      const preferenceData = {
        user_id: user.id,
        age: data.age,
        weight: data.weight,
        height: data.height,
        gender: data.gender,
        goal: data.goal,
        activity_level: data.activity_level,
        preferred_exercise_types: data.preferred_exercise_types,
        available_equipment: availableEquipment,
        health_conditions: [],
      };

      const { error } = await supabase
        .from('user_workout_preferences')
        .upsert(preferenceData);

      if (error) {
        console.error('Erro ao auto-salvar preferências:', error);
        // Don't show toast for auto-save errors to avoid annoying users
      } else {
        console.log('Preferências auto-salvas com sucesso');
      }
    } catch (error) {
      console.error('Erro ao auto-salvar preferências:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const loadUserPreferences = async () => {
    try {
      setIsSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      console.log('Buscando preferências para usuário:', user.id);

      const { data, error } = await supabase
        .from('user_workout_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar preferências:', error);
        return;
      }

      if (data) {
        console.log('Preferências encontradas:', data);
        
        // Validate and cast the data to ensure it matches the expected enums
        const gender = isValidGender(data.gender) ? data.gender : "male";
        const goal = isValidGoal(data.goal) ? data.goal : "maintain";
        const activity_level = isValidActivityLevel(data.activity_level) ? data.activity_level : "moderate";
        
        // Validate preferred exercise types
        const preferred_exercise_types = Array.isArray(data.preferred_exercise_types) 
          ? data.preferred_exercise_types.filter(isValidExerciseType)
          : ["strength"];
        
        // If no valid types remain after filtering, use the default
        const finalExerciseTypes = preferred_exercise_types.length > 0 
          ? preferred_exercise_types 
          : ["strength"];

        form.reset({
          age: data.age,
          weight: data.weight,
          height: data.height,
          gender: gender,
          goal: goal,
          activity_level: activity_level,
          preferred_exercise_types: finalExerciseTypes as ExerciseType[],
          training_location: data.available_equipment?.includes("all") 
            ? "gym" 
            : data.available_equipment?.includes("bodyweight") && data.available_equipment?.includes("dumbbells")
            ? "home"
            : data.available_equipment?.includes("bodyweight") && !data.available_equipment?.includes("dumbbells")
            ? "outdoors"
            : "no_equipment"
        });
      } else {
        console.log('Nenhuma preferência encontrada para este usuário');
      }
    } catch (error) {
      console.error('Erro ao carregar preferências:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Type guard functions
  const isValidGender = (value: any): value is "male" | "female" => {
    return value === "male" || value === "female";
  };

  const isValidGoal = (value: any): value is "lose_weight" | "maintain" | "gain_mass" => {
    return value === "lose_weight" || value === "maintain" || value === "gain_mass";
  };

  const isValidActivityLevel = (value: any): value is ActivityLevel => {
    return ["sedentary", "light", "moderate", "intense"].includes(value);
  };

  const isValidExerciseType = (value: any): value is ExerciseType => {
    return ["strength", "cardio", "mobility"].includes(value);
  };

  const saveUserPreferences = async (data: FormSchema) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      console.log('Salvando preferências para usuário:', user.id);
      console.log('Dados a serem salvos:', data);

      const availableEquipment = data.training_location === "gym" 
        ? ["all"] 
        : data.training_location === "home"
        ? ["bodyweight", "resistance-bands", "dumbbells"]
        : data.training_location === "outdoors"
        ? ["bodyweight", "resistance-bands"]
        : ["bodyweight"];

      console.log('Equipamentos mapeados:', availableEquipment);

      const preferenceData = {
        user_id: user.id,
        age: data.age,
        weight: data.weight,
        height: data.height,
        gender: data.gender,
        goal: data.goal,
        activity_level: data.activity_level,
        preferred_exercise_types: data.preferred_exercise_types,
        available_equipment: availableEquipment,
        health_conditions: [],
      };

      console.log('Objeto completo para upsert:', preferenceData);

      const { error, data: savedData } = await supabase
        .from('user_workout_preferences')
        .upsert(preferenceData)
        .select();

      if (error) {
        console.error('Erro ao salvar preferências:', error);
        toast.error("Erro ao salvar suas preferências");
      } else {
        console.log('Preferências salvas com sucesso:', savedData);
        toast.success("Preferências salvas com sucesso");
      }
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast.error("Erro ao salvar suas preferências");
    }
  };

  const handleSubmit = async (data: FormSchema) => {
    if (isPaymentEnabled && !hasPaid) {
      setFormData(data);
      setIsPaymentDialogOpen(true);
      return;
    }

    try {
      // Salvar as preferências do usuário no banco de dados
      await saveUserPreferences(data);

      const workoutPreferences: WorkoutPreferences = {
        age: data.age,
        weight: data.weight,
        height: data.height,
        gender: data.gender,
        goal: data.goal,
        activity_level: data.activity_level,
        preferred_exercise_types: data.preferred_exercise_types,
        available_equipment: data.training_location === "gym" 
          ? ["all"] 
          : data.training_location === "home"
          ? ["bodyweight", "resistance-bands", "dumbbells"]
          : data.training_location === "outdoors"
          ? ["bodyweight", "resistance-bands"]
          : ["bodyweight"],
        health_conditions: []
      };

      onSubmit(workoutPreferences);
    } catch (error: any) {
      console.error("Erro ao processar formulário:", error);
      toast.error(error.message || "Erro ao processar suas preferências");
    }
  };

  const handlePaymentProcess = async () => {
    try {
      await handlePaymentAndContinue();
      if (formData) {
        await handleSubmit(formData);
      }
      setIsPaymentDialogOpen(false);
    } catch (error) {
      console.error("Erro no processo de pagamento:", error);
      toast.error("Erro ao processar pagamento. Por favor, tente novamente.");
    }
  };

  return {
    form,
    isPaymentDialogOpen,
    setIsPaymentDialogOpen,
    isProcessingPayment,
    currentPrice,
    handleSubmit,
    handlePaymentProcess,
    isPaymentEnabled
  };
};
