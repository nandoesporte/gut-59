import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BasicInfoFields } from "./components/BasicInfoFields";
import { GoalField } from "./components/GoalField";
import { ActivityLevelField } from "./components/ActivityLevelField";
import { ExerciseTypesField } from "./components/ExerciseTypesField";
import { TrainingLocationField } from "./components/TrainingLocationField";
import { WorkoutPreferences } from "./types";
import { Clipboard, ArrowRight, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentHandling } from "@/components/menu/hooks/usePaymentHandling";

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
  paymentRequired?: boolean;
}

export const PreferencesForm = ({ onSubmit, paymentRequired = true }: PreferencesFormProps) => {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = React.useState(false);
  const [formData, setFormData] = React.useState<FormSchema | null>(null);
  const [isGrantingAccess, setIsGrantingAccess] = React.useState(false);

  const {
    isProcessingPayment,
    hasPaid,
    currentPrice,
    handlePaymentAndContinue,
    showConfirmation,
    setShowConfirmation
  } = usePaymentHandling('workout');

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
    },
    mode: "onChange"
  });

  const handleSubmit = async (data: FormSchema) => {
    try {
      setIsGrantingAccess(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: paymentSettings } = await supabase
        .from('payment_settings')
        .select('is_active')
        .eq('plan_type', 'workout')
        .single();

      if (paymentSettings?.is_active && paymentRequired && !hasPaid) {
        setFormData(data);
        setIsPaymentDialogOpen(true);
        return;
      }

      // Grant access to workout plan
      const { data: grantResponse, error: grantError } = await supabase.functions.invoke('grant-plan-access', {
        body: {
          userId: user.id,
          planType: 'workout' as const
        }
      });

      if (grantError) {
        console.error('Erro ao liberar acesso ao plano:', grantError);
        toast.error("Erro ao liberar acesso ao plano. Por favor, contate o suporte.");
        return;
      }

      // Check if payment needs to be reativated
      if (grantResponse?.requiresPayment && paymentRequired) {
        toast.info("Você atingiu o limite de gerações de plano gratuitas. Pagamento reativado.");
      }

      // Ensure all required properties are present
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
        health_conditions: [] // Providing default empty array for health conditions
      };

      onSubmit(workoutPreferences);
      toast.success("Plano de treino sendo gerado...");

    } catch (error) {
      console.error('Erro ao processar formulário:', error);
      toast.error("Erro ao processar sua solicitação. Por favor, tente novamente.");
    } finally {
      setIsGrantingAccess(false);
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

  const isValid = form.formState.isValid;

  return (
    <>
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
                disabled={!isValid || isProcessingPayment || isGrantingAccess}
                size="lg"
              >
                {isGrantingAccess ? "Processando..." : "Gerar Plano de Treino"}
                {!isProcessingPayment && !isGrantingAccess && <ArrowRight className="w-5 h-5 ml-2" />}
                {(isProcessingPayment || isGrantingAccess) && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2" />
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento do Plano de Treino</DialogTitle>
            <DialogDescription>
              Para gerar seu plano de treino personalizado, é necessário realizar o pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Valor: R$ {currentPrice.toFixed(2)}
            </p>
            <Button 
              onClick={handlePaymentProcess} 
              className="w-full"
              disabled={isProcessingPayment}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isProcessingPayment ? "Processando..." : "Realizar Pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
