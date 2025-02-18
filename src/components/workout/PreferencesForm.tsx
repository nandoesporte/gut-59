
import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BasicInfoFields } from "./components/BasicInfoFields";
import { GoalField } from "./components/GoalField";
import { ActivityLevelField } from "./components/ActivityLevelField";
import { ExerciseTypesField } from "./components/ExerciseTypesField";
import { TrainingLocationField } from "./components/TrainingLocationField";
import { WorkoutPreferences } from "./types";
import { Clipboard, ArrowRight } from "lucide-react";

// Schema atualizado para tornar todos os campos obrigatórios
const formSchema = z.object({
  age: z.number().min(16).max(100),
  weight: z.number().min(30).max(200),
  height: z.number().min(100).max(250),
  gender: z.enum(["male", "female"]),
  goal: z.enum(["lose_weight", "maintain", "gain_mass"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "intense"]),
  preferredExerciseTypes: z.array(z.enum(["strength", "cardio", "mobility"])).min(1),
  trainingLocation: z.enum(["home", "gym"]),
});

type FormSchema = z.infer<typeof formSchema>;

interface PreferencesFormProps {
  onSubmit: (data: WorkoutPreferences) => void;
}

export const PreferencesForm = ({ onSubmit }: PreferencesFormProps) => {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      age: 30,
      weight: 70,
      height: 170,
      gender: "male",
      goal: "maintain",
      activityLevel: "moderate",
      preferredExerciseTypes: ["strength"],
      trainingLocation: "gym",
    },
  });

  const handleSubmit = (data: FormSchema) => {
    // Garantindo que todos os campos estejam presentes
    const workoutPreferences: WorkoutPreferences = {
      age: data.age,
      weight: data.weight,
      height: data.height,
      gender: data.gender,
      goal: data.goal,
      activityLevel: data.activityLevel,
      preferredExerciseTypes: data.preferredExerciseTypes,
      trainingLocation: data.trainingLocation,
      availableEquipment: data.trainingLocation === "gym" 
        ? ["all"] 
        : ["bodyweight", "resistance-bands"],
    };
    onSubmit(workoutPreferences);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 p-6">
            <Clipboard className="w-6 h-6 text-primary-500" />
            <h3 className="text-xl font-semibold">Informações para seu Plano de Treino</h3>
          </CardHeader>
          <CardContent className="p-6 pt-0 space-y-6">
            <BasicInfoFields form={form} />
            <GoalField form={form} />
            <ActivityLevelField form={form} />
            <ExerciseTypesField form={form} />
            <TrainingLocationField form={form} />
            
            <Button type="submit" className="w-full">
              Gerar Plano de Treino
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};
