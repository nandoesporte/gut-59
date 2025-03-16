
import React from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BasicInfoFields } from "./components/BasicInfoFields";
import { GoalField } from "./components/GoalField";
import { ActivityLevelField } from "./components/ActivityLevelField";
import { ExerciseTypesField } from "./components/ExerciseTypesField";
import { TrainingLocationField } from "./components/TrainingLocationField";
import { WorkoutPreferences } from "./types";
import { Dumbbell, ArrowRight } from "lucide-react";
import { PaymentDialog } from "./components/PaymentDialog";
import { useWorkoutForm } from "./hooks/useWorkoutForm";
import { toast } from "sonner";

interface PreferencesFormProps {
  onSubmit: (data: WorkoutPreferences) => void;
}

export const PreferencesForm = ({ onSubmit }: PreferencesFormProps) => {
  const {
    form,
    isProcessingPayment,
    isPaymentDialogOpen,
    setIsPaymentDialogOpen,
    currentPrice,
    handleSubmit,
    handlePaymentProcess,
    isPaymentEnabled
  } = useWorkoutForm(onSubmit);

  const isValid = form.formState.isValid;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
            <CardHeader className="border-b bg-primary/5 p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Dumbbell className="w-5 h-5 text-primary" />
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
                disabled={!isValid || isProcessingPayment}
                size="lg"
              >
                {isProcessingPayment ? "Processando..." : "Gerar Plano de Treino"}
                {!isProcessingPayment && <ArrowRight className="w-5 h-5 ml-2" />}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>

      {isPaymentEnabled && (
        <PaymentDialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
          onPayment={handlePaymentProcess}
          isProcessing={isProcessingPayment}
          currentPrice={currentPrice}
        />
      )}
    </>
  );
};
