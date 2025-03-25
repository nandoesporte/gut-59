import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { WorkoutPreferences } from "../types";
import { formSchema, FormSchema, mapTrainingLocationToEquipment } from "../utils/form-utils";
import { useWorkoutData } from "./useWorkoutData";
import { useWorkoutPreferences } from "./useWorkoutPreferences";
import { useWorkoutPayment } from "./useWorkoutPayment";

export const useWorkoutForm = (onSubmit: (data: WorkoutPreferences) => void) => {
  const [formData, setFormData] = useState<FormSchema | null>(null);
  
  // Create form with empty default values
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      age: 30,
      weight: 70,
      height: 170,
      gender: undefined,
      goal: undefined,
      activity_level: undefined,
      preferred_exercise_types: [],
      training_location: undefined,
    }
  });

  // Import functionality from smaller hooks
  const { isSaving, user, initializeUser, savePartialData, saveUserPreferences } = useWorkoutData();
  const { loadUserPreferences } = useWorkoutPreferences(form);
  
  // Payment is now disabled, but we keep the hook for compatibility
  const { isPaymentDialogOpen, setIsPaymentDialogOpen } = useWorkoutPayment();

  // Setup form watch to detect changes
  const formValues = form.watch();

  useEffect(() => {
    // Initialize user and load preferences
    initializeUser();
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

  const handleSubmit = async (data: FormSchema) => {
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
        available_equipment: mapTrainingLocationToEquipment(data.training_location),
        health_conditions: []
      };

      onSubmit(workoutPreferences);
    } catch (error: any) {
      console.error("Erro ao processar formulário:", error);
    }
  };

  // Simplified payment function that just submits the form
  const handlePaymentProcess = async () => {
    if (formData) {
      await handleSubmit(formData);
    }
    setIsPaymentDialogOpen(false);
  };

  return {
    form,
    isPaymentDialogOpen,
    setIsPaymentDialogOpen,
    isProcessingPayment: false,
    currentPrice: 0,
    handleSubmit,
    handlePaymentProcess,
    isPaymentEnabled: false // Always disabled
  };
};
