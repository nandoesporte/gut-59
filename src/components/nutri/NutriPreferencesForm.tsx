
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { NutriPreferences } from "./types";
import { BasicInfoFields } from "@/components/workout/components/BasicInfoFields";
import { ActivityLevelField } from "@/components/workout/components/ActivityLevelField";
import { GoalField } from "@/components/workout/components/GoalField";
import { FoodSelector } from "@/components/menu/FoodSelector";
import { toast } from "sonner";
import { useMenuController } from "@/components/menu/MenuController";

const formSchema = z.object({
  weight: z.number().min(30).max(300),
  height: z.number().min(100).max(250),
  age: z.number().min(16).max(100),
  gender: z.enum(["male", "female"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "intense"]),
  goal: z.enum(["lose", "maintain", "gain"]),
  healthConditions: z.array(z.enum(["hypertension", "diabetes", "depression_anxiety"])).optional(),
  selectedFoods: z.array(z.string())
});

interface NutriPreferencesFormProps {
  onSubmit: (data: NutriPreferences) => void;
}

export const NutriPreferencesForm = ({ onSubmit }: NutriPreferencesFormProps) => {
  const {
    currentStep,
    setCurrentStep,
    selectedFoods,
    protocolFoods,
    handleFoodSelection,
    formData,
    setFormData,
    handleCalculateCalories,
    calorieNeeds,
  } = useMenuController();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      healthConditions: [],
      selectedFoods: [],
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (selectedFoods.length === 0) {
      toast.error("Selecione pelo menos um alimento");
      return;
    }

    const preferences: NutriPreferences = {
      ...values,
      selectedFoods,
      hasAllergies: false,
      allergies: [],
      healthCondition: values.healthConditions?.[0] || null // Pega a primeira condição de saúde ou null
    };

    onSubmit(preferences);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <BasicInfoFields form={form} />
        <ActivityLevelField form={form} />
        <GoalField form={form} />
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-4">Selecione suas Preferências Alimentares</h3>
          <FoodSelector
            protocolFoods={protocolFoods}
            selectedFoods={selectedFoods}
            onFoodSelection={handleFoodSelection}
            totalCalories={calorieNeeds || 0}
            onBack={() => setCurrentStep(currentStep - 1)}
            onConfirm={() => form.handleSubmit(handleSubmit)()}
          />
        </div>
      </form>
    </Form>
  );
};
