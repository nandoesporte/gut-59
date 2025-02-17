
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { WorkoutPreferences } from "./types";
import { BasicInfoFields } from "./components/BasicInfoFields";
import { ActivityLevelField } from "./components/ActivityLevelField";
import { GoalField } from "./components/GoalField";
import { ExerciseTypesField } from "./components/ExerciseTypesField";
import { TrainingLocationField } from "./components/TrainingLocationField";

const formSchema = z.object({
  weight: z.number().min(30).max(300),
  height: z.number().min(100).max(250),
  age: z.number().min(16).max(100),
  gender: z.enum(["male", "female"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "intense"]),
  goal: z.enum(["lose_weight", "maintain", "gain_mass"]),
  healthConditions: z.array(z.enum(["hypertension", "diabetes", "depression", "anxiety"])).optional(),
  preferredExerciseTypes: z.array(z.enum(["strength", "cardio", "mobility"])),
  trainingLocation: z.enum(["gym", "home", "outdoors", "no_equipment"]),
});

interface PreferencesFormProps {
  onSubmit: (data: WorkoutPreferences) => void;
}

export const PreferencesForm = ({ onSubmit }: PreferencesFormProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      healthConditions: [],
      preferredExerciseTypes: [],
      trainingLocation: "gym",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    const locationEquipmentMap = {
      gym: ["Esteira", "Bicicleta Ergométrica", "Aparelhos de Musculação", "Pesos Livres", "Anilhas e Barras"],
      home: ["Halteres", "Elásticos", "Tapete de Yoga", "Cadeira Resistente"],
      outdoors: ["Academia ao Ar Livre", "Barras Paralelas", "Pista de Corrida"],
      no_equipment: ["Sem Equipamentos"],
    };

    const modifiedValues = {
      ...values,
      availableEquipment: locationEquipmentMap[values.trainingLocation],
    };

    onSubmit(modifiedValues as WorkoutPreferences);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <BasicInfoFields form={form} />
        <ActivityLevelField form={form} />
        <GoalField form={form} />
        <ExerciseTypesField form={form} />
        <TrainingLocationField form={form} />
        <Button type="submit" className="w-full">Gerar Plano de Treino</Button>
      </form>
    </Form>
  );
};
