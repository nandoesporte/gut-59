
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { WorkoutPreferences } from "../types";
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
  training_location: z.enum(["gym", "home", "outdoors", "no_equipment"]),
});

export type FormSchema = z.infer<typeof formSchema>;

export const useWorkoutForm = (onSubmit: (data: WorkoutPreferences) => void, paymentRequired = true) => {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormSchema | null>(null);
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);

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

  const handleFormSubmit = async (data: FormSchema) => {
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

      if (grantResponse?.requiresPayment && paymentRequired) {
        if (grantResponse?.remainingGenerations !== undefined) {
          toast.info(`Você tem mais ${grantResponse.remainingGenerations} gerações gratuitas disponíveis.`);
        } else {
          toast.info("Você atingiu o limite de gerações de plano gratuitas. Pagamento reativado.");
          return;
        }
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
        health_conditions: []
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
        await handleFormSubmit(formData);
      }
      setIsPaymentDialogOpen(false);
    } catch (error) {
      console.error("Erro no processo de pagamento:", error);
      toast.error("Erro ao processar pagamento. Por favor, tente novamente.");
    }
  };

  return {
    form,
    isGrantingAccess,
    isPaymentDialogOpen,
    setIsPaymentDialogOpen,
    isProcessingPayment,
    currentPrice,
    handleFormSubmit,
    handlePaymentProcess
  };
};
