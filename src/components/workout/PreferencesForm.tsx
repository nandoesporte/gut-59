
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  age: z.number().min(16, "Idade mínima é 16 anos").max(100, "Idade máxima é 100 anos"),
  weight: z.number().min(30, "Peso mínimo é 30kg").max(200, "Peso máximo é 200kg"),
  height: z.number().min(100, "Altura mínima é 100cm").max(250, "Altura máxima é 250cm"),
  gender: z.enum(["male", "female"]),
  goal: z.enum(["lose_weight", "maintain", "gain_mass"]),
  activity_level: z.enum(["sedentary", "light", "moderate", "intense"]),
  preferred_exercise_types: z.array(z.enum(["strength", "cardio", "mobility"])).min(1, "Selecione pelo menos um tipo de exercício"),
  training_location: z.enum(["gym", "home", "outdoors", "no_equipment"]),
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
      activity_level: "moderate",
      preferred_exercise_types: [],
      training_location: "gym",
    },
  });

  const handleSubmit = async (data: FormSchema) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

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
      };

      // Save preferences to database
      const { error: upsertError } = await supabase
        .from('user_workout_preferences')
        .upsert({
          user_id: user.id,
          ...workoutPreferences
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error("Erro ao salvar preferências:", upsertError);
        throw upsertError;
      }

      console.log("Preferências salvas com sucesso!");
      console.log("Gerando plano com preferências:", workoutPreferences);
      toast.success("Preferências salvas com sucesso!");
      toast.info("Gerando seu plano de treino personalizado...");
      
      onSubmit(workoutPreferences);
    } catch (error: any) {
      console.error("Erro ao processar formulário:", error);
      toast.error(error.message || "Erro ao salvar preferências. Por favor, tente novamente.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
          <CardHeader className="border-b bg-primary/5 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clipboard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Informações para seu Plano</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Preencha os dados abaixo para gerar seu plano personalizado
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-8">
            <BasicInfoFields form={form} />
            <GoalField form={form} />
            <ActivityLevelField form={form} />
            <ExerciseTypesField form={form} />
            <TrainingLocationField form={form} />
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={!form.formState.isValid}
              size="lg"
            >
              Gerar Plano de Treino
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
};
